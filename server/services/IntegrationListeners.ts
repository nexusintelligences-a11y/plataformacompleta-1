import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import NotificationService from './NotificationService';
import { db } from '../db';
import { googleCalendarWebhooks, pluggyConnections, googleTokens } from '../../shared/db-schema.js';
import { eq, and } from 'drizzle-orm';
import { log } from '../vite';

class IntegrationListeners {
  private supabaseClient: any = null;
  private setupComplete: boolean = false;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    try {
      // PRIORIDADE 1: Environment variables (SYSTEM-LEVEL - sem tenant)
      let supabaseUrl: string | null = null;
      let supabaseKey: string | null = null;
      
      try {
        const { getSupabaseCredentialsFromEnv } = await import('../lib/credentialsDb.js');
        const credentials = await getSupabaseCredentialsFromEnv();
        if (credentials && credentials.url && credentials.anonKey) {
          supabaseUrl = credentials.url;
          supabaseKey = credentials.anonKey;
          log('✅ Usando credenciais de environment variables para listeners (system-level)');
        }
      } catch (error) {
        log(`⚠️ Erro ao buscar credenciais de environment variables: ${error}`);
      }
      
      // PRIORIDADE 2: Variáveis de ambiente (Secrets) - Fallback
      if (!supabaseUrl || !supabaseKey) {
        supabaseUrl = process.env.REACT_APP_SUPABASE_URL || null;
        supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || null;
        if (supabaseUrl && supabaseKey) {
          log('✅ Usando credenciais dos Secrets (fallback) para listeners');
        }
      }

      if (supabaseUrl && supabaseKey) {
        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
        log('✅ Supabase client inicializado para listeners');
      } else {
        log('ℹ️  Supabase não configurado - listeners não ativos');
      }
    } catch (error) {
      log(`⚠️  Erro ao inicializar Supabase client: ${error}`);
    }
  }

  // ============ SUPABASE LISTENERS ============
  
  async setupSupabaseListeners(userId: string, tenantId: string) {
    if (!this.supabaseClient) {
      log('⚠️  Supabase não configurado');
      return;
    }

    try {
      // Exemplo: Monitorar workspace pages
      const channel = this.supabaseClient
        .channel('workspace_changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'pages' 
          }, 
          (payload: any) => this.handlePageInsert(userId, tenantId, payload)
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'databases' 
          }, 
          (payload: any) => this.handleDatabaseInsert(userId, tenantId, payload)
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'boards' 
          }, 
          (payload: any) => this.handleBoardInsert(userId, tenantId, payload)
        )
        .subscribe();

      log(`✅ [TENANT:${tenantId}] Supabase listeners configurados para workspace`);
      this.setupComplete = true;
    } catch (error) {
      log(`❌ Erro ao configurar Supabase listeners: ${error}`);
    }
  }

  private async handlePageInsert(userId: string, tenantId: string, payload: any) {
    log(`📄 [TENANT:${tenantId}] Nova página criada:`, payload.new);

    await NotificationService.sendNotification(userId, tenantId, {
      type: 'SUPABASE_NEW_DATA',
      title: '📄 Nova Página Criada',
      body: `Uma nova página foi criada: ${payload.new.title || 'Sem título'}`,
      data: {
        table: 'pages',
        record_id: payload.new.id,
        action: 'insert',
        url: `/workspace/pages/${payload.new.id}`
      }
    });
  }

  private async handleDatabaseInsert(userId: string, tenantId: string, payload: any) {
    log(`📊 [TENANT:${tenantId}] Novo database criado:`, payload.new);

    await NotificationService.sendNotification(userId, tenantId, {
      type: 'SUPABASE_NEW_DATA',
      title: '📊 Novo Database Criado',
      body: `Um novo database foi criado: ${payload.new.name || 'Sem nome'}`,
      data: {
        table: 'databases',
        record_id: payload.new.id,
        action: 'insert',
        url: `/workspace/databases/${payload.new.id}`
      }
    });
  }

  private async handleBoardInsert(userId: string, tenantId: string, payload: any) {
    log(`📋 [TENANT:${tenantId}] Novo board criado:`, payload.new);

    await NotificationService.sendNotification(userId, tenantId, {
      type: 'SUPABASE_NEW_DATA',
      title: '📋 Novo Board Criado',
      body: `Um novo board foi criado: ${payload.new.name || 'Sem nome'}`,
      data: {
        table: 'boards',
        record_id: payload.new.id,
        action: 'insert',
        url: `/workspace/boards/${payload.new.id}`
      }
    });
  }

  // ============ GOOGLE CALENDAR INTEGRATION ============

  async setupGoogleCalendarWebhook(userId: string, tenantId: string, calendarId: string = 'primary') {
    try {
      const oauth2Client = await this.getGoogleOAuthClient(userId, tenantId);
      if (!oauth2Client) {
        log('⚠️  Google OAuth não configurado para usuário');
        return;
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Configurar webhook - MULTI-TENANT: incluir tenantId no token
      const channelId = `tenant_${tenantId}_user_${userId}_${Date.now()}`;
      const apiUrl = process.env.API_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      
      const webhook = await calendar.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: `${apiUrl}/api/notifications/webhooks/google-calendar`,
          token: `${tenantId}:${userId}`,
          expiration: (Date.now() + (7 * 24 * 60 * 60 * 1000)).toString()
        }
      });

      // MULTI-TENANT: Salvar webhook com tenantId
      await db.insert(googleCalendarWebhooks).values({
        userId,
        tenantId,
        calendarId,
        channelId,
        resourceId: webhook.data.resourceId!,
        expiration: new Date(parseInt(webhook.data.expiration!))
      });

      log(`✅ [TENANT:${tenantId}] Google Calendar webhook configurado para usuário: ${userId}`);
      return webhook.data;
    } catch (error) {
      log(`❌ Erro ao configurar Google Calendar webhook: ${error}`);
      throw error;
    }
  }

  async handleGoogleCalendarWebhook(channelId: string, resourceId: string) {
    try {
      // MULTI-TENANT: Buscar webhook com tenantId
      const [webhook] = await db.select()
        .from(googleCalendarWebhooks)
        .where(eq(googleCalendarWebhooks.channelId, channelId));

      if (!webhook) {
        log('⚠️  Webhook não encontrado');
        return;
      }

      const oauth2Client = await this.getGoogleOAuthClient(webhook.userId, webhook.tenantId);
      if (!oauth2Client) return;

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Buscar eventos próximos (nas próximas 24h)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const events = await calendar.events.list({
        calendarId: webhook.calendarId,
        timeMin: now.toISOString(),
        timeMax: tomorrow.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      });

      // MULTI-TENANT: Processar eventos e incluir tenantId ao enviar notificação
      for (const event of events.data.items || []) {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        
        await NotificationService.sendNotification(webhook.userId, webhook.tenantId, {
          type: 'GOOGLE_CALENDAR_EVENT',
          title: '📅 Evento Próximo',
          body: `${event.summary} - ${this.formatEventTime(eventStart)}`,
          data: {
            event_id: event.id,
            event_title: event.summary,
            event_start: eventStart.toISOString(),
            calendar_id: webhook.calendarId,
            url: '/calendario'
          }
        });
      }

      log(`✅ [TENANT:${webhook.tenantId}] Google Calendar webhook processado com sucesso`);
    } catch (error) {
      log(`❌ Erro ao processar webhook do Google Calendar: ${error}`);
    }
  }

  // ============ PLUGGY INTEGRATION ============

  async handlePluggyWebhook(event: any) {
    try {
      log(`💰 Evento Pluggy recebido: ${event.event}`);

      // MULTI-TENANT: Buscar conexão com tenantId
      const [connection] = await db.select()
        .from(pluggyConnections)
        .where(eq(pluggyConnections.itemId, event.data?.itemId));

      if (!connection) {
        log('⚠️  Conexão Pluggy não encontrada');
        return;
      }

      let notificationData;

      switch (event.event) {
        case 'transaction/created':
          notificationData = {
            type: 'PLUGGY_UPDATE' as const,
            title: '💰 Nova Transação',
            body: `${event.data.description || 'Transação'} - ${this.formatCurrency(event.data.amount)}`,
            data: {
              transaction_id: event.data.id,
              amount: event.data.amount,
              description: event.data.description,
              date: event.data.date,
              url: '/faturamento'
            }
          };
          break;

        case 'account/updated':
          notificationData = {
            type: 'PLUGGY_UPDATE' as const,
            title: '🔄 Conta Atualizada',
            body: 'Suas informações financeiras foram atualizadas',
            data: {
              account_id: event.data.id,
              balance: event.data.balance,
              url: '/faturamento'
            }
          };
          break;

        case 'item/error':
          notificationData = {
            type: 'SYSTEM_ALERT' as const,
            title: '⚠️ Erro de Conexão Bancária',
            body: 'Há um problema com sua conexão bancária. Verifique suas credenciais.',
            data: {
              item_id: event.data.itemId,
              error: event.data.error,
              url: '/faturamento'
            }
          };
          break;

        default:
          return;
      }

      // MULTI-TENANT: Incluir tenantId ao enviar notificação
      await NotificationService.sendNotification(connection.userId, connection.tenantId, notificationData);
      
      log(`✅ [TENANT:${connection.tenantId}] Pluggy webhook processado com sucesso`);
    } catch (error) {
      log(`❌ Erro ao processar webhook do Pluggy: ${error}`);
    }
  }

  // ============ HELPERS ============

  private formatEventTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  private async getGoogleOAuthClient(userId: string, tenantId: string) {
    try {
      // MULTI-TENANT: Buscar tokens do usuário com tenantId
      const [tokens] = await db.select()
        .from(googleTokens)
        .where(and(
          eq(googleTokens.userId, userId),
          eq(googleTokens.tenantId, tenantId)
        ));

      if (!tokens) {
        log(`⚠️  [TENANT:${tenantId}] Google tokens não encontrados para usuário ${userId}`);
        return null;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      return oauth2Client;
    } catch (error) {
      log(`❌ Erro ao obter Google OAuth client: ${error}`);
      return null;
    }
  }

  // MULTI-TENANT: Método para registrar conexão Pluggy com tenantId
  async registerPluggyConnection(userId: string, tenantId: string, itemId: string, connectorId?: string, connectorName?: string) {
    try {
      await db.insert(pluggyConnections).values({
        userId,
        tenantId,
        itemId,
        connectorId,
        connectorName
      }).onConflictDoUpdate({
        target: pluggyConnections.itemId,
        set: {
          userId,
          tenantId,
          connectorId,
          connectorName,
          createdAt: new Date()
        }
      });

      log(`✅ [TENANT:${tenantId}] Conexão Pluggy registrada para usuário ${userId}`);
      return { success: true };
    } catch (error) {
      log(`❌ Erro ao registrar conexão Pluggy: ${error}`);
      throw error;
    }
  }

  // MULTI-TENANT: Método para salvar tokens do Google com tenantId
  async saveGoogleTokens(userId: string, tenantId: string, accessToken: string, refreshToken: string, expiresAt?: Date) {
    try {
      await db.insert(googleTokens).values({
        userId,
        tenantId,
        accessToken,
        refreshToken,
        expiresAt
      }).onConflictDoUpdate({
        target: [googleTokens.userId, googleTokens.tenantId],
        set: {
          accessToken,
          refreshToken,
          expiresAt,
          updatedAt: new Date()
        }
      });

      log(`✅ [TENANT:${tenantId}] Google tokens salvos para usuário ${userId}`);
      return { success: true };
    } catch (error) {
      log(`❌ Erro ao salvar Google tokens: ${error}`);
      throw error;
    }
  }
}

// Lazy singleton pattern to avoid blocking module imports
let instance: IntegrationListeners | null = null;

export function getIntegrationListeners(): IntegrationListeners {
  if (!instance) {
    instance = new IntegrationListeners();
  }
  return instance;
}

// Export a proxy object that lazily initializes the instance
export default {
  setupSupabaseListeners: (...args: Parameters<IntegrationListeners['setupSupabaseListeners']>) => getIntegrationListeners().setupSupabaseListeners(...args),
  setupGoogleCalendarWebhook: (...args: Parameters<IntegrationListeners['setupGoogleCalendarWebhook']>) => getIntegrationListeners().setupGoogleCalendarWebhook(...args),
  handleGoogleCalendarWebhook: (...args: Parameters<IntegrationListeners['handleGoogleCalendarWebhook']>) => getIntegrationListeners().handleGoogleCalendarWebhook(...args),
  handlePluggyWebhook: (...args: Parameters<IntegrationListeners['handlePluggyWebhook']>) => getIntegrationListeners().handlePluggyWebhook(...args),
  registerPluggyConnection: (...args: Parameters<IntegrationListeners['registerPluggyConnection']>) => getIntegrationListeners().registerPluggyConnection(...args),
  saveGoogleTokens: (...args: Parameters<IntegrationListeners['saveGoogleTokens']>) => getIntegrationListeners().saveGoogleTokens(...args),
};
