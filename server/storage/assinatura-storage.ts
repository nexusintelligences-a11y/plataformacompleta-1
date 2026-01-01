import { db } from "../db";
import { contracts, users, signatureLogs, auditTrail } from "../../assinatura/shared/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const storage = {
  async getAllContracts() {
    return await db.select().from(contracts);
  },

  async getContract(id: string) {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || null;
  },

  async getContractByToken(token: string) {
    const [contract] = await db.select().from(contracts).where(eq(contracts.access_token, token));
    return contract || null;
  },

  async createContract(data: any) {
    try {
      console.log("💾 Inserindo contrato no banco:", JSON.stringify(data, null, 2));
      const id = uuidv4();
      const accessToken = uuidv4();
      const [contract] = await db.insert(contracts).values({
        ...data,
        id,
        access_token: accessToken,
        status: data.status || 'pending',
        created_at: new Date(),
      }).returning();
      console.log("✅ Contrato inserido com sucesso:", contract.id);
      return contract;
    } catch (error) {
      console.error("❌ Erro na inserção do contrato:", error);
      throw error;
    }
  },

  async updateContract(id: string, data: any) {
    const [contract] = await db.update(contracts)
      .set({ ...data })
      .where(eq(contracts.id, id))
      .returning();
    return contract || null;
  },

  async upsertUser(data: any) {
    const id = uuidv4();
    const [user] = await db.insert(users).values({
      ...data,
      id: data.id || id,
      created_at: new Date(),
    }).onConflictDoUpdate({
      target: users.cpf,
      set: data
    }).returning();
    return user;
  },

  async createSignatureLog(data: any) {
    const id = uuidv4();
    const [log] = await db.insert(signatureLogs).values({
      ...data,
      id: data.id || id,
      timestamp: data.timestamp || new Date(),
      created_at: new Date(),
    }).returning();
    return log;
  },

  async createAuditTrail(data: any) {
    const id = uuidv4();
    const [audit] = await db.insert(auditTrail).values({
      ...data,
      id: data.id || id,
      timestamp: new Date(),
    }).returning();
    return audit;
  }
};
