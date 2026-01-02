import { pgTable, serial, varchar, text, timestamp, integer, json, boolean, date, uuid, jsonb, index, numeric, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ========================================
// TABELAS ORIGINAIS DO SISTEMA (PRESERVADAS)
// ========================================

// Notification Settings Table
export const notificationSettings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  email: text('email'),
  phone: text('phone'),
  emailEnabled: varchar('email_enabled', { length: 10 }).default('true'),
  whatsappEnabled: varchar('whatsapp_enabled', { length: 10 }).default('false'),
  enabled: varchar('enabled', { length: 10 }).default('true'),
  sound: varchar('sound', { length: 10 }).default('true'),
  vibration: varchar('vibration', { length: 10 }).default('true'),
  badge: varchar('badge', { length: 10 }).default('true'),
  showPreview: varchar('show_preview', { length: 10 }).default('true'),
  quietHoursEnabled: varchar('quiet_hours_enabled', { length: 10 }).default('false'),
  quietHoursStart: varchar('quiet_hours_start', { length: 10 }).default('22:00'),
  quietHoursEnd: varchar('quiet_hours_end', { length: 10 }).default('08:00'),
  supabaseEnabled: varchar('supabase_enabled', { length: 10 }).default('true'),
  calendarEnabled: varchar('calendar_enabled', { length: 10 }).default('true'),
  pluggyEnabled: varchar('pluggy_enabled', { length: 10 }).default('true'),
  systemEnabled: varchar('system_enabled', { length: 10 }).default('true'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_notification_settings_tenant').on(table.tenantId),
  userIdx: uniqueIndex('idx_notification_settings_user_tenant').on(table.userId, table.tenantId),
}));

// Biometric Credentials Table
export const biometricCredentials = pgTable('biometric_credentials', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  credentialId: text('credential_id').notNull(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  transports: text('transports').array(),
  deviceName: text('device_name'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_biometric_credentials_tenant').on(table.tenantId),
}));

// Pluggy Configuration Table
export const pluggyConfig = pgTable('pluggy_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_pluggy_tenant_unique').on(table.tenantId),
}));

// Pluggy Items Table
export const pluggyItems = pgTable('pluggy_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: text('tenant_id').notNull(),
  connectorId: varchar('connector_id', { length: 255 }),
  connectorName: varchar('connector_name', { length: 255 }),
  status: varchar('status', { length: 100 }),
  executionStatus: varchar('execution_status', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_pluggy_items_tenant').on(table.tenantId),
}));

// Supabase Configuration Table
export const supabaseConfig = pgTable('supabase_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  supabaseUrl: text('supabase_url').notNull(),
  supabaseAnonKey: text('supabase_anon_key').notNull(),
  supabaseBucket: text('supabase_bucket').default('receipts'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_supabase_tenant_unique').on(table.tenantId),
}));

// N8N Configuration Table
export const n8nConfig = pgTable('n8n_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  webhookUrl: text('webhook_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_n8n_tenant_unique').on(table.tenantId),
}));

// Google Calendar Configuration Table
export const googleCalendarConfig = pgTable('google_calendar_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_google_calendar_tenant_unique').on(table.tenantId),
}));

// Redis Configuration Table
export const redisConfig = pgTable('redis_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  redisUrl: text('redis_url').notNull(),
  redisToken: text('redis_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_redis_tenant_unique').on(table.tenantId),
}));

// Sentry Configuration Table
export const sentryConfig = pgTable('sentry_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  dsn: text('dsn').notNull(),
  authToken: text('auth_token'),
  organization: text('organization'),
  project: text('project'),
  environment: text('environment').default('production'),
  tracesSampleRate: text('traces_sample_rate').default('0.1'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_sentry_tenant_unique').on(table.tenantId),
}));

// Resend Configuration Table
export const resendConfig = pgTable('resend_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  apiKey: text('api_key').notNull(),
  fromEmail: text('from_email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_resend_tenant_unique').on(table.tenantId),
}));

// Cloudflare Configuration Table
export const cloudflareConfig = pgTable('cloudflare_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  zoneId: text('zone_id').notNull(),
  apiToken: text('api_token').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_cloudflare_tenant_unique').on(table.tenantId),
}));

// Better Stack Configuration Table
export const betterStackConfig = pgTable('better_stack_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  sourceToken: text('source_token').notNull(),
  ingestingHost: text('ingesting_host').default('in.logs.betterstack.com'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_better_stack_tenant_unique').on(table.tenantId),
}));

// BigDataCorp Configuration Table (CPF Consultation)
export const bigdatacorpConfig = pgTable('bigdatacorp_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  tokenId: text('token_id').notNull(),
  chaveToken: text('chave_token').notNull(),
  supabaseMasterUrl: text('supabase_master_url'),
  supabaseMasterServiceRoleKey: text('supabase_master_service_role_key'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_bigdatacorp_tenant_unique').on(table.tenantId),
}));

// Supabase Master Configuration Table (Centralized CPF Cache)
export const supabaseMasterConfig = pgTable('supabase_master_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  supabaseMasterUrl: text('supabase_master_url').notNull(),
  supabaseMasterServiceRoleKey: text('supabase_master_service_role_key').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_supabase_master_tenant_unique').on(table.tenantId),
}));

// Evolution API Configuration Table (WhatsApp)
export const evolutionApiConfig = pgTable('evolution_api_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  apiUrl: text('api_url').notNull(),
  apiKey: text('api_key').notNull(),
  instance: text('instance').default('nexus-whatsapp'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_evolution_api_tenant_unique').on(table.tenantId),
}));

// Compliance Audit Log Table
export const complianceAuditLog = pgTable('compliance_audit_log', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  targetCpf: varchar('target_cpf', { length: 14 }),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_compliance_audit_log_tenant').on(table.tenantId),
  userTenantIdx: index('idx_compliance_audit_log_user_tenant').on(table.userId, table.tenantId),
}));

// ========================================
// TABELAS DE ASSINATURA DIGITAL (INTEGRADAS)
// ========================================

// Users table para assinatura digital
export const signatureUsers = pgTable("signature_users", {
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

// Contracts table - Tabela principal de contratos
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
  face_match_score: numeric("face_match_score", { precision: 5, scale: 2 }),
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

// Signature Logs - Auditoria de assinaturas
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

// Audit Trail - Trilha de auditoria completa
export const auditTrail = pgTable("audit_trail", {
  id: uuid("id").defaultRandom().primaryKey(),
  contract_id: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

// ========================================
// ZOD SCHEMAS DE VALIDAÇÃO (ASSINATURA)
// ========================================

const optionalUrlOrEmpty = z.string().optional().or(z.literal("")).refine(
  (val) => !val || val === "" || z.string().url().safeParse(val).success,
  { message: "Deve ser uma URL válida ou vazio" }
);

const optionalColorOrEmpty = z.string().optional().or(z.literal("")).refine(
  (val) => !val || val === "" || /^#[0-9A-Fa-f]{3,6}$/.test(val),
  { message: "Deve ser uma cor hex válida (#RGB ou #RRGGBB) ou vazio" }
);

export const insertContractSchema = z.object({
  client_name: z.string().min(1, "Nome é obrigatório"),
  client_cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 11, "CPF deve ter exatamente 11 dígitos"),
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
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
