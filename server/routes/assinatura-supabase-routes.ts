import type { Express } from "express";
import { db } from "../db";
import { 
  assinatura_contracts,
  // Estas colunas JSONB já existem no schema do Drizzle para fallback/cache
} from "../../shared/formularios/schema";
import { eq } from "drizzle-orm";

export function registerSupabaseConfigRoutes(app: Express): void {
  // ============================================
  // APARÊNCIA
  // ============================================
  app.get("/api/config/appearance/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.id, contractId));
      
      if (!contract) return res.json({});
      res.json(contract.appearance_configs || {});
    } catch (error) {
      console.error("Error fetching appearance config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/appearance/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const data = req.body;

      await db.update(assinatura_contracts)
        .set({ 
          appearance_configs: data,
          updated_at: new Date() 
        })
        .where(eq(assinatura_contracts.id, contractId));

      res.json(data);
    } catch (error) {
      console.error("Error saving appearance config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // VERIFICAÇÃO
  // ============================================
  app.get("/api/config/verification/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.id, contractId));
      
      if (!contract) return res.json({});
      res.json(contract.verification_configs || {});
    } catch (error) {
      console.error("Error fetching verification config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/verification/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const data = req.body;

      await db.update(assinatura_contracts)
        .set({ 
          verification_configs: data,
          updated_at: new Date() 
        })
        .where(eq(assinatura_contracts.id, contractId));

      res.json(data);
    } catch (error) {
      console.error("Error saving verification config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // CONTRATO
  // ============================================
  app.get("/api/config/contract/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.id, contractId));
      
      if (!contract) return res.json({});
      res.json(contract.contract_configs || {});
    } catch (error) {
      console.error("Error fetching contract config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/contract/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const data = req.body;

      await db.update(assinatura_contracts)
        .set({ 
          contract_configs: data,
          updated_at: new Date() 
        })
        .where(eq(assinatura_contracts.id, contractId));

      res.json(data);
    } catch (error) {
      console.error("Error saving contract config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // PROGRESSO
  // ============================================
  app.get("/api/config/progress/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.id, contractId));
      
      if (!contract) return res.json({});
      res.json(contract.progress_tracker_configs || {});
    } catch (error) {
      console.error("Error fetching progress config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/progress/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const data = req.body;

      await db.update(assinatura_contracts)
        .set({ 
          progress_tracker_configs: data,
          updated_at: new Date() 
        })
        .where(eq(assinatura_contracts.id, contractId));

      res.json(data);
    } catch (error) {
      console.error("Error saving progress config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // PARABÉNS / REVENDEDORA
  // ============================================
  app.get("/api/config/reseller-welcome/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.id, contractId));
      
      if (!contract) return res.json({});
      res.json(contract.reseller_welcome_configs || {});
    } catch (error) {
      console.error("Error fetching reseller-welcome config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/reseller-welcome/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const data = req.body;

      await db.update(assinatura_contracts)
        .set({ 
          reseller_welcome_configs: data,
          updated_at: new Date() 
        })
        .where(eq(assinatura_contracts.id, contractId));

      res.json(data);
    } catch (error) {
      console.error("Error saving reseller-welcome config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // LINKS APPS
  // ============================================
  app.get("/api/config/app-promotion/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.id, contractId));
      
      if (!contract) return res.json({});
      res.json(contract.app_promotion_configs || {});
    } catch (error) {
      console.error("Error fetching app-promotion config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/app-promotion/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;
      const data = req.body;

      await db.update(assinatura_contracts)
        .set({ 
          app_promotion_configs: data,
          updated_at: new Date() 
        })
        .where(eq(assinatura_contracts.id, contractId));

      res.json(data);
    } catch (error) {
      console.error("Error saving app-promotion config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
