/**
 * Supabase File-Based Configuration Routes
 * 
 * These routes allow configuring Supabase credentials via the UI
 * without requiring a database connection. Credentials are stored
 * in a local JSON file (data/supabase-config.json).
 * 
 * This enables the app to start in "configuration mode" and show
 * a preview while waiting for Supabase credentials.
 */

import express from 'express';
import { 
  getSupabaseFileConfig, 
  saveSupabaseFileConfig, 
  isSupabaseConfigured,
  getEffectiveSupabaseConfig,
  SupabaseFileConfig
} from '../lib/supabaseFileConfig';
import { resetAllPollerStates } from '../lib/stateReset';

const router = express.Router();

/**
 * GET /api/config/supabase-setup
 * Check if Supabase is configured (works without database)
 */
router.get('/supabase-setup', async (req, res) => {
  try {
    const configured = isSupabaseConfigured();
    const effectiveConfig = getEffectiveSupabaseConfig();
    
    res.json({
      configured,
      source: effectiveConfig ? (process.env.REACT_APP_SUPABASE_URL ? 'environment' : 'file') : null,
      urlMasked: effectiveConfig?.url ? maskUrl(effectiveConfig.url) : null,
      hasDatabaseUrl: !!effectiveConfig?.databaseUrl,
    });
  } catch (error) {
    res.status(500).json({
      configured: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/config/supabase-setup
 * Save Supabase credentials to file (works without database)
 */
router.post('/supabase-setup', async (req, res) => {
  try {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey, databaseUrl } = req.body;
    
    if (!supabaseUrl) {
      return res.status(400).json({
        success: false,
        error: 'supabaseUrl é obrigatório',
      });
    }
    
    if (!supabaseAnonKey) {
      return res.status(400).json({
        success: false,
        error: 'supabaseAnonKey é obrigatório',
      });
    }
    
    if (!supabaseUrl.includes('supabase.co')) {
      return res.status(400).json({
        success: false,
        error: 'URL inválida. Deve ser uma URL do Supabase (ex: https://xxx.supabase.co)',
      });
    }
    
    if (databaseUrl && !databaseUrl.startsWith('postgres')) {
      return res.status(400).json({
        success: false,
        error: 'DATABASE_URL inválida. Deve começar com postgresql:// ou postgres://',
      });
    }
    
    const config: Partial<SupabaseFileConfig> = {
      supabaseUrl,
      supabaseAnonKey,
    };
    
    if (supabaseServiceRoleKey) {
      config.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }
    
    if (databaseUrl) {
      config.databaseUrl = databaseUrl;
    }
    
    const saved = saveSupabaseFileConfig(config);
    
    if (saved) {
      console.log('✅ Supabase credentials saved to file');
      console.log(`   URL: ${maskUrl(supabaseUrl)}`);
      console.log(`   Database URL: ${databaseUrl ? 'configured' : 'not configured'}`);
      
      resetAllPollerStates();
      console.log('🔄 Estados de polling resetados - sincronização completa será executada após reiniciar');
      
      res.json({
        success: true,
        message: 'Credenciais do Supabase salvas com sucesso. Reinicie o servidor para aplicar.',
        nextSteps: [
          'Credenciais salvas em data/supabase-config.json',
          'Estados de polling resetados para sincronização completa',
          'Reinicie o servidor para conectar ao banco de dados',
          'Após reiniciar, acesse /configuracoes para verificar a conexão',
        ],
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao salvar credenciais. Verifique os logs do servidor.',
      });
    }
  } catch (error) {
    console.error('Error saving Supabase config:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/config/supabase-setup/test
 * Test Supabase connection
 */
router.get('/supabase-setup/test', async (req, res) => {
  try {
    const config = getEffectiveSupabaseConfig();
    
    if (!config) {
      return res.json({
        success: false,
        error: 'Supabase não configurado',
      });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(config.url, config.anonKey);
    
    const { data, error } = await supabase.from('workspace_pages').select('id').limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      return res.json({
        success: false,
        error: `Erro de conexão: ${error.message}`,
      });
    }
    
    res.json({
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso',
      url: maskUrl(config.url),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    if (host.includes('supabase.co')) {
      const projectRef = host.split('.')[0];
      return `https://${projectRef.substring(0, 8)}...supabase.co`;
    }
    return `${parsed.protocol}//${host.substring(0, 8)}...`;
  } catch {
    return url.substring(0, 25) + '...';
  }
}

export default router;
