import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    clientId: string;
    tenantId: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    const sessionTenantId = req.session?.tenantId;
    const sessionUserId = req.session?.userId;
    const sessionEmail = req.session?.userEmail;
    
    if (sessionTenantId && sessionUserId) {
      req.user = {
        userId: sessionUserId,
        email: sessionEmail || 'dev@example.com',
        clientId: sessionTenantId,
        tenantId: sessionTenantId
      };
      return next();
    }
    
    const tempTenantId = `dev-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.warn('⚠️ [DEV] Sem sessão - criando tenant temporário:', tempTenantId);
    console.warn('💡 [DEV] Faça login para ter tenant persistente');
    
    req.user = {
      userId: tempTenantId,
      email: 'dev-temp@example.com',
      clientId: tempTenantId,
      tenantId: tempTenantId
    };
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' 
      ? (() => { throw new Error('JWT_SECRET is required in production'); })()
      : 'demo-secret-key-for-development-only');
    
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
      clientId: string;
      tenantId: string;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}
