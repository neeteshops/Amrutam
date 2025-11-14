import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';
import { asyncHandler } from '../middleware/errorHandler';

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const stats = await analyticsService.getDashboardStats(req.user.id);
  res.json(stats);
});

export const getConsultationTrends = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }
  
  const trends = await analyticsService.getConsultationTrends(
    startDate as string,
    endDate as string
  );
  res.json({ trends });
});

export const getRevenueTrends = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }
  
  const trends = await analyticsService.getRevenueTrends(
    startDate as string,
    endDate as string
  );
  res.json({ trends });
});

export const getTopDoctors = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const limit = parseInt(req.query.limit as string || '10', 10);
  const doctors = await analyticsService.getTopDoctors(limit);
  res.json({ doctors });
});


