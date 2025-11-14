import pool from '../config/database';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';

class UserService {
  async getProfile(userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.is_active, u.is_email_verified, u.mfa_enabled, u.last_login, u.created_at,
              p.first_name, p.last_name, p.phone, p.date_of_birth, p.gender, p.address, p.city, p.state, p.country, p.pincode
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }
    
    return result.rows[0];
  }
  
  async updateProfile(userId: string, data: any, ipAddress?: string, userAgent?: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update profile
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (data.firstName !== undefined) {
        updateFields.push(`first_name = $${paramCount++}`);
        values.push(data.firstName);
      }
      if (data.lastName !== undefined) {
        updateFields.push(`last_name = $${paramCount++}`);
        values.push(data.lastName);
      }
      if (data.phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(data.phone);
      }
      if (data.dateOfBirth !== undefined) {
        updateFields.push(`date_of_birth = $${paramCount++}`);
        values.push(data.dateOfBirth);
      }
      if (data.gender !== undefined) {
        updateFields.push(`gender = $${paramCount++}`);
        values.push(data.gender);
      }
      if (data.address !== undefined) {
        updateFields.push(`address = $${paramCount++}`);
        values.push(data.address);
      }
      if (data.city !== undefined) {
        updateFields.push(`city = $${paramCount++}`);
        values.push(data.city);
      }
      if (data.state !== undefined) {
        updateFields.push(`state = $${paramCount++}`);
        values.push(data.state);
      }
      if (data.country !== undefined) {
        updateFields.push(`country = $${paramCount++}`);
        values.push(data.country);
      }
      if (data.pincode !== undefined) {
        updateFields.push(`pincode = $${paramCount++}`);
        values.push(data.pincode);
      }
      
      if (updateFields.length > 0) {
        values.push(userId);
        await client.query(
          `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramCount}`,
          values
        );
      }
      
      await client.query('COMMIT');
      
      // Audit log
      await auditService.log({
        userId,
        action: 'profile_updated',
        resourceType: 'profile',
        resourceId: userId,
        details: data,
        ipAddress,
        userAgent,
      });
      
      return await this.getProfile(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Profile update error:', error);
      throw new AppError('Failed to update profile', 500);
    } finally {
      client.release();
    }
  }
  
  async getUserById(userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.is_active, u.created_at,
              p.first_name, p.last_name, p.phone
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }
    
    return result.rows[0];
  }
}

export const userService = new UserService();


