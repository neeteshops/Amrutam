import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';
import { doctorService } from './doctorService';

class ConsultationService {
  async bookConsultation(patientId: string, data: any, ipAddress?: string, userAgent?: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify doctor exists and is available
      const doctor = await doctorService.getDoctorById(data.doctorId);
      if (!doctor.is_available) {
        throw new AppError('Doctor is not available for consultations', 400);
      }
      
      // Check if slot is already booked (simplified - in production, check exact time)
      const existingConsultation = await client.query(
        `SELECT id FROM consultations
         WHERE doctor_id = $1
         AND scheduled_at = $2
         AND status IN ('scheduled', 'confirmed', 'in_progress')`,
        [data.doctorId, data.scheduledAt]
      );
      
      if (existingConsultation.rows.length > 0) {
        throw new AppError('Time slot is already booked', 409);
      }
      
      // Create consultation
      const result = await client.query(
        `INSERT INTO consultations (id, patient_id, doctor_id, scheduled_at, status, consultation_type, symptoms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          uuidv4(),
          patientId,
          data.doctorId,
          data.scheduledAt,
          'scheduled',
          data.consultationType || 'video',
          data.symptoms || null,
        ]
      );
      
      // Create payment record
      await client.query(
        `INSERT INTO payments (id, consultation_id, patient_id, doctor_id, amount, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          result.rows[0].id,
          patientId,
          data.doctorId,
          doctor.consultation_fee,
          'pending',
        ]
      );
      
      await client.query('COMMIT');
      
      const consultation = result.rows[0];
      
      // Audit log
      await auditService.log({
        userId: patientId,
        action: 'consultation_booked',
        resourceType: 'consultation',
        resourceId: consultation.id,
        details: { doctorId: data.doctorId, scheduledAt: data.scheduledAt },
        ipAddress,
        userAgent,
      });
      
      logger.info(`Consultation booked: ${consultation.id}`);
      
      return consultation;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Consultation booking error:', error);
      throw new AppError('Failed to book consultation', 500);
    } finally {
      client.release();
    }
  }
  
  async getConsultationById(consultationId: string, userId: string, userRole: string): Promise<any> {
    const result = await pool.query(
      `SELECT c.*, 
              d.specialization, d.consultation_fee,
              u_p.email as patient_email, p_p.first_name as patient_first_name, p_p.last_name as patient_last_name,
              u_d.email as doctor_email, p_d.first_name as doctor_first_name, p_d.last_name as doctor_last_name
       FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id
       JOIN users u_p ON c.patient_id = u_p.id
       LEFT JOIN profiles p_p ON u_p.id = p_p.user_id
       JOIN users u_d ON d.user_id = u_d.id
       LEFT JOIN profiles p_d ON u_d.id = p_d.user_id
       WHERE c.id = $1`,
      [consultationId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Consultation not found', 404);
    }
    
    const consultation = result.rows[0];
    
    // Check authorization
    if (userRole !== 'admin' && consultation.patient_id !== userId && consultation.doctor_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }
    
    return consultation;
  }
  
  async getConsultationsByUser(userId: string, userRole: string, filters: any = {}): Promise<any[]> {
    let query = `
      SELECT c.*, 
             d.specialization,
             u_p.email as patient_email, p_p.first_name as patient_first_name, p_p.last_name as patient_last_name,
             u_d.email as doctor_email, p_d.first_name as doctor_first_name, p_d.last_name as doctor_last_name
      FROM consultations c
      JOIN doctors d ON c.doctor_id = d.id
      JOIN users u_p ON c.patient_id = u_p.id
      LEFT JOIN profiles p_p ON u_p.id = p_p.user_id
      JOIN users u_d ON d.user_id = u_d.id
      LEFT JOIN profiles p_d ON u_d.id = p_d.user_id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;
    
    if (userRole === 'patient') {
      query += ` AND c.patient_id = $${paramCount++}`;
      values.push(userId);
    } else if (userRole === 'doctor') {
      query += ` AND c.doctor_id = $${paramCount++}`;
      values.push(userId);
    }
    
    if (filters.status) {
      query += ` AND c.status = $${paramCount++}`;
      values.push(filters.status);
    }
    
    query += ` ORDER BY c.scheduled_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(filters.limit || 50, filters.offset || 0);
    
    const result = await pool.query(query, values);
    
    return result.rows;
  }
  
  async updateConsultation(consultationId: string, userId: string, userRole: string, data: any, ipAddress?: string, userAgent?: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      await this.getConsultationById(consultationId, userId, userRole); // Verify authorization
      
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(data.status);
        
        if (data.status === 'in_progress') {
          updateFields.push(`started_at = CURRENT_TIMESTAMP`);
        } else if (data.status === 'completed') {
          updateFields.push(`ended_at = CURRENT_TIMESTAMP`);
        }
      }
      
      if (data.symptoms !== undefined) {
        updateFields.push(`symptoms = $${paramCount++}`);
        values.push(data.symptoms);
      }
      
      if (data.diagnosis !== undefined) {
        updateFields.push(`diagnosis = $${paramCount++}`);
        values.push(data.diagnosis);
      }
      
      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramCount++}`);
        values.push(data.notes);
      }
      
      if (updateFields.length > 0) {
        values.push(consultationId);
        await client.query(
          `UPDATE consultations SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          values
        );
      }
      
      await client.query('COMMIT');
      
      // Audit log
      await auditService.log({
        userId,
        action: 'consultation_updated',
        resourceType: 'consultation',
        resourceId: consultationId,
        details: data,
        ipAddress,
        userAgent,
      });
      
      return await this.getConsultationById(consultationId, userId, userRole);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Consultation update error:', error);
      throw new AppError('Failed to update consultation', 500);
    } finally {
      client.release();
    }
  }
  
  async cancelConsultation(consultationId: string, userId: string, userRole: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const consultation = await this.getConsultationById(consultationId, userId, userRole);
    
    if (consultation.status === 'completed' || consultation.status === 'cancelled') {
      throw new AppError('Cannot cancel consultation in current status', 400);
    }
    
    await this.updateConsultation(consultationId, userId, userRole, { status: 'cancelled' }, ipAddress, userAgent);
    
    // Update payment status
    await pool.query(
      'UPDATE payments SET status = $1 WHERE consultation_id = $2',
      ['refunded', consultationId]
    );
  }
}

export const consultationService = new ConsultationService();


