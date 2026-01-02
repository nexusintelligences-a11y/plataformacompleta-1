import type { Express } from "express";
import { storage } from "../storage/assinatura-storage";
import { 
  insertContractSchema, 
  insertContractPartialSchema, 
  contracts,
  signatureLogs,
  auditTrail,
  signatureUsers
} from "../../shared/db-schema";
import { z } from "zod";

export function registerRoutes(app: Express): void {
  app.get("/api/config/supabase", async (_req, res) => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        // @ts-ignore
        const supabaseUrl = supabase.supabaseUrl;
        // @ts-ignore
        const supabaseKey = supabase.supabaseKey;
        if (supabaseUrl && supabaseKey) {
          return res.json({ url: supabaseUrl, key: supabaseKey });
        }
      }
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      res.json({ url: supabaseUrl, key: supabaseKey });
    } catch (error) {
      console.error("Erro ao carregar config Supabase para plataforma:", error);
      res.json({ url: '', key: '' });
    }
  });

  app.get("/api/contracts", async (_req, res) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/contracts/by-id/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/contracts/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const contract = await storage.getContractByToken(token);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    try {
      const validatedData = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(validatedData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertContractPartialSchema.parse(req.body);
      const contract = await storage.updateContract(id, validatedData);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/contracts/:id/finalize", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { selfie_photo, document_photo, signed_contract_html, status } = req.body;
      const contract = await storage.updateContract(id, {
        verification_selfie: selfie_photo,
        verification_document: document_photo,
        contract_html: signed_contract_html,
        status: status || 'signed',
        signed_at: new Date(),
      });
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
