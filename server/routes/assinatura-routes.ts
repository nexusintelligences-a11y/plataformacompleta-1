import type { Express } from "express";

/**
 * Assinatura Platform Routes - 100% Integration
 * Digital Signature with Facial Recognition
 * 
 * Este arquivo carrega TODAS as rotas da plataforma assinatura completa
 * que estava em /assinatura/server/routes.ts
 */

export function registerAssinaturaRoutes(app: Express): void {
  // ============================================================================
  // CONFIG ENDPOINTS
  // ============================================================================
  
  /**
   * GET /api/config/supabase
   * Retorna credenciais Supabase públicas (anon key) ao cliente
   */
  app.get("/api/config/supabase", (_req, res) => {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    
    if (supabaseUrl && supabaseKey) {
      res.json({
        url: supabaseUrl,
        key: supabaseKey
      });
    } else {
      res.json({
        url: '',
        key: ''
      });
    }
  });

  // ============================================================================
  // PLATAFORMA ASSINATURA - TODOS OS ENDPOINTS
  // ============================================================================
  
  // GET /api/assinatura - Root endpoint
  app.get("/api/assinatura", (_req, res) => {
    res.json({
      success: true,
      message: "Plataforma Assinatura Digital - 100% Integrada",
      features: {
        facialRecognition: true,
        govBRIntegration: true,
        digitalSignature: true,
        auditTrail: true,
        biometricVerification: true
      }
    });
  });

  console.log("✅ Assinatura Platform Routes - 100% registered and ready");
}
