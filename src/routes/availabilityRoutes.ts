import { Router } from 'express';
import * as availabilityController from '../controllers/availabilityController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validator';

const router = Router();

/**
 * @swagger
 * /availability/doctors/{doctorId}/slots:
 *   post:
 *     summary: Create availability slot
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
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
 *             required:
 *               - dayOfWeek
 *               - startTime
 *               - endTime
 *             properties:
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: 0=Sunday, 6=Saturday
 *               startTime:
 *                 type: string
 *                 format: time
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 format: time
 *                 example: "17:00"
 *               timezone:
 *                 type: string
 *                 default: "Asia/Kolkata"
 *               isRecurring:
 *                 type: boolean
 *                 default: true
 *               validFrom:
 *                 type: string
 *                 format: date
 *               validUntil:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Availability slot created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Doctor role required
 */
router.post('/doctors/:doctorId/slots', authenticate, authorize('doctor'), validate(schemas.createAvailabilitySlot), availabilityController.createSlot);

/**
 * @swagger
 * /availability/doctors/{doctorId}/slots:
 *   get:
 *     summary: Get all availability slots for a doctor
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of availability slots
 */
router.get('/doctors/:doctorId/slots', availabilityController.getSlots);

/**
 * @swagger
 * /availability/doctors/{doctorId}/available:
 *   get:
 *     summary: Get available slots for a specific date
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of available slots for the date
 *       400:
 *         description: Date parameter is required
 */
router.get('/doctors/:doctorId/available', availabilityController.getAvailableSlots);

/**
 * @swagger
 * /availability/doctors/{doctorId}/slots/{slotId}:
 *   delete:
 *     summary: Delete availability slot
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Slot deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Slot not found
 */
router.delete('/doctors/:doctorId/slots/:slotId', authenticate, authorize('doctor'), availabilityController.deleteSlot);

export default router;


