import { 
  getDynamicSupabaseClient,
  getDashboardDataFromSupabase
} from './multiTenantSupabase';
import { getGoogleCalendarCredentials } from './credentialsManager';

// Interface para representar um cliente
interface ClientRecord {
  id: string;
  telefone: string;
  nome_completo: string;
  email_principal: string;
  tenant_id: string;
  primeiro_contato: string;
  ultimo_contato: string | null;
  [key: string]: any; // Para outros campos do dashboard
}

// Interface para o estado do cache
interface ClientCacheState {
  clients: ClientRecord[];
  lastUpdate: Date;
  lastCheck: Date;
}

// Cache em memória para cada tenant/cliente
const clientCache = new Map<string, ClientCacheState>();

// Configurações do sistema
const CACHE_TIMEOUT_MINUTES = 5; // Cache expira em 5 minutos
const MIN_POLLING_INTERVAL_SECONDS = 30; // Mínimo 30 segundos entre verificações

/**
 * Obtém o cache atual para um cliente específico
 */
export function getClientCache(clientId: string, tenantId: string): ClientCacheState | null {
  const cacheKey = `${clientId}-${tenantId}`;
  return clientCache.get(cacheKey) || null;
}

/**
 * Atualiza o cache com novos dados de clientes
 */
export function updateClientCache(clientId: string, tenantId: string, clients: ClientRecord[]): void {
  const cacheKey = `${clientId}-${tenantId}`;
  const now = new Date();
  
  clientCache.set(cacheKey, {
    clients: clients.map(client => ({
      ...client,
      id: client.telefone || client.idx?.toString() || 'unknown', // Usar telefone como ID único
    })),
    lastUpdate: now,
    lastCheck: now
  });
  
  console.log(`✅ Cache atualizado para ${cacheKey}: ${clients.length} clientes`);
}

/**
 * Verifica se o cache está válido (não expirado)
 */
export function isCacheValid(clientId: string, tenantId: string): boolean {
  const cache = getClientCache(clientId, tenantId);
  if (!cache) return false;
  
  const now = new Date();
  const timeDiff = now.getTime() - cache.lastUpdate.getTime();
  const minutesDiff = timeDiff / (1000 * 60);
  
  return minutesDiff < CACHE_TIMEOUT_MINUTES;
}

/**
 * Verifica se é muito cedo para fazer uma nova verificação (rate limiting)
 */
export function canPerformCheck(clientId: string, tenantId: string): boolean {
  const cache = getClientCache(clientId, tenantId);
  if (!cache) return true;
  
  const now = new Date();
  const timeDiff = now.getTime() - cache.lastCheck.getTime();
  const secondsDiff = timeDiff / 1000;
  
  return secondsDiff >= MIN_POLLING_INTERVAL_SECONDS;
}

/**
 * Atualiza apenas o timestamp da última verificação
 */
export function updateLastCheck(clientId: string, tenantId: string): void {
  const cache = getClientCache(clientId, tenantId);
  if (cache) {
    cache.lastCheck = new Date();
  }
}

/**
 * Detecta novos clientes comparando com o cache
 */
export async function detectNewClients(clientId: string, tenantId: string): Promise<{
  newClients: ClientRecord[];
  totalClients: number;
  source: string;
}> {
  console.log(`🔍 Iniciando detecção de novos clientes para ${clientId}/${tenantId}`);
  
  // Verificar se é muito cedo para uma nova verificação
  if (!canPerformCheck(clientId, tenantId)) {
    const cache = getClientCache(clientId, tenantId);
    const lastCheck = cache?.lastCheck || new Date();
    const waitTime = MIN_POLLING_INTERVAL_SECONDS - Math.floor((new Date().getTime() - lastCheck.getTime()) / 1000);
    
    console.log(`⏰ Rate limit ativo. Aguarde ${waitTime} segundos para próxima verificação`);
    return {
      newClients: [],
      totalClients: cache?.clients.length || 0,
      source: 'rate_limited'
    };
  }
  
  // Buscar dados atuais do Supabase
  const currentClients = await getDashboardDataFromSupabase(clientId, tenantId);
  
  if (!currentClients) {
    console.log(`❌ Não foi possível buscar dados do Supabase para cliente ${clientId}`);
    updateLastCheck(clientId, tenantId);
    return {
      newClients: [],
      totalClients: 0,
      source: 'supabase_error'
    };
  }
  
  // Atualizar timestamp da verificação
  updateLastCheck(clientId, tenantId);
  
  // Verificar se existe cache anterior
  const previousCache = getClientCache(clientId, tenantId);
  
  if (!previousCache || !isCacheValid(clientId, tenantId)) {
    // Primeira verificação ou cache expirado - inicializar cache
    console.log(`🆕 Inicializando cache para ${clientId}/${tenantId} com ${currentClients.length} clientes`);
    updateClientCache(clientId, tenantId, currentClients);
    return {
      newClients: [],
      totalClients: currentClients.length,
      source: 'cache_initialized'
    };
  }
  
  // Comparar com cache anterior para detectar novos clientes
  const previousClientIds = new Set(previousCache.clients.map(c => c.id));
  const newClients = currentClients.filter(client => {
    const clientId = client.telefone || client.idx?.toString() || 'unknown';
    return !previousClientIds.has(clientId);
  });
  
  // Atualizar cache com dados atuais
  updateClientCache(clientId, tenantId, currentClients);
  
  if (newClients.length > 0) {
    console.log(`🎉 ${newClients.length} novos clientes detectados:`, newClients.map(c => ({
      telefone: c.telefone,
      nome: c.nome_completo,
      email: c.email_principal
    })));
  } else {
    console.log(`✅ Nenhum novo cliente detectado. Total: ${currentClients.length} clientes`);
  }
  
  return {
    newClients,
    totalClients: currentClients.length,
    source: 'comparison_complete'
  };
}

/**
 * Processa automaticamente novos clientes detectados
 */
export async function processNewClients(
  clientId: string, 
  newClients: ClientRecord[]
): Promise<Array<{
  client: ClientRecord;
  calendarEvent?: any;
  error?: string;
  success: boolean;
}>> {
  
  if (newClients.length === 0) {
    return [];
  }
  
  console.log(`🚀 Processando ${newClients.length} novos clientes automaticamente...`);
  
  const results = [];
  
  for (const client of newClients) {
    try {
      // Verificar se temos credenciais do Google Calendar
      const googleCredentials = getGoogleCalendarCredentials(clientId);
      
      if (!googleCredentials || !googleCredentials.clientId || !googleCredentials.clientSecret || !googleCredentials.refreshToken) {
        console.log(`⚠️ Credenciais do Google Calendar não configuradas para cliente ${client.nome_completo} - pulando criação de reunião`);
        results.push({
          client,
          success: false, // CORREÇÃO: deve ser false quando não pode processar
          error: 'Google Calendar não configurado'
        });
        continue;
      }
      
      // Criar reunião automaticamente
      const meetingData = {
        nome: client.nome_completo,
        email: client.email_principal,
        telefone: client.telefone.replace('@s.whatsapp.net', ''),
        tipoReuniao: 'online', // Default para online
        data: getNextBusinessDay(), // Próximo dia útil
        hora: '14:00', // Horário padrão
        duracao: 60,
        titulo: `Reunião inicial - ${client.nome_completo}`,
        descricao: `Reunião inicial automática para novo cliente. WhatsApp: ${client.telefone}`
      };
      
      const calendarResult = await createAutomaticCalendarEvent(clientId, meetingData);
      
      if (calendarResult.success) {
        results.push({
          client,
          calendarEvent: calendarResult.event,
          success: true
        });
        
        console.log(`✅ Reunião criada automaticamente para ${client.nome_completo}: ${calendarResult.event?.summary}`);
      } else {
        results.push({
          client,
          success: false,
          error: calendarResult.error || 'Falha na criação do evento'
        });
        
        console.error(`❌ Falha ao criar reunião para ${client.nome_completo}: ${calendarResult.error}`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar cliente ${client.nome_completo}:`, error);
      results.push({
        client,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Verifica se evento similar já existe no Google Calendar (para deduplicação)
 */
async function checkExistingCalendarEvent(clientId: string, meetingData: any): Promise<boolean> {
  try {
    const googleCredentials = getGoogleCalendarCredentials(clientId);
    
    if (!googleCredentials || !googleCredentials.refreshToken) {
      return false; // Não pode verificar se não há credenciais
    }
    
    const { clientId: googleClientId, clientSecret, refreshToken } = googleCredentials;
    
    // Lazy load googleapis
    const { google } = await import('googleapis');
    
    // Configurar autenticação OAuth2
    const oauth2Client = new google.auth.OAuth2(
      googleClientId,
      clientSecret,
      'http://localhost:3000/oauth2callback'
    );
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    // Verificar token
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      return false;
    }
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Buscar eventos no dia da reunião proposta
    const startOfDay = new Date(meetingData.data + 'T00:00:00-03:00');
    const endOfDay = new Date(meetingData.data + 'T23:59:59-03:00');
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      q: meetingData.nome, // Buscar pelo nome do cliente
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    // Verificar se existe evento similar
    if (response.data.items && response.data.items.length > 0) {
      const similarEvents = response.data.items.filter(event => {
        return event.summary && 
               (event.summary.toLowerCase().includes(meetingData.nome.toLowerCase()) ||
                event.description && event.description.includes(meetingData.telefone));
      });
      
      if (similarEvents.length > 0) {
        console.log(`🔍 Evento similar encontrado para ${meetingData.nome}:`, similarEvents[0].summary);
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.warn(`⚠️ Erro ao verificar eventos existentes para ${meetingData.nome}:`, error.message);
    return false; // Em caso de erro, assume que não existe
  }
}

/**
 * Cria evento no Google Calendar automaticamente com verificação de duplicação
 */
async function createAutomaticCalendarEvent(clientId: string, meetingData: any): Promise<{success: boolean, event?: any, error?: string}> {
  try {
    const googleCredentials = getGoogleCalendarCredentials(clientId);
    
    if (!googleCredentials) {
      return {
        success: false,
        error: 'Credenciais do Google Calendar não configuradas'
      };
    }
    
    if (!googleCredentials.refreshToken) {
      return {
        success: false,
        error: 'Token de refresh do Google Calendar não configurado'
      };
    }
    
    const { clientId: googleClientId, clientSecret, refreshToken } = googleCredentials;
    const calendarId = 'primary';
    
    // Verificar se evento similar já existe
    const eventExists = await checkExistingCalendarEvent(clientId, meetingData);
    if (eventExists) {
      return {
        success: false,
        error: 'Evento similar já existe no calendário'
      };
    }
    
    // Lazy load googleapis
    const { google } = await import('googleapis');
    
    // Configurar autenticação OAuth2
    const oauth2Client = new google.auth.OAuth2(
      googleClientId,
      clientSecret,
      'http://localhost:3000/oauth2callback'
    );
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    // Verificar token
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: 'Falha na autenticação com Google Calendar - token inválido'
      };
    }
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Criar data/hora do evento
    const eventDate = new Date(`${meetingData.data}T${meetingData.hora}:00-03:00`);
    const endDate = new Date(eventDate.getTime() + (meetingData.duracao * 60 * 1000));
    
    // Configurar evento com chave de idempotência
    const idempotencyKey = `auto-${meetingData.telefone}-${meetingData.data}-${Date.now()}`;
    const eventResource = {
      summary: meetingData.titulo,
      description: `${meetingData.descricao}\n\nCriado automaticamente pelo sistema\nTelefone: ${meetingData.telefone}\nIdempotência: ${idempotencyKey}`,
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      attendees: [
        { email: meetingData.email }
      ],
      conferenceData: meetingData.tipoReuniao === 'online' ? {
        createRequest: {
          requestId: idempotencyKey,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      } : undefined,
      reminders: {
        useDefault: true
      }
    };
    
    // Criar evento
    const response = await calendar.events.insert({
      calendarId,
      resource: eventResource,
      conferenceDataVersion: meetingData.tipoReuniao === 'online' ? 1 : 0
    });
    
    console.log(`✅ Evento do Google Calendar criado com sucesso para ${meetingData.nome}:`, response.data.summary);
    
    return {
      success: true,
      event: response.data
    };
    
  } catch (error) {
    console.error(`❌ Erro ao criar evento do Google Calendar para ${meetingData.nome}:`, error);
    
    return {
      success: false,
      error: `Falha na criação do evento: ${error.message}`
    };
  }
}

/**
 * Retorna a próxima data de dia útil (segunda a sexta)
 */
function getNextBusinessDay(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Se for sábado (6) ou domingo (0), pular para segunda-feira
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  
  return tomorrow.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

/**
 * Limpa cache expirado (função de limpeza)
 */
export function cleanExpiredCache(): void {
  const now = new Date();
  const expiredKeys = [];
  
  for (const [key, cache] of clientCache.entries()) {
    const timeDiff = now.getTime() - cache.lastUpdate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (minutesDiff > CACHE_TIMEOUT_MINUTES * 2) { // Remover cache muito antigo
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => {
    clientCache.delete(key);
    console.log(`🧹 Cache expirado removido: ${key}`);
  });
}

/**
 * Obtém estatísticas do cache para debugging
 */
export function getCacheStats(): any {
  const stats = {
    totalCaches: clientCache.size,
    caches: []
  };
  
  for (const [key, cache] of clientCache.entries()) {
    stats.caches.push({
      key,
      clientCount: cache.clients.length,
      lastUpdate: cache.lastUpdate,
      lastCheck: cache.lastCheck,
      isValid: isCacheValid(...key.split('-'))
    });
  }
  
  return stats;
}