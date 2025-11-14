import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import logger from '../utils/logger';

export interface AuditLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          data.userId || null,
          data.action,
          data.resourceType,
          data.resourceId || null,
          data.details ? JSON.stringify(data.details) : null,
          data.ipAddress || null,
          data.userAgent || null,
        ]
      );
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      logger.error('Audit log error:', error);
    }
  }
  
  async getLogs(filters: any = {}): Promise<any[]> {
    let query = `
      SELECT al.*, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;
    
    if (filters.userId) {
      query += ` AND al.user_id = $${paramCount++}`;
      values.push(filters.userId);
    }
    
    if (filters.action) {
      query += ` AND al.action = $${paramCount++}`;
      values.push(filters.action);
    }
    
    if (filters.resourceType) {
      query += ` AND al.resource_type = $${paramCount++}`;
      values.push(filters.resourceType);
    }
    
    if (filters.startDate) {
      query += ` AND al.created_at >= $${paramCount++}`;
      values.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ` AND al.created_at <= $${paramCount++}`;
      values.push(filters.endDate);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(filters.limit || 100, filters.offset || 0);
    
    const result = await pool.query(query, values);
    
    return result.rows.map((row) => ({
      ...row,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
    }));
  }
}

export const auditService = new AuditService();


