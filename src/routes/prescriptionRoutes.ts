import { Router } from 'express';
import * as prescriptionController from '../controllers/prescriptionController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validator';

const router = Router();

/**
 * @swagger
 * /prescriptions:
 *   post:
 *     summary: Create prescription
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consultationId
 *               - medications
 *             properties:
 *               consultationId:
 *                 type: string
 *                 format: uuid
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - dosage
 *                     - frequency
 *                     - duration
 *                   properties:
 *                     name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *               instructions:
 *                 type: string
 *               followUpDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Prescription created successfully
 *       400:
 *         description: Validation error or consultation not completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Doctor role required
 */
router.post('/', authenticate, authorize('doctor'), validate(schemas.createPrescription), prescriptionController.createPrescription);

/**
 * @swagger
 * /prescriptions:
 *   get:
 *     summary: Get user prescriptions
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of prescriptions
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, prescriptionController.getPrescriptions);

/**
 * @swagger
 * /prescriptions/{id}:
 *   get:
 *     summary: Get prescription by ID
 *     tags: [Prescriptions]
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
 *         description: Prescription details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Prescription not found
 */
router.get('/:id', authenticate, prescriptionController.getPrescription);

export default router;


