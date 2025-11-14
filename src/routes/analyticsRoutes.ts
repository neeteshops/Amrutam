import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 totalDoctors:
 *                   type: integer
 *                 totalConsultations:
 *                   type: integer
 *                 activeConsultations:
 *                   type: integer
 *                 totalRevenue:
 *                   type: number
 *                 consultationsByStatus:
 *                   type: array
 *                 consultationsBySpecialization:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/dashboard', authenticate, authorize('admin'), analyticsController.getDashboardStats);

/**
 * @swagger
 * /analytics/consultations/trends:
 *   get:
 *     summary: Get consultation trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Consultation trends data
 *       400:
 *         description: startDate and endDate are required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/consultations/trends', authenticate, authorize('admin'), analyticsController.getConsultationTrends);

/**
 * @swagger
 * /analytics/revenue/trends:
 *   get:
 *     summary: Get revenue trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Revenue trends data
 *       400:
 *         description: startDate and endDate are required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/revenue/trends', authenticate, authorize('admin'), analyticsController.getRevenueTrends);

/**
 * @swagger
 * /analytics/doctors/top:
 *   get:
 *     summary: Get top doctors
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of top doctors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/doctors/top', authenticate, authorize('admin'), analyticsController.getTopDoctors);

export default router;


