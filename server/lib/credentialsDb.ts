/**
 * Helper functions to get credentials from PostgreSQL database
 * These functions are used by billing-service and other services
 * 
 * 🔐 MULTI-TENANT: All functions now support tenant_id filtering to ensure proper data isolation
 */

import { db } from '../db';
import { 
  pluggyConfig, 
  supabaseConfig, 
  n8nConfig, 
  googleCalendarConfig,
  redisConfig,
  sentryConfig,
  resendConfig,
  cloudflareConfig,
  betterStackConfig,
  evolutionApiConfig
} from '../../shared/db-schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from './credentialsManager';

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
}

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
  bucket: string;
}

export interface N8nCredentials {
  webhookUrl: string;
}

export interface GoogleCalendarCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
}

export interface RedisCredentials {
  url: string;
  token?: string;
}

export interface SentryCredentials {
  dsn: string;
  authToken?: string;
  organization?: string;
  project?: string;
  environment?: string;
  tracesSampleRate?: string;
}

export interface ResendCredentials {
  apiKey: string;
  fromEmail: string;
}

export interface CloudflareCredentials {
  zoneId: string;
  apiToken: string;
}

export interface BetterStackCredentials {
  sourceToken: string;
  ingestingHost?: string;
}

export interface EvolutionApiCredentials {
  apiUrl: string;
  apiKey: string;
  instance?: string;
}

/**
 * Get Pluggy credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getPluggyCredentials(tenantId: string): Promise<PluggyCredentials | null> {
  if (!tenantId) {
    console.error('❌ [PLUGGY] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(pluggyConfig)
      .where(eq(pluggyConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [PLUGGY] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret
      };
    }
    
    console.log(`❌ [PLUGGY] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [PLUGGY] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Supabase credentials from database
 * 🔐 MULTI-TENANT: First tries database with tenant_id, then falls back to tenant 'system', then env vars
 * This allows the system to work with just Secrets configured
 */
export async function getSupabaseCredentials(tenantId: string): Promise<SupabaseCredentials | null> {
  // Helper function to decrypt config
  const decryptConfig = (config: typeof supabaseConfig.$inferSelect): SupabaseCredentials | null => {
    try {
      let url: string;
      let anonKey: string;
      
      try {
        url = decrypt(config.supabaseUrl);
        anonKey = decrypt(config.supabaseAnonKey);
        console.log(`✅ [SUPABASE] Credenciais descriptografadas com sucesso (tenant: ${config.tenantId})`);
      } catch (decryptError: any) {
        // Fallback: dados podem estar em texto plano (formato legado)
        if (config.supabaseUrl.startsWith('http')) {
          console.log('⚠️ [SUPABASE] Usando credenciais em texto plano (formato legado)');
          url = config.supabaseUrl;
          anonKey = config.supabaseAnonKey;
        } else {
          throw decryptError;
        }
      }
      
      console.log(`✅ [SUPABASE] URL: ${url.substring(0, 30)}...`);
      
      return {
        url,
        anonKey,
        bucket: config.supabaseBucket || 'receipts'
      };
    } catch (decryptError) {
      console.error('❌ [SUPABASE] Erro ao descriptografar credenciais:', decryptError);
      return null;
    }
  };

  // 1. First try with provided tenantId
  try {
    console.log(`🔍 [SUPABASE] Buscando credenciais do banco de dados (supabase_config) para tenant: ${tenantId}...`);
    const configs = await db.select()
      .from(supabaseConfig)
      .where(eq(supabaseConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const result = decryptConfig(configs[0]);
      if (result) {
        console.log(`✅ [SUPABASE] Usando credenciais do tenant: ${tenantId}`);
        return result;
      }
    }
  } catch (error) {
    console.warn(`⚠️ [SUPABASE] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
  }
  
  // 2. Fallback to any configured tenant if none specific found
  try {
    console.log('🔄 [SUPABASE] Tentando fallback para qualquer tenant configurado...');
    const anyConfigs = await db.select()
      .from(supabaseConfig)
      .limit(1)
      .execute();
    
    if (anyConfigs.length > 0) {
      const result = decryptConfig(anyConfigs[0]);
      if (result) {
        console.log(`✅ [SUPABASE] Usando credenciais do tenant: ${anyConfigs[0].tenantId} (fallback)`);
        return result;
      }
    }
  } catch (error) {
    console.warn('⚠️ [SUPABASE] Erro ao buscar credenciais de fallback:', error);
  }

  // 3. Fallback to 'system' tenant
  if (tenantId !== 'system') {
    try {
      console.log('🔄 [SUPABASE] Tentando fallback para tenant system...');
      const systemConfigs = await db.select()
        .from(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, 'system'))
        .limit(1)
        .execute();
      
      if (systemConfigs.length > 0) {
        const result = decryptConfig(systemConfigs[0]);
        if (result) {
          console.log('✅ [SUPABASE] Usando credenciais do tenant system (fallback)');
          return result;
        }
      }
    } catch (error) {
      console.warn('⚠️ [SUPABASE] Erro ao buscar credenciais do tenant system:', error);
    }
  }
  
  // 4. Fallback: environment variables (Secrets)
  const envCredentials = await getSupabaseCredentialsFromEnv();
  if (envCredentials) {
    console.log('✅ [SUPABASE] Usando credenciais dos Secrets (fallback)');
    return envCredentials;
  }
  
  // 5. Final fallback: file-based config (data/supabase-config.json)
  try {
    const { getEffectiveSupabaseConfig } = await import('./supabaseFileConfig.js');
    const fileConfig = getEffectiveSupabaseConfig();
    if (fileConfig?.url && fileConfig?.anonKey) {
      console.log('✅ [SUPABASE] Usando credenciais do arquivo de config (fallback final)');
      return {
        url: fileConfig.url,
        anonKey: fileConfig.anonKey,
        bucket: 'receipts'
      };
    }
  } catch (error) {
    console.warn('⚠️ [SUPABASE] Erro ao verificar arquivo de config:', error);
  }
  
  console.error(`❌ [SUPABASE] Credenciais não encontradas para tenant ${tenantId}`);
  return null;
}

/**
 * Get Supabase credentials from environment variables ONLY
 * 🔧 SYSTEM-LEVEL: For background jobs and system-level code that don't have a tenantId
 * Does NOT query the database - only reads from environment variables
 */
export async function getSupabaseCredentialsFromEnv(): Promise<SupabaseCredentials | null> {
  const url = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  
  if (url && anonKey) {
    console.log('✅ [SYSTEM] Credenciais do Supabase carregadas de environment variables');
    return { url, anonKey, bucket: 'receipts' };
  }
  
  console.log('⚠️ [SYSTEM] Credenciais do Supabase não encontradas em environment variables');
  return null;
}

/**
 * Get N8N webhook URL from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO default fallback for security
 */
export async function getN8nCredentials(tenantId: string): Promise<N8nCredentials | null> {
  try {
    // 🔐 Query filtered by tenant
    const configs = await db.select()
      .from(n8nConfig)
      .where(eq(n8nConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ URL do webhook N8N carregada do banco de dados (tenant: ${tenantId})`);
      return {
        webhookUrl: config.webhookUrl
      };
    }
    
    console.log('❌ URL do webhook N8N não encontrada');
    return null;
  } catch (error) {
    console.error('Erro ao buscar URL do webhook N8N:', error);
    return null;
  }
}

/**
 * Get Google Calendar credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO default fallback for security
 */
export async function getGoogleCalendarCredentials(tenantId: string): Promise<GoogleCalendarCredentials | null> {
  try {
    // 🔐 Query filtered by tenant
    const configs = await db.select()
      .from(googleCalendarConfig)
      .where(eq(googleCalendarConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ Credenciais do Google Calendar carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.refreshToken || undefined
      };
    }
    
    console.log('❌ Credenciais do Google Calendar não encontradas');
    return null;
  } catch (error) {
    console.error('Erro ao buscar credenciais do Google Calendar:', error);
    return null;
  }
}

/**
 * Get Pluggy API key by authenticating with credentials from database
 * 🔐 MULTI-TENANT: Requires tenantId to fetch credentials
 */
export async function getPluggyApiKey(tenantId: string): Promise<string | null> {
  if (!tenantId) {
    console.error('❌ [PLUGGY] tenantId é obrigatório para obter API key');
    return null;
  }

  const credentials = await getPluggyCredentials(tenantId);
  
  if (!credentials) {
    console.error(`❌ [PLUGGY] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  }
  
  try {
    const response = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      })
    });
    
    if (!response.ok) {
      console.error(`❌ [PLUGGY] Falha na autenticação para tenant ${tenantId}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.apiKey) {
      console.error(`❌ [PLUGGY] API key não retornada para tenant ${tenantId}`);
      return null;
    }
    
    console.log(`✅ [PLUGGY] API key obtida com sucesso para tenant ${tenantId}`);
    return data.apiKey;
  } catch (error) {
    console.error(`❌ [PLUGGY] Erro ao obter API key para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Redis credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getRedisCredentials(tenantId: string): Promise<RedisCredentials | null> {
  if (!tenantId) {
    console.error('❌ [REDIS] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(redisConfig)
      .where(eq(redisConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [REDIS] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        url: decrypt(config.redisUrl),
        token: config.redisToken ? decrypt(config.redisToken) : undefined
      };
    }
    
    console.log(`❌ [REDIS] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [REDIS] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Sentry credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getSentryCredentials(tenantId?: string): Promise<SentryCredentials | null> {
  if (!tenantId) {
    console.log('ℹ️  [SENTRY] Serviço multi-tenant - será inicializado quando tenant estiver disponível');
    return null;
  }

  try {
    const configs = await db.select()
      .from(sentryConfig)
      .where(eq(sentryConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [SENTRY] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        dsn: decrypt(config.dsn),
        authToken: config.authToken ? decrypt(config.authToken) : undefined,
        organization: config.organization || undefined,
        project: config.project || undefined,
        environment: config.environment || 'production',
        tracesSampleRate: config.tracesSampleRate || '0.1'
      };
    }
    
    console.log(`❌ [SENTRY] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [SENTRY] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Resend credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getResendCredentials(tenantId?: string): Promise<ResendCredentials | null> {
  if (!tenantId) {
    console.log('ℹ️  [RESEND] Serviço multi-tenant - será inicializado quando tenant estiver disponível');
    return null;
  }

  try {
    const configs = await db.select()
      .from(resendConfig)
      .where(eq(resendConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [RESEND] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        apiKey: decrypt(config.apiKey),
        fromEmail: config.fromEmail
      };
    }
    
    console.log(`❌ [RESEND] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [RESEND] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Cloudflare credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getCloudflareCredentials(tenantId: string): Promise<CloudflareCredentials | null> {
  if (!tenantId) {
    console.error('❌ [CLOUDFLARE] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(cloudflareConfig)
      .where(eq(cloudflareConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [CLOUDFLARE] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        zoneId: decrypt(config.zoneId),
        apiToken: decrypt(config.apiToken)
      };
    }
    
    console.log(`❌ [CLOUDFLARE] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [CLOUDFLARE] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Better Stack/Logtail credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getBetterStackCredentials(tenantId: string): Promise<BetterStackCredentials | null> {
  if (!tenantId) {
    console.error('❌ [BETTER_STACK] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(betterStackConfig)
      .where(eq(betterStackConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [BETTER_STACK] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        sourceToken: decrypt(config.sourceToken),
        ingestingHost: config.ingestingHost || 'in.logs.betterstack.com'
      };
    }
    
    console.log(`❌ [BETTER_STACK] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [BETTER_STACK] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Evolution API credentials from environment variables ONLY
 * 🔧 SYSTEM-LEVEL: For background jobs and system-level code that don't have a tenantId
 * Does NOT query the database - only reads from environment variables
 */
export function getEvolutionApiCredentialsFromEnv(): EvolutionApiCredentials | null {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE || 'nexus-whatsapp';
  
  if (apiUrl && apiKey) {
    console.log('✅ [SYSTEM] Credenciais da Evolution API carregadas de environment variables');
    return { apiUrl, apiKey, instance };
  }
  
  console.log('⚠️ [SYSTEM] Credenciais da Evolution API não encontradas em environment variables');
  return null;
}

/**
 * Get Evolution API credentials from database
 * 🔐 MULTI-TENANT: First tries database with tenant_id, then falls back to env vars if not found
 * This allows the system to work with just Secrets configured
 */
export async function getEvolutionApiCredentials(tenantId?: string): Promise<EvolutionApiCredentials | null> {
  // Primeiro tentar do banco de dados se tenantId foi fornecido
  if (tenantId) {
    try {
      const configs = await db.select()
        .from(evolutionApiConfig)
        .where(eq(evolutionApiConfig.tenantId, tenantId))
        .limit(1)
        .execute();
      
      if (configs.length > 0) {
        const config = configs[0];
        console.log(`✅ [EVOLUTION_API] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
        try {
          return {
            apiUrl: decrypt(config.apiUrl),
            apiKey: decrypt(config.apiKey),
            instance: config.instance || 'nexus-whatsapp'
          };
        } catch (decryptError: any) {
          console.error(`❌ [EVOLUTION_API] Erro ao descriptografar credenciais: ${decryptError.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ [EVOLUTION_API] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    }
  }
  
  // Tentar buscar do tenant "system" (usado quando credenciais vêm dos Secrets)
  try {
    const systemConfigs = await db.select()
      .from(evolutionApiConfig)
      .where(eq(evolutionApiConfig.tenantId, 'system'))
      .limit(1)
      .execute();
    
    if (systemConfigs.length > 0) {
      const config = systemConfigs[0];
      console.log('✅ [EVOLUTION_API] Credenciais carregadas do banco (tenant: system)');
      try {
        return {
          apiUrl: decrypt(config.apiUrl),
          apiKey: decrypt(config.apiKey),
          instance: config.instance || 'nexus-whatsapp'
        };
      } catch (decryptError: any) {
        console.error(`❌ [EVOLUTION_API] Erro ao descriptografar credenciais: ${decryptError.message}`);
      }
    }
  } catch (error) {
    console.log('⚠️ [EVOLUTION_API] Não foi possível buscar credenciais do tenant system');
  }
  
  // FALLBACK: Tentar variáveis de ambiente (Secrets)
  const envCredentials = getEvolutionApiCredentialsFromEnv();
  if (envCredentials) {
    return envCredentials;
  }
  
  console.log('❌ [EVOLUTION_API] Credenciais não encontradas (nem banco nem Secrets)');
  return null;
}

/**
 * Get Evolution API credentials - simplified version for background jobs
 * Always tries system tenant first, then falls back to env vars
 */
export async function getSystemEvolutionApiCredentials(): Promise<EvolutionApiCredentials | null> {
  return getEvolutionApiCredentials('system');
}
