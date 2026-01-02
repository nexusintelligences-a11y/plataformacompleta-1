import { pgTable, serial, varchar, text, timestamp, decimal, boolean, uuid, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

// ========================================
// TABELA USERS
// ========================================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  nome_completo: varchar("nome_completo", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  cep: varchar("cep", { length: 10 }),
  rua: varchar("rua", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  endereco_completo: text("endereco_completo"),
  govbr_verified: boolean("govbr_verified").default(false),
  govbr_nivel_conta: varchar("govbr_nivel_conta", { length: 20 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ========================================
// TABELA CONTRACTS
// ========================================
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  access_token: uuid("access_token").defaultRandom().unique().notNull(),
  client_name: varchar("client_name", { length: 255 }).notNull(),
  client_cpf: varchar("client_cpf", { length: 20 }).notNull(),
  client_email: varchar("client_email", { length: 255 }).notNull(),
  client_phone: varchar("client_phone", { length: 20 }),
  client_address: text("client_address"),
  client_city: varchar("client_city", { length: 100 }),
  client_state: varchar("client_state", { length: 2 }),
  client_zip: varchar("client_zip", { length: 10 }),
  contract_html: text("contract_html").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  created_at: timestamp("created_at").defaultNow(),
  signed_at: timestamp("signed_at"),
  verification_selfie: text("verification_selfie"),
  verification_document: text("verification_document"),
  face_match_score: decimal("face_match_score", { precision: 5, scale: 2 }),
  logo_url: text("logo_url"),
  primary_color: varchar("primary_color", { length: 7 }).default("#3B82F6"),
  text_color: varchar("text_color", { length: 7 }).default("#1F2937"),
  font_family: varchar("font_family", { length: 100 }).default("Inter"),
  company_name: varchar("company_name", { length: 255 }),
  footer_text: text("footer_text"),
  verification_instructions: text("verification_instructions"),
  verification_security_message: text("verification_security_message"),
  verification_icon_url: text("verification_icon_url"),
  security_message: text("security_message"),
  header_background_color: varchar("header_background_color", { length: 7 }),
  progress_step1_text: varchar("progress_step1_text", { length: 255 }),
  progress_step2_text: varchar("progress_step2_text", { length: 255 }),
  progress_step3_text: varchar("progress_step3_text", { length: 255 }),
  progress_step4_text: varchar("progress_step4_text", { length: 255 }),
  success_title: varchar("success_title", { length: 255 }),
  success_message: text("success_message"),
  success_button_text: varchar("success_button_text", { length: 100 }),
  app_store_url: text("app_store_url"),
  play_store_url: text("play_store_url"),
  govbr_token_hash: varchar("govbr_token_hash", { length: 255 }),
  govbr_cpf: varchar("govbr_cpf", { length: 20 }),
  govbr_validated: boolean("govbr_validated").default(false),
});

// ========================================
// TABELAS DE LOG E AUDITORIA
// ========================================
export const signatureLogs = pgTable("signature_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  contract_id: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  ip_address: varchar("ip_address", { length: 45 }).notNull(),
  user_agent: text("user_agent"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  govbr_token_hash: varchar("govbr_token_hash", { length: 255 }),
  govbr_auth_time: timestamp("govbr_auth_time", { withTimezone: true }),
  signature_valid: boolean("signature_valid").default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const auditTrail = pgTable("audit_trail", {
  id: uuid("id").defaultRandom().primaryKey(),
  contract_id: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

// ========================================
// SCHEMAS ZOD
// ========================================
const optionalUrlOrEmpty = z.string().optional().or(z.literal("")).refine(
  (val) => !val || val === "" || z.string().url().safeParse(val).success,
  { message: "Deve ser uma URL válida ou vazio" }
);

const optionalColorOrEmpty = z.string().optional().or(z.literal("")).refine(
  (val) => !val || val === "" || /^#[0-9A-Fa-f]{3,6}$/.test(val),
  { message: "Deve ser uma cor hex válida (#RRGGBB) ou vazio" }
);

export const insertContractSchema = z.object({
  client_name: z.string().min(1, "Nome é obrigatório"),
  client_cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 11, "CPF deve ter 11 dígitos"),
  client_email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  contract_html: z.string().min(1, "Conteúdo do contrato é obrigatório"),
  client_phone: z.string().optional().or(z.literal("")),
  client_address: z.string().optional().or(z.literal("")),
  client_city: z.string().optional().or(z.literal("")),
  client_state: z.string().max(2).optional().or(z.literal("")),
  client_zip: z.string().optional().or(z.literal("")),
  logo_url: optionalUrlOrEmpty,
  primary_color: optionalColorOrEmpty,
  text_color: optionalColorOrEmpty,
  font_family: z.string().optional().or(z.literal("")),
  company_name: z.string().optional().or(z.literal("")),
  footer_text: z.string().optional().or(z.literal("")),
  verification_instructions: z.string().optional().or(z.literal("")),
  verification_security_message: z.string().optional().or(z.literal("")),
  verification_icon_url: optionalUrlOrEmpty,
  security_message: z.string().optional().or(z.literal("")),
  header_background_color: optionalColorOrEmpty,
  progress_step1_text: z.string().optional().or(z.literal("")),
  progress_step2_text: z.string().optional().or(z.literal("")),
  progress_step3_text: z.string().optional().or(z.literal("")),
  progress_step4_text: z.string().optional().or(z.literal("")),
  success_title: z.string().optional().or(z.literal("")),
  success_message: z.string().optional().or(z.literal("")),
  success_button_text: z.string().optional().or(z.literal("")),
  app_store_url: optionalUrlOrEmpty,
  play_store_url: optionalUrlOrEmpty,
});

export const insertContractPartialSchema = insertContractSchema.partial();

export const insertSignatureLogSchema = z.object({
  contract_id: z.number(),
  ip_address: z.string(),
  user_agent: z.string().optional(),
  timestamp: z.union([z.instanceof(Date), z.string().datetime()]),
  govbr_token_hash: z.string().nullable().optional(),
  govbr_auth_time: z.union([z.instanceof(Date), z.string().datetime(), z.null()]).optional(),
  signature_valid: z.boolean().optional(),
});

export const insertUserSchema = z.object({
  cpf: z.string().length(11),
  nome_completo: z.string(),
  email: z.string().email(),
});

export const insertAuditTrailSchema = z.object({
  contract_id: z.number(),
  action: z.string(),
  metadata: z.any().optional(),
});

export type SignatureLog = typeof signatureLogs.$inferSelect;
export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertSignatureLog = z.infer<typeof insertSignatureLogSchema>;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
