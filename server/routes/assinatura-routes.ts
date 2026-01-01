import { Router } from "express";
import { db } from "../db";
import { assinatura_contracts } from "../../shared/formularios/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Proxy de Configuração: GET /api/config/supabase
// Resolve conflitos entre variáveis de ambiente e entrega apenas o necessário para o cliente
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
