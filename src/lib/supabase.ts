import { createClient } from '@supabase/supabase-js';

// Cache do cliente Supabase (in-memory singleton)
let supabaseClient: any = null;
let supabasePromise: Promise<any> | null = null;

// Cliente síncrono legado exportado (para compatibilidade com código existente)
// Este será null até que getSupabaseClient() seja chamado pela primeira vez
export let supabase: any = null;

/**
 * Função auxiliar para retry com backoff exponencial
 * Retenta APENAS quando a função lança exceção
 * Se a função retorna normalmente (mesmo que seja null), considera sucesso
 * 
 * @param fn Função assíncrona a ser executada
 * @param maxRetries Número máximo de tentativas (padrão: 5)
 * @param baseDelay Delay inicial em ms (padrão: 1000ms)
 * @returns Resultado da função ou throw após todas as tentativas
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Primeira tentativa é imediata, demais têm delay com backoff exponencial
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s, 16s
        console.log(`⏳ Aguardando ${delay}ms antes da tentativa ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries} de carregar credenciais Supabase...`);
      
      const result = await fn();
      
      // Se chegou aqui, sucesso (mesmo que result seja null)!
      if (attempt > 0) {
        console.log(`✅ Sucesso na tentativa ${attempt + 1}/${maxRetries}`);
      }
      return result;
      
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.warn(`⚠️ Tentativa ${attempt + 1}/${maxRetries} falhou: ${errorMessage}`);
      
      // Se não é a última tentativa, continua o loop
      if (attempt < maxRetries - 1) {
        console.log(`🔁 Preparando nova tentativa...`);
      } else {
        console.error(`❌ Todas as ${maxRetries} tentativas falharam`);
      }
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  throw lastError || new Error('Todas as tentativas de carregar credenciais Supabase falharam');
}

/**
 * Busca credenciais Supabase da API backend (runtime, não build-time)
 * Implementa retry com backoff exponencial para resistir a erros temporários
 * 
 * Endpoint: GET /api/config/supabase/credentials
 * - AUTHENTICATED (requer sessão válida)
 * - Rate-limited (30 req/min)
 * - Retorna: { success: true, credentials: { url, anonKey } }
 * 
 * SEGURANÇA: Endpoint retorna apenas anon_key (credencial pública)
 * NUNCA retorna service_role_key (credencial privada do servidor)
 * 
 * RESILIÊNCIA:
 * - Faz até 5 tentativas com backoff exponencial (1s, 2s, 4s, 8s, 16s)
 * - Retenta em erros de rede e erros 5xx (servidor)
 * - NÃO retenta em erros 4xx (cliente) ou credenciais vazias
 */
async function fetchSupabaseConfig() {
  try {
    return await fetchWithRetry(async () => {
      const response = await fetch('/api/config/supabase/credentials');
      
      if (!response.ok) {
        // Erros 5xx são temporários (servidor aquecendo, sobrecarga, etc) - RETRY
        if (response.status >= 500) {
          throw new Error(`Servidor retornou erro ${response.status} (temporário, fazendo retry...)`);
        }
        
        // 401 = não autenticado - comportamento normal antes do login
        if (response.status === 401) {
          console.log('ℹ️ [SUPABASE] Usuário não autenticado - credenciais serão carregadas após login');
          return null;
        }
        
        // Outros erros 4xx são erros de cliente
        console.warn(`⚠️ API /api/config/supabase/credentials retornou erro ${response.status} (erro de cliente, não fará retry)`);
        return null;
      }
      
      const data = await response.json();
      
      // Validar que recebemos credenciais válidas (response.success e credentials)
      if (data.success && data.credentials && data.credentials.url && data.credentials.anonKey) {
        console.log('✅ Credenciais Supabase carregadas da API (runtime)');
        return {
          url: data.credentials.url,
          anonKey: data.credentials.anonKey
        };
      }
      
      // API retornou credenciais vazias (Supabase não configurado no banco)
      // Isso é um erro de configuração, NÃO temporário - não faz sentido retry
      console.log('⚠️ API retornou credenciais vazias - Supabase não configurado (não fará retry)');
      return null;
    }, 5, 1000); // 5 tentativas, delay inicial de 1s
    
  } catch (error) {
    // Após todas as tentativas falharem, logamos erro final detalhado
    console.error('❌ [SUPABASE] Não foi possível carregar credenciais após múltiplas tentativas');
    console.error('❌ [SUPABASE] Erro:', error instanceof Error ? error.message : String(error));
    console.error('❌ [SUPABASE] Possíveis causas:');
    console.error('   - Servidor backend não está rodando');
    console.error('   - Servidor ainda está aquecendo (aguarde alguns segundos e recarregue)');
    console.error('   - Erro de rede ou firewall');
    console.error('   - Endpoint /api/config/supabase não está acessível');
    return null;
  }
}

/**
 * Limpa o cache do cliente Supabase, forçando re-fetch de credenciais
 * Deve ser chamada após login bem-sucedido
 */
export function clearSupabaseCache() {
  supabaseClient = null;
  supabase = null;
  supabasePromise = null;
  console.log('🔄 [SUPABASE] Cache limpo - próxima chamada irá re-buscar credenciais');
}

/**
 * Recarrega credenciais do Supabase após login
 * Retorna true se conseguiu carregar, false se não
 */
export async function reloadSupabaseCredentials(): Promise<boolean> {
  console.log('🔄 Recarregando credenciais do Supabase após login...');
  clearSupabaseCache();
  
  try {
    const client = await getSupabaseClient();
    return client !== null;
  } catch (error) {
    console.warn('⚠️ [SUPABASE] Não foi possível carregar credenciais após login:', error);
    return false;
  }
}

// Função para obter cliente Supabase (lazy loading)
export async function getSupabaseClient() {
  // Se já temos cliente, retorna imediatamente
  if (supabaseClient) {
    return supabaseClient;
  }

  // Se já está buscando, aguarda a mesma promise
  if (supabasePromise) {
    return supabasePromise;
  }

  // Inicia nova busca de credenciais
  supabasePromise = (async () => {
    try {
      // Busca credenciais APENAS da API backend (runtime)
      // Sistema está configurado para usar EXCLUSIVAMENTE o banco de dados
      const apiCreds = await fetchSupabaseConfig();
      
      if (!apiCreds) {
        // Se não temos credenciais, pode ser porque o usuário não está autenticado
        // Não logar como erro, apenas retornar null
        console.log('ℹ️ [SUPABASE] Credenciais não disponíveis - usuário pode não estar autenticado');
        supabaseClient = null;
        supabase = null;
        supabasePromise = null;
        return null;
      }

      const { url: supabaseUrl, anonKey: supabaseAnonKey } = apiCreds;

      // Criar cliente Supabase
      try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        supabase = supabaseClient;  // Update exported singleton for legacy code compatibility
        console.log('✅ Cliente Supabase criado com sucesso a partir da API backend');
        return supabaseClient;
      } catch (error) {
        console.error('❌ [SUPABASE] Erro ao criar cliente Supabase:', error);
        console.error('❌ [SUPABASE] Verifique se as credenciais no banco de dados são válidas');
        console.error('💡 [SUPABASE] Acesse /configuracoes para verificar as credenciais');
        supabaseClient = null;
        supabase = null;
        supabasePromise = null;
        return null;
      }
    } catch (error) {
      console.error('❌ [SUPABASE] Erro inesperado ao obter cliente:', error);
      supabaseClient = null;
      supabase = null;
      supabasePromise = null;
      return null;
    }
  })();

  return supabasePromise;
}

// Database types for dashboard_completo_v5_base table (matches server interface)
export interface DashboardCompleteV5 {
  telefone: string;
  nome_completo: string;
  email_principal: string;
  status_atendimento: string;
  setor_atual: string | null;
  ativo: boolean | null;
  tipo_reuniao_atual: string | null;
  primeiro_contato: string;
  ultimo_contato: string;
  total_registros: number;
  registros_dados_cliente: number;
  total_mensagens_chat: number;
  total_transcricoes: number;
  fontes_dados: number;
  tem_dados_cliente: boolean;
  tem_historico_chat: boolean;
  tem_transcricoes: boolean;
  ultima_atividade: string;
  id_reuniao_atual: string | null;
  ultima_transcricao: string;
  mensagens_cliente: string;
  mensagens_agente: string;
  todas_mensagens_chat?: string;
  primeira_mensagem?: string;
  ultima_mensagem?: string;
  ultima_transcricao_completa?: string;
  ultimo_resumo_estruturado?: string;
}