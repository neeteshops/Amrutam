import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';
import { consultationService } from './consultationService';

class PrescriptionService {
  async createPrescription(doctorId: string, userId: string, data: any, ipAddress?: string, userAgent?: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Verify consultation exists and belongs to this doctor
      const consultation = await consultationService.getConsultationById(data.consultationId, userId, 'doctor');
      
      if (consultation.doctor_id !== doctorId) {
        throw new AppError('Unauthorized', 403);
      }
      
      if (consultation.status !== 'completed') {
        throw new AppError('Can only create prescription for completed consultations', 400);
      }
      
      await client.query('BEGIN');
      
      // Deactivate previous prescriptions for this consultation
      await client.query(
        'UPDATE prescriptions SET is_active = false WHERE consultation_id = $1',
        [data.consultationId]
      );
      
      // Create new prescription
      const result = await client.query(
        `INSERT INTO prescriptions (id, consultation_id, doctor_id, patient_id, medications, instructions, follow_up_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          uuidv4(),
          data.consultationId,
          doctorId,
          consultation.patient_id,
          JSON.stringify(data.medications),
          data.instructions || null,
          data.followUpDate || null,
        ]
      );
      
      await client.query('COMMIT');
      
      const prescription = result.rows[0];
      
      // Audit log
      await auditService.log({
        userId,
        action: 'prescription_created',
        resourceType: 'prescription',
        resourceId: prescription.id,
        details: { consultationId: data.consultationId },
        ipAddress,
        userAgent,
      });
      
      logger.info(`Prescription created: ${prescription.id}`);
      
      return prescription;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Prescription creation error:', error);
      throw new AppError('Failed to create prescription', 500);
    } finally {
      client.release();
    }
  }
  
  async getPrescriptionById(prescriptionId: string, userId: string, userRole: string): Promise<any> {
    const result = await pool.query(
      `SELECT p.*, c.scheduled_at, c.status as consultation_status,
              d.specialization,
              u_d.email as doctor_email, p_d.first_name as doctor_first_name, p_d.last_name as doctor_last_name
       FROM prescriptions p
       JOIN consultations c ON p.consultation_id = c.id
       JOIN doctors d ON p.doctor_id = d.id
       JOIN users u_d ON d.user_id = u_d.id
       LEFT JOIN profiles p_d ON u_d.id = p_d.user_id
       WHERE p.id = $1`,
      [prescriptionId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Prescription not found', 404);
    }
    
    const prescription = result.rows[0];
    
    // Check authorization
    if (userRole !== 'admin' && prescription.patient_id !== userId && prescription.doctor_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }
    
    return {
      ...prescription,
      medications: typeof prescription.medications === 'string' 
        ? JSON.parse(prescription.medications) 
        : prescription.medications,
    };
  }
  
  async getPrescriptionsByUser(userId: string, userRole: string, filters: any = {}): Promise<any[]> {
    let query = `
      SELECT p.*, c.scheduled_at,
             d.specialization,
             u_d.email as doctor_email, p_d.first_name as doctor_first_name, p_d.last_name as doctor_last_name
      FROM prescriptions p
      JOIN consultations c ON p.consultation_id = c.id
      JOIN doctors d ON p.doctor_id = d.id
      JOIN users u_d ON d.user_id = u_d.id
      LEFT JOIN profiles p_d ON u_d.id = p_d.user_id
      WHERE p.is_active = true
    `;
    
    const values: any[] = [];
    let paramCount = 1;
    
    if (userRole === 'patient') {
      query += ` AND p.patient_id = $${paramCount++}`;
      values.push(userId);
    } else if (userRole === 'doctor') {
      query += ` AND p.doctor_id = $${paramCount++}`;
      values.push(userId);
    }
    
    query += ` ORDER BY c.scheduled_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(filters.limit || 50, filters.offset || 0);
    
    const result = await pool.query(query, values);
    
    return result.rows.map((row) => ({
      ...row,
      medications: typeof row.medications === 'string' 
        ? JSON.parse(row.medications) 
        : row.medications,
    }));
  }
}

export const prescriptionService = new PrescriptionService();


