import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import logger from '../utils/logger';
import { auditService } from '../services/auditService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        email: string;
        role: string;
      };
      
      req.user = decoded;
      next();
    } catch (error) {
      logger.warn('Invalid token:', error);
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.email} for role ${req.user.role}`);
      auditService.log({
        userId: req.user.id,
        action: 'unauthorized_access',
        resourceType: 'api',
        details: { path: req.path, method: req.method },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};

