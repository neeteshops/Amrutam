import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import doctorRoutes from './doctorRoutes';
import availabilityRoutes from './availabilityRoutes';
import consultationRoutes from './consultationRoutes';
import prescriptionRoutes from './prescriptionRoutes';
import analyticsRoutes from './analyticsRoutes';
import auditRoutes from './auditRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/doctors', doctorRoutes);
router.use('/availability', availabilityRoutes);
router.use('/consultations', consultationRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit', auditRoutes);

export default router;


