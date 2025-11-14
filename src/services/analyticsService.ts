import pool from '../config/database';
class AnalyticsService {
  async getDashboardStats(_adminId: string): Promise<any> {
    // Verify admin role would be checked in the controller
    
    const [
      totalUsers,
      totalDoctors,
      totalConsultations,
      activeConsultations,
      totalRevenue,
      consultationsByStatus,
      consultationsBySpecialization,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['patient']),
      pool.query('SELECT COUNT(*) as count FROM doctors WHERE is_verified = true'),
      pool.query('SELECT COUNT(*) as count FROM consultations'),
      pool.query("SELECT COUNT(*) as count FROM consultations WHERE status IN ('scheduled', 'confirmed', 'in_progress')"),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"),
      pool.query(`
        SELECT status, COUNT(*) as count
        FROM consultations
        GROUP BY status
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT d.specialization, COUNT(c.id) as count
        FROM consultations c
        JOIN doctors d ON c.doctor_id = d.id
        GROUP BY d.specialization
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);
    
    return {
      totalUsers: parseInt(totalUsers.rows[0].count, 10),
      totalDoctors: parseInt(totalDoctors.rows[0].count, 10),
      totalConsultations: parseInt(totalConsultations.rows[0].count, 10),
      activeConsultations: parseInt(activeConsultations.rows[0].count, 10),
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      consultationsByStatus: consultationsByStatus.rows,
      consultationsBySpecialization: consultationsBySpecialization.rows,
    };
  }
  
  async getConsultationTrends(startDate: string, endDate: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT DATE(scheduled_at) as date, COUNT(*) as count, status
       FROM consultations
       WHERE scheduled_at >= $1 AND scheduled_at <= $2
       GROUP BY DATE(scheduled_at), status
       ORDER BY date, status`,
      [startDate, endDate]
    );
    
    return result.rows;
  }
  
  async getRevenueTrends(startDate: string, endDate: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT DATE(paid_at) as date, SUM(amount) as revenue
       FROM payments
       WHERE status = 'completed'
       AND paid_at >= $1 AND paid_at <= $2
       GROUP BY DATE(paid_at)
       ORDER BY date`,
      [startDate, endDate]
    );
    
    return result.rows;
  }
  
  async getTopDoctors(limit: number = 10): Promise<any[]> {
    const result = await pool.query(
      `SELECT d.id, d.specialization, d.rating, d.total_consultations,
              p.first_name, p.last_name,
              COUNT(c.id) as recent_consultations,
              SUM(pay.amount) as revenue
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN consultations c ON d.id = c.doctor_id
       LEFT JOIN payments pay ON c.id = pay.consultation_id AND pay.status = 'completed'
       WHERE d.is_verified = true
       GROUP BY d.id, d.specialization, d.rating, d.total_consultations, p.first_name, p.last_name
       ORDER BY d.rating DESC, recent_consultations DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  }
}

export const analyticsService = new AnalyticsService();


