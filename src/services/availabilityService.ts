import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { doctorService } from './doctorService';

class AvailabilityService {
  async createSlot(doctorId: string, userId: string, data: any): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Verify doctor ownership
      const doctor = await doctorService.getDoctorById(doctorId);
      if (doctor.user_id !== userId) {
        throw new AppError('Unauthorized', 403);
      }
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO availability_slots (id, doctor_id, day_of_week, start_time, end_time, timezone, is_recurring, valid_from, valid_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          uuidv4(),
          doctorId,
          data.dayOfWeek,
          data.startTime,
          data.endTime,
          data.timezone || 'Asia/Kolkata',
          data.isRecurring !== undefined ? data.isRecurring : true,
          data.validFrom || null,
          data.validUntil || null,
        ]
      );
      
      await client.query('COMMIT');
      
      logger.info(`Availability slot created: ${result.rows[0].id}`);
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Slot creation error:', error);
      throw new AppError('Failed to create availability slot', 500);
    } finally {
      client.release();
    }
  }
  
  async getSlotsByDoctor(doctorId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM availability_slots
       WHERE doctor_id = $1
       ORDER BY day_of_week, start_time`,
      [doctorId]
    );
    
    return result.rows;
  }
  
  async getAvailableSlots(doctorId: string, date: string): Promise<any[]> {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    
    // Get recurring slots for this day
    const slotsResult = await pool.query(
      `SELECT * FROM availability_slots
       WHERE doctor_id = $1
       AND day_of_week = $2
       AND is_recurring = true
       AND (valid_from IS NULL OR valid_from <= $3)
       AND (valid_until IS NULL OR valid_until >= $3)`,
      [doctorId, dayOfWeek, date]
    );
    
    // Filter out booked slots
    // This is a simplified check - in production, you'd need more complex logic
    // to check if specific time slots are booked
    // Future: Check against existing consultations to filter out booked slots
    const availableSlots = slotsResult.rows;
    
    return availableSlots;
  }
  
  async deleteSlot(slotId: string, doctorId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Verify doctor ownership
      const doctor = await doctorService.getDoctorById(doctorId);
      if (doctor.user_id !== userId) {
        throw new AppError('Unauthorized', 403);
      }
      
      await client.query('BEGIN');
      
      const result = await client.query(
        'DELETE FROM availability_slots WHERE id = $1 AND doctor_id = $2',
        [slotId, doctorId]
      );
      
      if (result.rowCount === 0) {
        throw new AppError('Slot not found', 404);
      }
      
      await client.query('COMMIT');
      
      logger.info(`Availability slot deleted: ${slotId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Slot deletion error:', error);
      throw new AppError('Failed to delete availability slot', 500);
    } finally {
      client.release();
    }
  }
}

export const availabilityService = new AvailabilityService();


