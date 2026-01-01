import { Router } from "express";
import { db } from "../db";
import { assinatura_contracts } from "../../shared/formularios/schema";
import { eq } from "drizzle-orm";
import { getSupabaseClient } from "../lib/supabaseClient";

const router = Router();

// Endpoint para registrar logs de auditoria detalhados
router.post("/contracts/:id/audit", async (req, res) => {
  const { action, metadata } = req.body;
  const { id } = req.params;
  
  try {
    // Implementar lógica de persistência de log de auditoria
    console.log(`[AUDIT] Action: ${action} on Contract: ${id}`, metadata);
    
    // Atualizar timestamp de última atividade no contrato
    await db.update(assinatura_contracts)
      .set({ last_activity_at: new Date() })
      .where(eq(assinatura_contracts.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Erro na auditoria:", error);
    res.status(500).json({ error: "Erro ao registrar log de auditoria" });
  }
});

// Proxy de Configuração: GET /api/config/supabase
router.get("/config/supabase", async (req, res) => {
  try {
    // 🔐 Prioridade: Banco de dados via getSupabaseClient (que já resolve multi-tenant/fallback)
    const supabase = await getSupabaseClient();
    
    if (supabase) {
      // @ts-ignore - Acessando propriedades privadas do cliente para retornar ao frontend
      const supabaseUrl = supabase.supabaseUrl;
      // @ts-ignore
      const supabaseKey = supabase.supabaseKey;

      if (supabaseUrl && supabaseKey) {
        return res.json({
          supabaseUrl,
          supabaseKey,
        });
      }
    }

    // Fallback para env vars se o banco falhar
    res.json({
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    });
  } catch (error) {
    console.error("Erro ao carregar config Supabase para assinatura:", error);
    res.status(500).json({ error: "Erro interno ao carregar configurações" });
  }
});

export function registerAssinaturaRoutes(app: any): void {
  app.use("/api/assinatura", router);
  console.log("✅ Plataforma de Assinatura Digital: Rotas registradas");
}
