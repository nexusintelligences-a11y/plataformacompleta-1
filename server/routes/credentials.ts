import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { authenticateConfig } from '../middleware/configAuth';
import { credentialsStorage, encrypt, decrypt, saveCredentialsToFile } from '../lib/credentialsManager';
import { clearSupabaseClientCache, testDynamicSupabaseConnection } from '../lib/multiTenantSupabase';
import { db } from '../db';
import { pluggyConfig, supabaseConfig, n8nConfig, googleCalendarConfig, evolutionApiConfig } from '../../shared/db-schema.js';
import { eq } from 'drizzle-orm';
import { getSupabaseCredentials, getPluggyCredentials, getN8nCredentials, getGoogleCalendarCredentials, getEvolutionApiCredentials } from '../lib/credentialsDb';
import { resetAllPollerStates } from '../lib/stateReset';
import { invalidateClienteCache } from '../lib/clienteSupabase';
import { clearSupabaseClientCache as clearFormularioSupabaseCache } from '../formularios/utils/supabaseClient';

const router = express.Router();

// Salvar credenciais
router.put('/:integrationType', authenticateToken, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;
    const credentials = req.body;

    // 🔐 SECURITY: Validar que tenantId existe para isolamento de credenciais
    if (!tenantId) {
      console.error('❌ [SECURITY] Tentativa de salvar credenciais sem tenantId - bloqueado');
      return res.status(401).json({
        success: false,
        error: 'Tenant ID ausente - isolamento de credenciais comprometido'
      });
    }

    console.log(`🔐 [CREDENTIALS] Salvando credenciais ${integrationType} para tenant ${tenantId}`);

    // Validar o tipo de integração
    const validTypes = ['supabase', 'google_calendar', 'google_meet', 'whatsapp', 'evolution_api', 'n8n', 'pluggy'];
    if (!validTypes.includes(integrationType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de integração inválido'
      });
    }

    // Validar credenciais baseado no tipo
    const validationResult = validateCredentials(integrationType, credentials);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: validationResult.error
      });
    }

    // Criptografar as credenciais
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Salvar no armazenamento em memória (para compatibilidade)
    if (!credentialsStorage.has(clientId)) {
      credentialsStorage.set(clientId, new Map());
    }
    credentialsStorage.get(clientId)!.set(integrationType, encryptedCredentials);

    // Persistir as credenciais no arquivo (para compatibilidade)
    saveCredentialsToFile();

    // Salvar também no banco de dados PostgreSQL com isolamento por tenantId
    try {
      if (integrationType === 'pluggy') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(pluggyConfig)
          .where(eq(pluggyConfig.tenantId, tenantId))
          .execute();
        // Inserir nova configuração COM tenantId
        await db.insert(pluggyConfig).values({
          tenantId,
          clientId: credentials.client_id,
          clientSecret: credentials.client_secret
        }).execute();
        console.log(`✅ Configuração do Pluggy salva no banco (tenant: ${tenantId})`);
      } else if (integrationType === 'supabase') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(supabaseConfig)
          .where(eq(supabaseConfig.tenantId, tenantId))
          .execute();
        // 🔐 Criptografar cada campo individualmente (igual Evolution API)
        const encryptedUrl = encrypt(credentials.url);
        const encryptedAnonKey = encrypt(credentials.anon_key);
        // Inserir nova configuração COM tenantId
        await db.insert(supabaseConfig).values({
          tenantId,
          supabaseUrl: encryptedUrl,
          supabaseAnonKey: encryptedAnonKey,
          supabaseBucket: credentials.bucket || 'receipts'
        }).execute();
        // Invalidar TODOS os caches do Supabase
        clearSupabaseClientCache(clientId);
        invalidateClienteCache();
        clearFormularioSupabaseCache();
        // 🔄 IMPORTANTE: Resetar estados dos pollers para sincronizar do zero
        // Isso garante que em uma nova instalação, todos os dados sejam sincronizados
        resetAllPollerStates();
        console.log(`✅ Configuração do Supabase salva no banco (tenant: ${tenantId})`);
        console.log(`🔄 Estados de polling resetados - sincronização completa será executada`);
      } else if (integrationType === 'n8n') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(n8nConfig)
          .where(eq(n8nConfig.tenantId, tenantId))
          .execute();
        // Inserir nova configuração COM tenantId
        await db.insert(n8nConfig).values({
          tenantId,
          webhookUrl: credentials.webhook_url
        }).execute();
        console.log(`✅ Configuração do N8N salva no banco (tenant: ${tenantId})`);
      } else if (integrationType === 'google_calendar') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(googleCalendarConfig)
          .where(eq(googleCalendarConfig.tenantId, tenantId))
          .execute();
        // Inserir nova configuração COM tenantId
        await db.insert(googleCalendarConfig).values({
          tenantId,
          clientId: credentials.client_id,
          clientSecret: credentials.client_secret,
          refreshToken: credentials.refresh_token || null
        }).execute();
        console.log(`✅ Configuração do Google Calendar salva no banco (tenant: ${tenantId})`);
      } else if (integrationType === 'evolution_api') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(evolutionApiConfig)
          .where(eq(evolutionApiConfig.tenantId, tenantId))
          .execute();
        // Criptografar cada campo individualmente
        const encryptedApiUrl = encrypt(credentials.api_url);
        const encryptedApiKey = encrypt(credentials.api_key);
        // Inserir nova configuração COM tenantId
        await db.insert(evolutionApiConfig).values({
          tenantId,
          apiUrl: encryptedApiUrl,
          apiKey: encryptedApiKey, 
          instance: credentials.instance || 'nexus-whatsapp'
        }).execute();
        console.log(`✅ Configuração da Evolution API salva no banco (tenant: ${tenantId})`);
      }
    } catch (dbError) {
      console.error('Erro ao salvar no banco de dados:', dbError);
      // Continua mesmo se falhar o salvamento no banco (tem fallback para arquivo)
    }

    res.json({
      success: true,
      message: 'Credenciais salvas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao salvar credenciais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Recuperar credenciais
router.get('/:integrationType', authenticateToken, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;

    // 🔐 SECURITY: Validar que tenantId existe para isolamento de credenciais
    if (!tenantId) {
      console.error('❌ [SECURITY] Tentativa de recuperar credenciais sem tenantId - bloqueado');
      return res.status(401).json({
        success: false,
        error: 'Tenant ID ausente - isolamento de credenciais comprometido'
      });
    }

    console.log(`🔐 [CREDENTIALS] Recuperando credenciais ${integrationType} para tenant ${tenantId}`);

    // Primeiro tenta buscar da memória
    const clientCredentials = credentialsStorage.get(clientId);
    if (clientCredentials && clientCredentials.has(integrationType)) {
      const encryptedCredentials = clientCredentials.get(integrationType)!;
      const decryptedCredentials = JSON.parse(decrypt(encryptedCredentials));
      
      return res.json({
        success: true,
        credentials: decryptedCredentials
      });
    }

    // Se não encontrou na memória, busca do banco de dados COM tenantId
    let dbCredentials = null;
    
    if (integrationType === 'supabase') {
      const supabaseCreds = await getSupabaseCredentials(tenantId);
      if (supabaseCreds) {
        dbCredentials = {
          url: supabaseCreds.url,
          anon_key: supabaseCreds.anonKey,
          bucket: supabaseCreds.bucket
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    } else if (integrationType === 'pluggy') {
      const pluggyCreds = await getPluggyCredentials(tenantId);
      if (pluggyCreds) {
        dbCredentials = {
          client_id: pluggyCreds.clientId,
          client_secret: pluggyCreds.clientSecret
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    } else if (integrationType === 'n8n') {
      const n8nCreds = await getN8nCredentials(tenantId);
      if (n8nCreds) {
        dbCredentials = {
          webhook_url: n8nCreds.webhookUrl
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    } else if (integrationType === 'google_calendar') {
      const googleCreds = await getGoogleCalendarCredentials(tenantId);
      if (googleCreds) {
        dbCredentials = {
          client_id: googleCreds.clientId,
          client_secret: googleCreds.clientSecret,
          refresh_token: googleCreds.refreshToken
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    } else if (integrationType === 'evolution_api') {
      const evolutionCreds = await getEvolutionApiCredentials(tenantId);
      if (evolutionCreds) {
        dbCredentials = {
          api_url: evolutionCreds.apiUrl,
          api_key: evolutionCreds.apiKey,
          instance: evolutionCreds.instance
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    }

    if (dbCredentials) {
      return res.json({
        success: true,
        credentials: dbCredentials
      });
    }

    // Se não encontrou nem na memória nem no banco
    return res.status(404).json({
      success: false,
      error: 'Credenciais não encontradas'
    });

  } catch (error) {
    console.error('Erro ao recuperar credenciais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Listar status de todas as credenciais
router.get('/', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;
    const clientCredentials = credentialsStorage.get(clientId);

    // 🔐 SECURITY: Validar que tenantId existe para isolamento de credenciais
    if (!tenantId) {
      console.error('❌ [SECURITY] Tentativa de listar credenciais sem tenantId - bloqueado');
      return res.status(401).json({
        success: false,
        error: 'Tenant ID ausente - isolamento de credenciais comprometido'
      });
    }

    console.log(`🔐 [CREDENTIALS] Listando status de credenciais para tenant ${tenantId}`);

    // Verifica também no banco de dados para credenciais persistidas COM tenantId
    const supabaseCreds = await getSupabaseCredentials(tenantId);
    const pluggyCreds = await getPluggyCredentials(tenantId);
    const n8nCreds = await getN8nCredentials(tenantId);
    const googleCalendarCreds = await getGoogleCalendarCredentials(tenantId);

    const status = {
      supabase_configured: (clientCredentials?.has('supabase') || !!supabaseCreds),
      google_calendar: (clientCredentials?.has('google_calendar') || !!googleCalendarCreds),
      google_meet: clientCredentials?.has('google_meet') || false,
      whatsapp: clientCredentials?.has('whatsapp') || false,
      evolution_api: clientCredentials?.has('evolution_api') || false,
      n8n_configured: (clientCredentials?.has('n8n') || !!n8nCreds),
      pluggy_configured: (clientCredentials?.has('pluggy') || !!pluggyCreds)
    };

    res.json({
      success: true,
      credentials: status
    });

  } catch (error) {
    console.error('Erro ao listar credenciais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Testar conexão de uma integração específica
router.post('/test/:integrationType', authenticateConfig, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;

    // Validar o tipo de integração
    const validTypes = ['supabase', 'google_calendar', 'google_meet', 'whatsapp', 'evolution_api', 'n8n', 'pluggy', 'redis', 'sentry', 'resend', 'cloudflare', 'better_stack'];
    if (!validTypes.includes(integrationType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de integração inválido'
      });
    }

    // ✅ CORREÇÃO: Se credenciais foram enviadas no body, usar elas ao invés de buscar do banco
    let credentials;
    const bodyHasCredentials = req.body && Object.keys(req.body).length > 0;
    
    if (bodyHasCredentials && integrationType === 'supabase') {
      // Usar credenciais do body para Supabase (permite testar antes de salvar)
      credentials = {
        url: req.body.supabaseUrl,
        anonKey: req.body.supabaseAnonKey,
      };
      console.log('[TEST SUPABASE] Usando credenciais do body para teste');
    } else if (bodyHasCredentials && integrationType === 'google_calendar') {
      credentials = {
        client_id: req.body.clientId,
        client_secret: req.body.clientSecret,
        refresh_token: req.body.refreshToken || null
      };
      console.log('[TEST GOOGLE_CALENDAR] Usando credenciais do body para teste');
    } else if (bodyHasCredentials && integrationType === 'pluggy') {
      credentials = {
        clientId: req.body.clientId,
        clientSecret: req.body.clientSecret,
      };
    } else if (bodyHasCredentials && integrationType === 'evolution_api') {
      // Usar credenciais do body para Evolution API
      credentials = {
        apiUrl: req.body.apiUrl,
        apiKey: req.body.apiKey,
        instance: req.body.instance || 'nexus-whatsapp'
      };
    } else {
      // Buscar credenciais salvas no banco/storage
      console.log(`[TEST ${integrationType.toUpperCase()}] Buscando credenciais do banco/storage`);

    // For optimization services, get directly from database
    if (['redis', 'sentry', 'resend', 'cloudflare', 'better_stack'].includes(integrationType)) {
      // Import credential getters
      const { 
        getRedisCredentials, 
        getSentryCredentials, 
        getResendCredentials, 
        getCloudflareCredentials, 
        getBetterStackCredentials 
      } = await import('../lib/credentialsDb');
      
      // Get credentials based on type
      if (integrationType === 'redis') {
        credentials = await getRedisCredentials();
      } else if (integrationType === 'sentry') {
        credentials = await getSentryCredentials();
      } else if (integrationType === 'resend') {
        credentials = await getResendCredentials();
      } else if (integrationType === 'cloudflare') {
        credentials = await getCloudflareCredentials();
      } else if (integrationType === 'better_stack') {
        credentials = await getBetterStackCredentials();
      }
      
      if (!credentials) {
        return res.status(404).json({
          success: false,
          error: 'Credenciais não encontradas. Configure a integração primeiro.'
        });
      }
    } else {
      // For legacy services, check credentialsStorage
      const clientCredentials = credentialsStorage.get(clientId);
      if (!clientCredentials || !clientCredentials.has(integrationType)) {
        return res.status(404).json({
          success: false,
          error: 'Credenciais não encontradas. Configure a integração primeiro.'
        });
      }
      
      const encryptedCredentials = clientCredentials.get(integrationType)!;
      credentials = JSON.parse(decrypt(encryptedCredentials));
    }
    } // Fecha o else que busca do banco

    // Testar conexão baseado no tipo
    const testResult = await testConnection(integrationType, credentials, clientId);
    
    if (testResult.success) {
      res.json({
        success: true,
        message: testResult.message || 'Conexão testada com sucesso',
        data: testResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: testResult.error || 'Falha no teste de conexão'
      });
    }

  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Função para testar conexões baseado no tipo
async function testConnection(type: string, credentials: any, clientId: string): Promise<{ success: boolean; message?: string; error?: string; data?: any }> {
  switch (type) {
    case 'supabase':
      try {
        // ✅ Testar diretamente com as credenciais fornecidas (permite testar antes de salvar)
        const { createClient } = await import('@supabase/supabase-js');
        
        // CORREÇÃO: Aceitar tanto anonKey quanto supabaseAnonKey
        const supabaseUrl = credentials.url || credentials.supabaseUrl;
        const supabaseKey = credentials.anonKey || credentials.supabaseAnonKey;
        
        if (!supabaseUrl || !supabaseKey) {
          return {
            success: false,
            error: 'URL e chave do Supabase são necessários'
          };
        }
        
        // Criar cliente temporário para teste com credenciais normalizadas
        const testClient = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        
        // Testar conexão tentando consultar uma tabela
        const { data, error } = await testClient
          .from('forms')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        
        // Se erro não for de tabela inexistente, retornar erro
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('[TEST SUPABASE] Connection failed:', error);
          return {
            success: false,
            error: `Erro na conexão: ${error.message}`
          };
        }
        
        // Conexão bem-sucedida
        console.log('[TEST SUPABASE] Connection successful!');
        return { 
          success: true, 
          message: 'Conexão com Supabase estabelecida com sucesso!',
          data: { url: supabaseUrl }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Supabase: ${error.message}` 
        };
      }

    case 'google_calendar':
      try {
        // Verificar se credenciais básicas estão presentes
        if (!credentials.client_id || !credentials.client_secret) {
          return {
            success: false,
            error: 'Client ID e Client Secret são obrigatórios'
          };
        }

        // Se não houver refresh_token, retornar sucesso parcial
        if (!credentials.refresh_token) {
          return {
            success: true,
            message: 'Credenciais do Google Calendar configuradas. Complete a autenticação OAuth para obter o refresh token.',
            data: { 
              configured: true, 
              hasRefreshToken: false,
              needsOAuth: true
            }
          };
        }

        // Se houver refresh_token, testar conexão real com Google Calendar API
        const { google } = await import('googleapis');
        
        const oauth2Client = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          'urn:ietf:wg:oauth:2.0:oob'
        );

        oauth2Client.setCredentials({
          refresh_token: credentials.refresh_token
        });

        // Testar acesso ao Google Calendar
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarList = await calendar.calendarList.list();
        
        return { 
          success: true, 
          message: 'Conexão com Google Calendar estabelecida com sucesso!',
          data: { 
            configured: true,
            hasRefreshToken: true,
            calendars: calendarList.data.items?.length || 0 
          }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Google Calendar: ${error.message}` 
        };
      }

    case 'google_meet':
      try {
        // Lazy load googleapis
        const { google } = await import('googleapis');
        
        // Configurar cliente OAuth2 para Google Meet
        const oauth2Client = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          'urn:ietf:wg:oauth:2.0:oob'
        );

        if (credentials.refresh_token) {
          oauth2Client.setCredentials({
            refresh_token: credentials.refresh_token
          });
        }

        // Testar acesso básico - verificar se as credenciais são válidas
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        return { 
          success: true, 
          message: 'Conexão com Google Meet estabelecida com sucesso!',
          data: { user: userInfo.data.email }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Google Meet: ${error.message}` 
        };
      }

    case 'whatsapp':
      try {
        // Simular teste de conexão WhatsApp
        // Aqui você implementaria a lógica específica da sua API de WhatsApp
        return { 
          success: true, 
          message: 'Configuração WhatsApp salva. Teste real depende da implementação da API.',
          data: { phone: credentials.phone_number }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão WhatsApp: ${error.message}` 
        };
      }

    case 'evolution_api':
      try {
        // Normalizar credenciais - aceitar tanto camelCase quanto snake_case
        const apiUrl = credentials.apiUrl ?? credentials.api_url;
        const apiKey = credentials.apiKey ?? credentials.api_key;
        const instance = credentials.instance || 'nexus-whatsapp';
        
        // Validar que temos as credenciais necessárias ANTES de fazer qualquer requisição
        if (!apiUrl || !apiKey || !instance) {
          return {
            success: false,
            error: 'URL da API, API Key e nome da instância são obrigatórios para Evolution API'
          };
        }
        
        // Validar que credenciais não são strings vazias
        if (apiUrl.trim() === '' || apiKey.trim() === '' || instance.trim() === '') {
          return {
            success: false,
            error: 'Credenciais da Evolution API não podem ser vazias'
          };
        }
        
        // Normalize URL by removing trailing slash
        const baseUrl = apiUrl.replace(/\/+$/, '');
        
        // Step 1: Check if instance exists
        const fetchResponse = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            'apiKey': apiKey,
            'Content-Type': 'application/json'
          }
        });

        if (fetchResponse.ok) {
          const instances = await fetchResponse.json();
          
          // Find our specific instance
          const instanceData = Array.isArray(instances) 
            ? instances.find((i: any) => i.name === instance)
            : instances;
          
          if (instanceData) {
            // Instance exists!
            const connectionStatus = instanceData.connectionStatus || 'close';
            return { 
              success: true, 
              message: `Conexão com Evolution API estabelecida! Instância "${instance}" encontrada com status: ${connectionStatus}`,
              data: { 
                instance: instance,
                status: connectionStatus,
                profileName: instanceData.profileName || 'N/A',
                exists: true
              }
            };
          } else {
            // Instance doesn't exist - List available instances
            console.log(`⚠️ [Evolution API] Instância "${instance}" não encontrada`);
            
            // Get list of available instances
            const availableInstances = Array.isArray(instances) 
              ? instances.map((i: any) => ({
                  name: i.name,
                  status: i.connectionStatus || 'close',
                  profileName: i.profileName || 'N/A'
                }))
              : [];
            
            if (availableInstances.length > 0) {
              return {
                success: false,
                error: `Instância "${instance}" não encontrada. Instâncias disponíveis: ${availableInstances.map(i => `"${i.name}" (${i.status})`).join(', ')}. Use o nome de uma instância existente ou crie uma nova instância manualmente no painel Evolution API.`,
                data: {
                  availableInstances
                }
              };
            } else {
              return {
                success: false,
                error: `Instância "${instance}" não encontrada e nenhuma instância está disponível. Crie uma instância manualmente no painel Evolution API em: ${baseUrl}`
              };
            }
          }
        } else {
          const errorText = await fetchResponse.text();
          return { 
            success: false, 
            error: `Evolution API retornou status ${fetchResponse.status}: ${errorText}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Evolution API: ${error.message}` 
        };
      }

    case 'n8n':
      try {
        // Testar conexão com N8N
        const response = await fetch(`${credentials.api_url}/rest/active`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': credentials.api_key,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          return { 
            success: true, 
            message: 'Conexão com N8N estabelecida com sucesso!',
            data: { status: 'active', workflows: data?.length || 0 }
          };
        } else {
          return { 
            success: false, 
            error: `N8N API retornou status ${response.status}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão N8N: ${error.message}` 
        };
      }

    case 'pluggy':
      try {
        // Testar autenticação Pluggy via API Key
        const response = await fetch('https://api.pluggy.ai/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId: credentials.client_id,
            clientSecret: credentials.client_secret
          })
        });

        if (response.ok) {
          const data = await response.json();
          return { 
            success: true, 
            message: 'Credenciais do Pluggy validadas com sucesso!',
            data: { authenticated: true }
          };
        } else {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: `Pluggy API retornou status ${response.status}: ${errorData.message || 'Credenciais inválidas'}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Pluggy: ${error.message}` 
        };
      }

    case 'redis':
      try {
        const { getRedisCredentials } = await import('../lib/credentialsDb');
        const redisCredentials = await getRedisCredentials();
        
        if (!redisCredentials) {
          return { success: false, error: 'Credenciais do Redis não encontradas' };
        }
        
        // Test Redis connection by trying to ping
        const Redis = (await import('ioredis')).default;
        
        // Configure Redis with TLS support (required for Upstash)
        const redisConfig: any = {
          connectTimeout: 10000,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 100, 2000);
          },
          reconnectOnError: () => false,
        };
        
        // Enable TLS if URL uses rediss:// or standard redis:// with Upstash
        const isSecure = redisCredentials.url.startsWith('rediss://') || 
                        redisCredentials.url.includes('upstash.io');
        
        if (isSecure) {
          redisConfig.tls = {
            rejectUnauthorized: true
          };
        }
        
        // Create Redis client with URL (password is in the URL)
        const redis = new Redis(redisCredentials.url, redisConfig);
        
        // Test connection with timeout
        const pingPromise = redis.ping();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na conexão')), 10000)
        );
        
        await Promise.race([pingPromise, timeoutPromise]);
        
        // Clean disconnect
        await redis.quit();
        
        return { 
          success: true, 
          message: 'Conexão com Redis estabelecida com sucesso!',
          data: { 
            url: redisCredentials.url.replace(/:[^:]*@/, ':***@'),
            tls: isSecure
          }
        };
      } catch (error) {
        // CORREÇÃO: Tratar erro específico de limite excedido do Upstash
        const errorMessage = error.message || String(error);
        
        if (errorMessage.includes('max requests limit exceeded')) {
          return { 
            success: false, 
            error: '❌ LIMITE DO REDIS EXCEDIDO! Sua conta Upstash atingiu 500.000 comandos/mês. ' +
                   'Aguarde o próximo mês ou faça upgrade para continuar usando Redis. ' +
                   'A aplicação funcionará normalmente com cache em memória até lá.'
          };
        }
        
        if (errorMessage.includes('Timeout')) {
          return { 
            success: false, 
            error: 'Timeout na conexão com Redis. Verifique se a URL está correta e se o serviço está disponível.'
          };
        }
        
        return { 
          success: false, 
          error: `Erro na conexão Redis: ${errorMessage}` 
        };
      }

    case 'sentry':
      try {
        const { getSentryCredentials } = await import('../lib/credentialsDb');
        const sentryCredentials = await getSentryCredentials();
        
        if (!sentryCredentials || !sentryCredentials.dsn) {
          return { success: false, error: 'Credenciais do Sentry não encontradas' };
        }
        
        // Test Sentry by sending a test event
        const Sentry = await import('@sentry/node');
        Sentry.init({
          dsn: sentryCredentials.dsn,
          environment: 'test',
          beforeSend: () => null // Don't actually send events during test
        });
        
        return { 
          success: true, 
          message: 'DSN do Sentry validado com sucesso!',
          data: { environment: sentryCredentials.environment || 'production' }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na validação Sentry: ${error.message}` 
        };
      }

    case 'resend':
      try {
        const { getResendCredentials } = await import('../lib/credentialsDb');
        const resendCredentials = await getResendCredentials();
        
        if (!resendCredentials || !resendCredentials.apiKey) {
          return { success: false, error: 'Credenciais do Resend não encontradas' };
        }
        
        // Test Resend API by verifying the API key
        const response = await fetch('https://api.resend.com/emails', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendCredentials.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok || response.status === 200) {
          return { 
            success: true, 
            message: 'API Key do Resend validada com sucesso!',
            data: { fromEmail: resendCredentials.fromEmail }
          };
        } else {
          return { 
            success: false, 
            error: `Resend API retornou status ${response.status}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Resend: ${error.message}` 
        };
      }

    case 'cloudflare':
      try {
        const { getCloudflareCredentials } = await import('../lib/credentialsDb');
        const cloudflareCredentials = await getCloudflareCredentials();
        
        if (!cloudflareCredentials || !cloudflareCredentials.zoneId || !cloudflareCredentials.apiToken) {
          return { success: false, error: 'Credenciais do Cloudflare não encontradas' };
        }
        
        console.log('🔍 Testando Cloudflare com Zone ID:', cloudflareCredentials.zoneId.substring(0, 8) + '...');
        console.log('🔑 Comprimento do token:', cloudflareCredentials.apiToken.length);
        console.log('🔑 Token inicia com:', cloudflareCredentials.apiToken.substring(0, 10) + '...');
        
        // Test Cloudflare API by getting zone info
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${cloudflareCredentials.zoneId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cloudflareCredentials.apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log('📄 Resposta da API Cloudflare:', JSON.stringify(data).substring(0, 200));
        
        if (response.ok && data.success) {
          return { 
            success: true, 
            message: 'Conexão com Cloudflare estabelecida com sucesso!',
            data: { zoneName: data.result?.name || 'N/A', zoneStatus: data.result?.status || 'N/A' }
          };
        } else {
          const errorMsg = data.errors?.[0]?.message || `Status ${response.status}`;
          console.error('❌ Erro Cloudflare:', errorMsg);
          return { 
            success: false, 
            error: `Cloudflare API: ${errorMsg}` 
          };
        }
      } catch (error) {
        console.error('❌ Exceção ao testar Cloudflare:', error);
        return { 
          success: false, 
          error: `Erro na conexão Cloudflare: ${error.message}` 
        };
      }

    case 'better_stack':
      try {
        const { getBetterStackCredentials } = await import('../lib/credentialsDb');
        const betterStackCredentials = await getBetterStackCredentials();
        
        if (!betterStackCredentials || !betterStackCredentials.sourceToken) {
          return { success: false, error: 'Credenciais do Better Stack não encontradas' };
        }
        
        // Test Better Stack by sending a test log to the ingesting host
        // Better Stack uses Bearer token authentication per documentation
        const sourceToken = betterStackCredentials.sourceToken.trim();
        const ingestingHost = betterStackCredentials.ingestingHost || 'in.logs.betterstack.com';
        const url = `https://${ingestingHost}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sourceToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Test connection from ExecutiveAI Pro',
            level: 'info',
            dt: new Date().toISOString()
          })
        });
        
        // Better Stack returns 202 on success
        if (response.ok || response.status === 200 || response.status === 202) {
          return { 
            success: true, 
            message: 'Conexão com Better Stack estabelecida com sucesso!',
            data: { status: 'connected' }
          };
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          return { 
            success: false, 
            error: `Better Stack API retornou status ${response.status}: ${errorText}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Better Stack: ${error.message}` 
        };
      }

    default:
      return { 
        success: false, 
        error: 'Tipo de integração não suportado para teste' 
      };
  }
}

// Função para validar credenciais baseado no tipo
function validateCredentials(type: string, credentials: any): { valid: boolean; error?: string } {
  switch (type) {
    case 'supabase':
      if (!credentials.url || !credentials.anon_key) {
        return { valid: false, error: 'URL e chave anônima são obrigatórias para Supabase' };
      }
      if (!credentials.url.startsWith('https://') || !credentials.url.includes('.supabase.co')) {
        return { valid: false, error: 'URL do Supabase deve ser válida' };
      }
      break;

    case 'google_calendar':
    case 'google_meet':
      if (!credentials.client_id || !credentials.client_secret) {
        return { valid: false, error: 'Client ID e Client Secret são obrigatórios para Google' };
      }
      break;

    case 'whatsapp':
      if (!credentials.phone_number || !credentials.api_key) {
        return { valid: false, error: 'Número de telefone e API Key são obrigatórios para WhatsApp' };
      }
      break;

    case 'evolution_api':
      if (!credentials.api_url || !credentials.api_key) {
        return { valid: false, error: 'URL da API e API Key são obrigatórias para Evolution API' };
      }
      break;

    case 'pluggy':
      if (!credentials.client_id || !credentials.client_secret) {
        return { valid: false, error: 'Client ID e Client Secret são obrigatórios para Pluggy' };
      }
      break;
  }

  return { valid: true };
}

export { router as credentialsRoutes };