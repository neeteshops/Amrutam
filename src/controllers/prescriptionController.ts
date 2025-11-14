import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prescriptionService } from '../services/prescriptionService';
import { asyncHandler } from '../middleware/errorHandler';

export const createPrescription = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  // Get doctor ID from user
  const { doctorService } = await import('../services/doctorService');
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  
  const prescription = await prescriptionService.createPrescription(
    doctor.id,
    req.user.id,
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  res.status(201).json({
    message: 'Prescription created successfully',
    prescription,
  });
});

export const getPrescription = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const prescription = await prescriptionService.getPrescriptionById(
    req.params.id,
    req.user.id,
    req.user.role
  );
  
  res.json(prescription);
});

export const getPrescriptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const prescriptions = await prescriptionService.getPrescriptionsByUser(
    req.user.id,
    req.user.role,
    req.query
  );
  
  res.json({ prescriptions });
});


