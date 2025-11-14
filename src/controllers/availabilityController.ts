import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { availabilityService } from '../services/availabilityService';
import { asyncHandler } from '../middleware/errorHandler';

export const createSlot = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const slot = await availabilityService.createSlot(
    req.params.doctorId,
    req.user.id,
    req.body
  );
  
  res.status(201).json({
    message: 'Availability slot created successfully',
    slot,
  });
});

export const getSlots = asyncHandler(async (req: AuthRequest, res: Response) => {
  const slots = await availabilityService.getSlotsByDoctor(req.params.doctorId);
  res.json({ slots });
});

export const getAvailableSlots = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'Date parameter is required' });
    return;
  }
  
  const slots = await availabilityService.getAvailableSlots(
    req.params.doctorId,
    date
  );
  
  res.json({ slots });
});

export const deleteSlot = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  await availabilityService.deleteSlot(
    req.params.slotId,
    req.params.doctorId,
    req.user.id
  );
  
  res.json({ message: 'Availability slot deleted successfully' });
});


