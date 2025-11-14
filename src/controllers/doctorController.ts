import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { doctorService } from '../services/doctorService';
import { asyncHandler } from '../middleware/errorHandler';

export const createDoctor = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const doctor = await doctorService.createDoctor(
    req.user.id,
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  res.status(201).json({
    message: 'Doctor profile created successfully',
    doctor,
  });
});

export const getDoctor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const doctor = await doctorService.getDoctorById(req.params.id);
  res.json(doctor);
});

export const getMyDoctorProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  res.json(doctor);
});

export const updateDoctor = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const doctor = await doctorService.updateDoctor(
    req.params.id,
    req.user.id,
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  res.json({
    message: 'Doctor profile updated successfully',
    doctor,
  });
});

export const searchDoctors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await doctorService.searchDoctors(req.query);
  res.json({
    doctors: result.doctors,
    total: result.total,
    limit: parseInt(req.query.limit as string || '20', 10),
    offset: parseInt(req.query.offset as string || '0', 10),
  });
});


