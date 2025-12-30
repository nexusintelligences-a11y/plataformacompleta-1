/**
 * Middleware para validar tenantId em todas as rotas protegidas
 * 
 * 🔐 SEGURANÇA: Cada rota protegida DEVE ter tenantId válido
 * ❌ Sem tenantId = 401 Unauthorized
 * ✅ Com tenantId = acesso permitido
 */

import { Request, Response, NextFunction } from 'express';

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  // Buscar tenantId da sessão (setado durante login)
  const tenantId = req.session?.tenantId;
  
  // Em desenvolvimento, usar tenant ID fixo se não houver sessão
  if (process.env.NODE_ENV === 'development' && (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '')) {
    req.session.tenantId = 'f5d8c8d9-7c9e-4b8a-9c7d-4e3b8a9c7d4e';
    return next();
  }
  
  // Validar se tenantId existe e é válido
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    return res.status(401).json({
      success: false,
      error: 'Sessão inválida - faça login novamente',
      code: 'TENANT_ID_MISSING',
      redirect: '/login'
    });
  }
  
  // tenantId válido - continuar
  next();
}

/**
 * Middleware para validar tenantId e verificar se existe no banco
 * Versão mais robusta com verificação de existência
 */
export async function requireTenantStrict(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.session?.tenantId;
  
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    return res.status(401).json({
      success: false,
      error: 'Sessão inválida - faça login novamente',
      code: 'TENANT_ID_MISSING',
      redirect: '/login'
    });
  }
  
  // Opcional: Verificar se tenant existe no banco
  // Isso previne acesso com tenantId inválido
  try {
    const { db } = await import('../db');
    const { supabaseConfig } = await import('../../shared/db-schema');
    const { eq } = await import('drizzle-orm');
    
    const tenant = await db.select()
      .from(supabaseConfig)
      .where(eq(supabaseConfig.tenantId, tenantId))
      .limit(1);
    
    if (tenant.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Tenant inválido ou não configurado',
        code: 'TENANT_INVALID',
        redirect: '/configuracoes'
      });
    }
  } catch (error) {
    console.error('Erro ao verificar tenant:', error);
    // Se erro na verificação, permitir acesso (graceful degradation)
  }
  
  next();
}
