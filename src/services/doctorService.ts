import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';

class DoctorService {
  async createDoctor(userId: string, data: any, ipAddress?: string, userAgent?: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if doctor already exists
      const existing = await client.query(
        'SELECT id FROM doctors WHERE user_id = $1',
        [userId]
      );
      
      if (existing.rows.length > 0) {
        throw new AppError('Doctor profile already exists', 409);
      }
      
      // Check license number uniqueness
      const licenseCheck = await client.query(
        'SELECT id FROM doctors WHERE license_number = $1',
        [data.licenseNumber]
      );
      
      if (licenseCheck.rows.length > 0) {
        throw new AppError('License number already registered', 409);
      }
      
      // Create doctor profile
      const result = await client.query(
        `INSERT INTO doctors (id, user_id, license_number, specialization, experience_years, qualification, bio, consultation_fee)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          uuidv4(),
          userId,
          data.licenseNumber,
          data.specialization,
          data.experienceYears || null,
          data.qualification || null,
          data.bio || null,
          data.consultationFee,
        ]
      );
      
      await client.query('COMMIT');
      
      const doctor = result.rows[0];
      
      // Audit log
      await auditService.log({
        userId,
        action: 'doctor_profile_created',
        resourceType: 'doctor',
        resourceId: doctor.id,
        details: { specialization: data.specialization },
        ipAddress,
        userAgent,
      });
      
      logger.info(`Doctor profile created: ${doctor.id}`);
      
      return doctor;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Doctor creation error:', error);
      throw new AppError('Failed to create doctor profile', 500);
    } finally {
      client.release();
    }
  }
  
  async getDoctorById(doctorId: string): Promise<any> {
    const result = await pool.query(
      `SELECT d.*, u.email, p.first_name, p.last_name, p.phone, p.city, p.state
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE d.id = $1`,
      [doctorId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Doctor not found', 404);
    }
    
    return result.rows[0];
  }
  
  async getDoctorByUserId(userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT d.*, u.email, p.first_name, p.last_name, p.phone
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE d.user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Doctor profile not found', 404);
    }
    
    return result.rows[0];
  }
  
  async updateDoctor(doctorId: string, userId: string, data: any, ipAddress?: string, userAgent?: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Verify ownership
      const doctor = await this.getDoctorById(doctorId);
      if (doctor.user_id !== userId) {
        throw new AppError('Unauthorized', 403);
      }
      
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (data.specialization !== undefined) {
        updateFields.push(`specialization = $${paramCount++}`);
        values.push(data.specialization);
      }
      if (data.experienceYears !== undefined) {
        updateFields.push(`experience_years = $${paramCount++}`);
        values.push(data.experienceYears);
      }
      if (data.qualification !== undefined) {
        updateFields.push(`qualification = $${paramCount++}`);
        values.push(data.qualification);
      }
      if (data.bio !== undefined) {
        updateFields.push(`bio = $${paramCount++}`);
        values.push(data.bio);
      }
      if (data.consultationFee !== undefined) {
        updateFields.push(`consultation_fee = $${paramCount++}`);
        values.push(data.consultationFee);
      }
      if (data.isAvailable !== undefined) {
        updateFields.push(`is_available = $${paramCount++}`);
        values.push(data.isAvailable);
      }
      
      if (updateFields.length > 0) {
        values.push(doctorId);
        await client.query(
          `UPDATE doctors SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          values
        );
      }
      
      await client.query('COMMIT');
      
      // Audit log
      await auditService.log({
        userId,
        action: 'doctor_profile_updated',
        resourceType: 'doctor',
        resourceId: doctorId,
        details: data,
        ipAddress,
        userAgent,
      });
      
      return await this.getDoctorById(doctorId);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Doctor update error:', error);
      throw new AppError('Failed to update doctor profile', 500);
    } finally {
      client.release();
    }
  }
  
  async searchDoctors(filters: any): Promise<{ doctors: any[]; total: number }> {
    const { specialization, city, minRating, isAvailable, limit = 20, offset = 0 } = filters;
    
    let query = `
      SELECT d.*, u.email, p.first_name, p.last_name, p.city, p.state,
             COUNT(DISTINCT c.id) as total_consultations
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN consultations c ON d.id = c.doctor_id AND c.status = 'completed'
      WHERE u.is_active = true
    `;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (specialization) {
      conditions.push(`d.specialization = $${paramCount++}`);
      values.push(specialization);
    }
    
    if (city) {
      conditions.push(`p.city = $${paramCount++}`);
      values.push(city);
    }
    
    if (minRating !== undefined) {
      conditions.push(`d.rating >= $${paramCount++}`);
      values.push(minRating);
    }
    
    if (isAvailable !== undefined) {
      conditions.push(`d.is_available = $${paramCount++}`);
      values.push(isAvailable);
    }
    
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }
    
    query += ` GROUP BY d.id, u.email, p.first_name, p.last_name, p.city, p.state`;
    query += ` ORDER BY d.rating DESC, d.total_consultations DESC`;
    
    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT d.id) as total FROM');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Add pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    
    return {
      doctors: result.rows,
      total,
    };
  }
}

export const doctorService = new DoctorService();


