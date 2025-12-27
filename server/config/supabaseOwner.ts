import { createClient } from '@supabase/supabase-js';

// Supabase PRINCIPAL (do dono) - para autenticação centralizada
// Usa as credenciais do owner que ficam fixas nos secrets
// IMPORTANTE: Configurar SUPABASE_OWNER_URL e SUPABASE_OWNER_SERVICE_KEY para habilitar multi-tenant
const supabaseOwnerUrl = process.env.SUPABASE_OWNER_URL || '';
const supabaseOwnerKey = process.env.SUPABASE_OWNER_SERVICE_KEY || '';


export const supabaseOwner = (supabaseOwnerUrl && supabaseOwnerKey) 
  ? createClient(supabaseOwnerUrl, supabaseOwnerKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper para criar cliente Supabase específico do cliente logado
export function createClientSupabase(supabaseUrl: string | null, supabaseKey: string | null) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export const SUPABASE_CONFIGURED = !!(supabaseOwnerUrl && supabaseOwnerKey);
