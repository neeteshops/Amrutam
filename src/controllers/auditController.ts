import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { auditService } from '../services/auditService';
import { asyncHandler } from '../middleware/errorHandler';

export const getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const logs = await auditService.getLogs(req.query);
  res.json({ logs });
});


