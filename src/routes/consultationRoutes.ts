import { Router } from 'express';
import * as consultationController from '../controllers/consultationController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validator';

const router = Router();

/**
 * @swagger
 * /consultations:
 *   post:
 *     summary: Book a consultation
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - scheduledAt
 *             properties:
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               consultationType:
 *                 type: string
 *                 enum: [video, audio, chat, in_person]
 *                 default: video
 *               symptoms:
 *                 type: string
 *     responses:
 *       201:
 *         description: Consultation booked successfully
 *       400:
 *         description: Validation error or slot unavailable
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Time slot already booked
 */
router.post('/', authenticate, validate(schemas.bookConsultation), consultationController.bookConsultation);

/**
 * @swagger
 * /consultations:
 *   get:
 *     summary: Get user consultations
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of consultations
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, consultationController.getConsultations);

/**
 * @swagger
 * /consultations/{id}:
 *   get:
 *     summary: Get consultation by ID
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Consultation details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Consultation not found
 */
router.get('/:id', authenticate, consultationController.getConsultation);

/**
 * @swagger
 * /consultations/{id}:
 *   put:
 *     summary: Update consultation
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show]
 *               symptoms:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Consultation updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put('/:id', authenticate, validate(schemas.updateConsultation), consultationController.updateConsultation);

/**
 * @swagger
 * /consultations/{id}/cancel:
 *   post:
 *     summary: Cancel consultation
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Consultation cancelled successfully
 *       400:
 *         description: Cannot cancel consultation in current status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/:id/cancel', authenticate, consultationController.cancelConsultation);

export default router;


