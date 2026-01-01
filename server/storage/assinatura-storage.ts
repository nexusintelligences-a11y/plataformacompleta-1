import { db } from "../db";
import { signatureContracts, users, signatureLogs, auditTrail } from "../../shared/db-schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const storage = {
  async getAllContracts() {
    return await db.select().from(signatureContracts);
  },

  async getContract(id: string) {
    const [contract] = await db.select().from(signatureContracts).where(eq(signatureContracts.id, id));
    return contract || null;
  },

  async getContractByToken(token: string) {
    const [contract] = await db.select().from(signatureContracts).where(eq(signatureContracts.access_token, token));
    return contract || null;
  },

  async createContract(data: any) {
    const id = nanoid();
    const accessToken = nanoid(32);
    const [contract] = await db.insert(signatureContracts).values({
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
    const [contract] = await db.update(signatureContracts)
      .set({ ...data, updated_at: new Date() })
      .where(eq(signatureContracts.id, id))
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
    const [log] = await db.insert(signatureLogs).values({
      ...data,
      signed_at: new Date(),
    }).returning();
    return log;
  },

  async createAuditTrail(data: any) {
    const [audit] = await db.insert(auditTrail).values({
      ...data,
      created_at: new Date(),
    }).returning();
    return audit;
  }
};
