import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { consultationService } from '../services/consultationService';
import { asyncHandler } from '../middleware/errorHandler';

export const bookConsultation = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const consultation = await consultationService.bookConsultation(
    req.user.id,
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  res.status(201).json({
    message: 'Consultation booked successfully',
    consultation,
  });
});

export const getConsultation = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const consultation = await consultationService.getConsultationById(
    req.params.id,
    req.user.id,
    req.user.role
  );
  
  res.json(consultation);
});

export const getConsultations = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const consultations = await consultationService.getConsultationsByUser(
    req.user.id,
    req.user.role,
    req.query
  );
  
  res.json({ consultations });
});

export const updateConsultation = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const consultation = await consultationService.updateConsultation(
    req.params.id,
    req.user.id,
    req.user.role,
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  res.json({
    message: 'Consultation updated successfully',
    consultation,
  });
});

export const cancelConsultation = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  await consultationService.cancelConsultation(
    req.params.id,
    req.user.id,
    req.user.role,
    req.ip,
    req.get('user-agent')
  );
  
  res.json({ message: 'Consultation cancelled successfully' });
});


