import { Router } from "express";
import { db } from "../db";
import { assinatura_contracts } from "../../shared/formularios/schema";
import { eq } from "drizzle-orm";

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
router.get("/config/supabase", (req, res) => {
  res.json({
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  });
});

export function registerAssinaturaRoutes(app: any): void {
  app.use("/api/assinatura", router);
  console.log("✅ Plataforma de Assinatura Digital: Rotas registradas");
}
