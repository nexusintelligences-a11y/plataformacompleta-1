import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseCredentials } from './credentialsManager.js';
import { getSupabaseCredentialsFromEnv } from './credentialsDb.js';
import { DashboardCompleteV5 } from '../../shared/db-schema.js';

/**
 * Cache de clientes Supabase por clientId
 * Formato da chave: "{clientId}-{supabaseUrl}"
 */
const supabaseClients = new Map<string, SupabaseClient>();

/**
 * Obtém cliente Supabase dinâmico para um cliente específico (multi-tenant)
 * 
 * 🔐 MULTI-TENANT STRICT MODE: NO fallback to env variables
 * 
 * Prioridade de credenciais:
 * 1. Credenciais específicas do tenant (credentialsDb - criptografadas)
 * 2. null - REJEITA se não encontrar credenciais
 * 
 * SEGURANÇA: Cada tenant DEVE ter suas próprias credenciais configuradas.
 * NÃO há fallback para credenciais globais para garantir isolamento completo.
 * 
 * @param tenantId - ID único do tenant (obrigatório)
 * @returns Cliente Supabase ou null se não configurado para o tenant
 */
export async function getClientSupabaseClient(tenantId: string): Promise<SupabaseClient | null> {
  if (!tenantId) {
    console.error('❌ [MULTI-TENANT] tenantId é obrigatório');
    return null;
  }

  // Importar a função do credentialsDb (não credentialsManager)
  const { getSupabaseCredentials } = await import('./credentialsDb.js');
  
  // Buscar credenciais específicas do tenant
  const tenantCredentials = await getSupabaseCredentials(tenantId);
  
  if (!tenantCredentials) {
    console.error(`❌ [MULTI-TENANT] Credenciais não encontradas para tenant ${tenantId}`);
    console.error(`❌ [MULTI-TENANT] Configure as credenciais do Supabase para este tenant`);
    return null;
  }

  const cacheKey = `${tenantId}-${tenantCredentials.url}`;
  
  if (supabaseClients.has(cacheKey)) {
    console.log(`✅ [MULTI-TENANT] Usando cliente em cache (tenant: ${tenantId})`);
    return supabaseClients.get(cacheKey)!;
  }

  try {
    console.log(`🔄 [MULTI-TENANT] Criando cliente Supabase para tenant ${tenantId}...`);
    const client = createClient(tenantCredentials.url, tenantCredentials.anonKey);
    supabaseClients.set(cacheKey, client);
    console.log(`✅ [MULTI-TENANT] Cliente criado para tenant ${tenantId}`);
    return client;
  } catch (error) {
    console.error(`❌ [MULTI-TENANT] Erro ao criar cliente para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Testa conexão com Supabase de um cliente específico
 * Verifica acesso a todas as tabelas usadas pelo sistema
 * 
 * @param clientId - ID único do cliente
 * @returns true se conectado com sucesso, false caso contrário
 */
export async function testClientSupabaseConnection(clientId: string): Promise<boolean> {
  const client = await getClientSupabaseClient(clientId);
  
  if (!client) {
    console.warn(`[MULTI-TENANT] Cliente Supabase não disponível para ${clientId}`);
    return false;
  }
  
  try {
    // Testar acesso às tabelas principais do sistema
    const tablesToTest = [
      'forms',               // Formulários
      'form_submissions',    // Submissões de formulários
      'workspace_pages',     // Páginas do workspace
      'workspace_boards',    // Boards do workspace
      'workspace_databases'  // Databases do workspace
    ];

    console.log(`🔍 [MULTI-TENANT] Testando acesso às tabelas para ${clientId}...`);
    
    for (const table of tablesToTest) {
      const { error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.warn(`⚠️ [MULTI-TENANT] Tabela '${table}' não acessível:`, error.message);
        // Continua testando outras tabelas
      } else {
        console.log(`✅ [MULTI-TENANT] Tabela '${table}' acessível`);
      }
    }
    
    console.log(`✅ [MULTI-TENANT] Teste de conexão concluído para ${clientId}`);
    return true;
  } catch (error) {
    console.error(`❌ [MULTI-TENANT] Erro na conexão para ${clientId}:`, error);
    return false;
  }
}

/**
 * Testa acesso detalhado a todas as tabelas do sistema
 * Retorna status de cada tabela individualmente
 * 
 * @param clientId - ID único do cliente
 * @returns Objeto com status de cada tabela
 */
export async function testAllTables(clientId: string): Promise<{
  connected: boolean;
  tables: Record<string, { accessible: boolean; error?: string }>;
}> {
  const client = await getClientSupabaseClient(clientId);
  
  if (!client) {
    return {
      connected: false,
      tables: {}
    };
  }
  
  const tables: Record<string, { accessible: boolean; error?: string }> = {};
  const tablesToTest = [
    'forms',
    'form_submissions',
    'workspace_pages',
    'workspace_boards',
    'workspace_databases',
    'dashboard_completo_v5_base'  // Mantém para compatibilidade
  ];

  for (const table of tablesToTest) {
    try {
      const { error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      tables[table] = {
        accessible: !error,
        error: error?.message
      };
    } catch (error: any) {
      tables[table] = {
        accessible: false,
        error: error.message
      };
    }
  }
  
  return {
    connected: true,
    tables
  };
}

/**
 * Busca dados do dashboard de um cliente específico
 * 
 * @param clientId - ID único do cliente
 * @param tenantId - ID do tenant (não utilizado atualmente, reservado para futuro)
 * @returns Array de dados do dashboard ou null se não disponível
 */
export async function getClientDashboardData(
  clientId: string,
  tenantId: string
): Promise<DashboardCompleteV5[] | null> {
  const client = await getClientSupabaseClient(clientId);
  
  if (!client) {
    console.warn(`[MULTI-TENANT] Cliente não disponível para ${clientId}, retornando null`);
    return null;
  }
  
  try {
    const { data, error } = await client
      .from('dashboard_completo_v5_base')
      .select('*')
      .order('ultimo_contato', { ascending: false });
      
    if (error) {
      console.error(`❌ [MULTI-TENANT] Erro ao buscar dados para ${clientId}:`, error);
      return null;
    }
    
    console.log(`✅ [MULTI-TENANT] ${data?.length || 0} registros encontrados para ${clientId}`);
    return data || [];
  } catch (error) {
    console.error(`❌ [MULTI-TENANT] Erro na busca de dados para ${clientId}:`, error);
    return null;
  }
}

/**
 * Limpa cache de cliente Supabase específico
 * 
 * Útil quando as credenciais são atualizadas e o cliente precisa ser recriado.
 * 
 * @param clientId - ID único do cliente
 */
export function clearClientSupabaseCache(clientId: string): void {
  const keysToDelete = Array.from(supabaseClients.keys()).filter(key => 
    key.startsWith(`${clientId}-`)
  );
  
  keysToDelete.forEach(key => {
    supabaseClients.delete(key);
    console.log(`🗑️ [MULTI-TENANT] Cache limpo para chave: ${key}`);
  });
  
  if (keysToDelete.length === 0) {
    console.log(`⚠️ [MULTI-TENANT] Nenhum cache encontrado para ${clientId}`);
  } else {
    console.log(`✅ [MULTI-TENANT] ${keysToDelete.length} cache(s) limpo(s) para ${clientId}`);
  }
}

/**
 * Cliente Supabase compartilhado para fallback em desenvolvimento
 * Usado apenas quando DEV_SUPABASE_FALLBACK=true E cliente não tem credenciais próprias
 * 
 * ⚠️ DEPRECATED: Use getDynamicSupabaseClient() ou getClientSupabaseClient() para multi-tenant seguro
 */
let sharedSupabaseClient: SupabaseClient | null = null;

/**
 * Obtém cliente Supabase com fallback guard para desenvolvimento
 * 
 * ⚠️ DEPRECATED: Esta função permite fallback inseguro para credenciais compartilhadas.
 * Use getDynamicSupabaseClient() que implementa HARD-FAIL para segurança multi-tenant.
 * 
 * Prioridade:
 * 1. Credenciais específicas do cliente
 * 2. Credenciais globais do banco (supabase_config)
 * 3. Credenciais compartilhadas do env (apenas em dev) - ⚠️ INSEGURO
 * 
 * SEGURANÇA:
 * - Fallback para env APENAS ativa com DEV_SUPABASE_FALLBACK=true
 * - NUNCA ativar em produção
 * - Logs explícitos quando fallback é usado
 * - ⚠️ RISCO: Pode vazar dados entre tenants se credenciais não estiverem configuradas
 * 
 * @deprecated Use getDynamicSupabaseClient() ou getClientSupabaseClient() para segurança multi-tenant
 * @param clientId - ID único do cliente
 * @param allowFallback - Se true, permite fallback para credenciais compartilhadas (default: true em dev)
 * @returns Cliente Supabase ou null se não configurado
 */
export async function getSupabaseClientOrFallback(
  clientId: string, 
  allowFallback: boolean = true
): Promise<SupabaseClient | null> {
  console.warn('⚠️ [DEPRECATED] getSupabaseClientOrFallback() está deprecated. Use getDynamicSupabaseClient() para segurança multi-tenant.');

  const clientSpecificClient = await getClientSupabaseClient(clientId);
  
  if (clientSpecificClient) {
    return clientSpecificClient;
  }

  // 🔐 SEGURANÇA MULTI-TENANT: Fallback DESABILITADO por padrão
  // Para habilitar fallback global (NUNCA em produção), defina:
  // DEV_SUPABASE_FALLBACK=true explicitamente
  const devFallbackEnabled = process.env.DEV_SUPABASE_FALLBACK === 'true';
  
  if (!allowFallback || !devFallbackEnabled) {
    console.warn(`[MULTI-TENANT] Cliente ${clientId} sem credenciais próprias`);
    console.warn(`[MULTI-TENANT] ❌ Fallback para credenciais globais DESABILITADO (segurança multi-tenant)`);
    console.warn(`[MULTI-TENANT] 💡 Configure credenciais específicas para este tenant em /configuracoes`);
    return null;
  }

  let sharedUrl = process.env.REACT_APP_SUPABASE_URL;
  const sharedKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (sharedUrl && (!sharedUrl.startsWith('http://') && !sharedUrl.startsWith('https://'))) {
    console.warn(`[DEV-FALLBACK] REACT_APP_SUPABASE_URL inválida (não é URL): ${sharedUrl?.substring(0, 50)}...`);
    sharedUrl = undefined;
  }

  if (!sharedUrl || !sharedKey) {
    console.warn(`[MULTI-TENANT] Fallback habilitado mas REACT_APP_SUPABASE_URL/KEY não configurados corretamente`);
    return null;
  }

  if (!sharedSupabaseClient) {
    try {
      console.log(`🔧 [DEV-FALLBACK] Criando cliente Supabase compartilhado para desenvolvimento...`);
      sharedSupabaseClient = createClient(sharedUrl, sharedKey);
      console.log(`✅ [DEV-FALLBACK] Cliente compartilhado criado com sucesso`);
    } catch (error) {
      console.error(`❌ [DEV-FALLBACK] Erro ao criar cliente compartilhado:`, error);
      return null;
    }
  }

  console.log(`⚠️ [DEV-FALLBACK] Usando cliente Supabase compartilhado para cliente ${clientId} (APENAS DESENVOLVIMENTO)`);
  return sharedSupabaseClient;
}

/**
 * Busca dados agregados de todas as 12 tabelas do Supabase
 * 
 * Tabelas consultadas:
 * - workspace_pages, workspace_databases, workspace_boards (Workspace)
 * - forms, form_submissions (Formulários)
 * - products, suppliers, resellers, categories, print_queue (Produtos)
 * - files (Faturamento)
 * - dashboard_completo_v5_base (Dashboard)
 * 
 * @param clientId - ID único do cliente
 * @param tenantId - ID do tenant
 * @returns Dados agregados com contadores e dados recentes, ou null se erro
 */
export async function fetchTenantSupabaseData(
  clientId: string,
  tenantId: string
): Promise<{
  workspace: {
    pagesCount: number;
    databasesCount: number;
    boardsCount: number;
    recentPages: any[];
  };
  forms: {
    formsCount: number;
    submissionsCount: number;
    recentSubmissions: any[];
  };
  products: {
    productsCount: number;
    suppliersCount: number;
    resellersCount: number;
    categoriesCount: number;
    printQueueCount: number;
  };
  billing: {
    filesCount: number;
  };
  dashboard: {
    clientsCount: number;
  };
  summary: {
    totalTables: number;
    tablesWithData: number;
    totalRecords: number;
  };
} | null> {
  const client = await getClientSupabaseClient(clientId);
  
  if (!client) {
    console.warn(`[AGGREGATION] Cliente Supabase não disponível para ${clientId}`);
    return null;
  }
  
  try {
    console.log(`🔄 [AGGREGATION] Buscando dados agregados para ${clientId}...`);
    
    // Workspace tables
    const [
      { data: pages, error: pagesError },
      { data: databases, error: databasesError },
      { data: boards, error: boardsError }
    ] = await Promise.all([
      client.from('workspace_pages').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(5),
      client.from('workspace_databases').select('*', { count: 'exact' }),
      client.from('workspace_boards').select('*', { count: 'exact' })
    ]);
    
    // Forms tables
    const [
      { data: forms, error: formsError },
      { data: submissions, error: submissionsError }
    ] = await Promise.all([
      client.from('forms').select('*', { count: 'exact' }),
      client.from('form_submissions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(10)
    ]);
    
    // Products tables
    const [
      { data: products, error: productsError },
      { data: suppliers, error: suppliersError },
      { data: resellers, error: resellersError },
      { data: categories, error: categoriesError },
      { data: printQueue, error: printQueueError }
    ] = await Promise.all([
      client.from('products').select('*', { count: 'exact' }),
      client.from('suppliers').select('*', { count: 'exact' }),
      client.from('resellers').select('*', { count: 'exact' }),
      client.from('categories').select('*', { count: 'exact' }),
      client.from('print_queue').select('*', { count: 'exact' })
    ]);
    
    // Billing table
    const { data: files, error: filesError } = await client
      .from('files')
      .select('*', { count: 'exact' });
    
    // Dashboard table
    const { data: dashboardClients, error: dashboardError } = await client
      .from('dashboard_completo_v5_base')
      .select('*', { count: 'exact' });
    
    // Count errors
    const errors = [
      pagesError, databasesError, boardsError,
      formsError, submissionsError,
      productsError, suppliersError, resellersError, categoriesError, printQueueError,
      filesError, dashboardError
    ].filter(e => e !== null);
    
    if (errors.length > 0) {
      console.warn(`⚠️ [AGGREGATION] ${errors.length} erros ao buscar dados:`, errors.map(e => e?.message));
    }
    
    // Calculate totals
    const pagesCount = pages?.length || 0;
    const databasesCount = databases?.length || 0;
    const boardsCount = boards?.length || 0;
    const formsCount = forms?.length || 0;
    const submissionsCount = submissions?.length || 0;
    const productsCount = products?.length || 0;
    const suppliersCount = suppliers?.length || 0;
    const resellersCount = resellers?.length || 0;
    const categoriesCount = categories?.length || 0;
    const printQueueCount = printQueue?.length || 0;
    const filesCount = files?.length || 0;
    const dashboardCount = dashboardClients?.length || 0;
    
    const totalRecords = pagesCount + databasesCount + boardsCount + 
                        formsCount + submissionsCount +
                        productsCount + suppliersCount + resellersCount + categoriesCount + printQueueCount +
                        filesCount + dashboardCount;
    
    const countsArray = [
      pagesCount, databasesCount, boardsCount,
      formsCount, submissionsCount,
      productsCount, suppliersCount, resellersCount, categoriesCount, printQueueCount,
      filesCount, dashboardCount
    ];
    const tablesWithData = countsArray.filter(c => c > 0).length;
    
    const result = {
      workspace: {
        pagesCount,
        databasesCount,
        boardsCount,
        recentPages: pages || []
      },
      forms: {
        formsCount,
        submissionsCount,
        recentSubmissions: submissions || []
      },
      products: {
        productsCount,
        suppliersCount,
        resellersCount,
        categoriesCount,
        printQueueCount
      },
      billing: {
        filesCount
      },
      dashboard: {
        clientsCount: dashboardCount
      },
      summary: {
        totalTables: 12,
        tablesWithData,
        totalRecords
      }
    };
    
    console.log(`✅ [AGGREGATION] Dados agregados para ${clientId}:`, {
      totalRecords,
      tablesWithData: `${tablesWithData}/12`,
      workspace: `${pagesCount} pages, ${databasesCount} dbs, ${boardsCount} boards`,
      forms: `${formsCount} forms, ${submissionsCount} submissions`,
      products: `${productsCount} products, ${suppliersCount} suppliers`
    });
    
    return result;
  } catch (error) {
    console.error(`❌ [AGGREGATION] Erro ao buscar dados agregados para ${clientId}:`, error);
    return null;
  }
}

/**
 * Obtém cliente Supabase dinâmico para um tenant específico
 * 
 * 🔐 MULTI-TENANT STRICT MODE: HARD-FAIL quando credenciais ausentes
 * 
 * Esta função NUNCA usa credenciais compartilhadas/globais quando chamado com tenantId.
 * Se credenciais específicas do tenant não existirem, retorna null, impedindo vazamento de dados.
 * 
 * Comportamento:
 * 1. Busca credenciais específicas do tenant via getSupabaseCredentials(tenantId)
 * 2. Se credenciais NÃO existirem: retorna NULL (sem fallback)
 * 3. Se credenciais existirem: cria e retorna client Supabase do tenant
 * 
 * SEGURANÇA:
 * - Isolamento completo entre tenants
 * - Sem fallback para process.env.REACT_APP_SUPABASE_URL
 * - Sem fallback para process.env.REACT_APP_SUPABASE_ANON_KEY
 * - Cada tenant DEVE ter suas próprias credenciais configuradas
 * 
 * @param tenantId - ID único do tenant (obrigatório)
 * @param allowFallback - DEPRECATED: Ignorado por segurança (mantido para compatibilidade)
 * @returns Cliente Supabase ou null se não configurado para o tenant
 * 
 * @example
 * // ✅ CORRETO: Tenant com credenciais configuradas
 * const client = await getDynamicSupabaseClient('tenant-123');
 * if (client) {
 *   // Usar client normalmente
 * }
 * 
 * @example
 * // ❌ FAIL SEGURO: Tenant sem credenciais retorna null
 * const client = await getDynamicSupabaseClient('tenant-sem-config');
 * // client === null (sem fallback para credenciais globais)
 */
export async function getDynamicSupabaseClient(
  tenantId: string,
  allowFallback: boolean = true
): Promise<SupabaseClient | null> {
  // allowFallback é ignorado por segurança - sempre HARD-FAIL se credenciais ausentes
  if (allowFallback === false) {
    // Log apenas quando explicitamente passado como false (para debug)
    console.log(`[MULTI-TENANT] allowFallback=false detectado (já é comportamento padrão)`);
  }
  
  // Chama getClientSupabaseClient que NUNCA faz fallback
  const client = await getClientSupabaseClient(tenantId);
  
  if (!client) {
    console.error(`❌ [MULTI-TENANT] HARD-FAIL: Credenciais ausentes para tenant ${tenantId}`);
    console.error(`❌ [MULTI-TENANT] Fallback para credenciais globais DESABILITADO (segurança)`);
    console.error(`💡 [MULTI-TENANT] Configure credenciais do Supabase para este tenant em /configuracoes`);
  }
  
  return client;
}

/**
 * Aliases para compatibilidade com código existente
 * @deprecated Use os nomes novos: getClientSupabaseClient, testClientSupabaseConnection, etc
 */
export const testDynamicSupabaseConnection = testClientSupabaseConnection;
export const getDashboardDataFromSupabase = getClientDashboardData;
export const clearSupabaseClientCache = clearClientSupabaseCache;
