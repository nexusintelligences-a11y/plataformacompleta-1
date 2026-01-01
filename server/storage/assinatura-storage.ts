import { db } from "../db";
import { assinatura_contracts, users, signature_logs, audit_trail } from "../../shared/db-schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const storage = {
  async getAllContracts() {
    return await db.select().from(assinatura_contracts);
  },

  async getContract(id: string) {
    const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.id, id));
    return contract || null;
  },

  async getContractByToken(token: string) {
    const [contract] = await db.select().from(assinatura_contracts).where(eq(assinatura_contracts.access_token, token));
    return contract || null;
  },

  async createContract(data: any) {
    const id = nanoid();
    const accessToken = nanoid(32);
    const [contract] = await db.insert(assinatura_contracts).values({
      ...data,
      id,
      access_token: accessToken,
      status: data.status || 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();
    return contract;
  },

  async updateContract(id: string, data: any) {
    const [contract] = await db.update(assinatura_contracts)
      .set({ ...data, updated_at: new Date() })
      .where(eq(assinatura_contracts.id, id))
      .returning();
    return contract || null;
  },

  async upsertUser(data: any) {
    const [user] = await db.insert(users).values({
      ...data,
      created_at: new Date(),
    }).onConflictDoUpdate({
      target: users.cpf,
      set: data
    }).returning();
    return user;
  },

  async createSignatureLog(data: any) {
    const [log] = await db.insert(signature_logs).values({
      ...data,
      signed_at: new Date(),
    }).returning();
    return log;
  },

  async createAuditTrail(data: any) {
    const [audit] = await db.insert(audit_trail).values({
      ...data,
      created_at: new Date(),
    }).returning();
    return audit;
  }
};
