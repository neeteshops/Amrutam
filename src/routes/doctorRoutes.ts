import { Router } from 'express';
import * as doctorController from '../controllers/doctorController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validator';

const router = Router();

/**
 * @swagger
 * /doctors:
 *   post:
 *     summary: Create doctor profile
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licenseNumber
 *               - specialization
 *               - consultationFee
 *             properties:
 *               licenseNumber:
 *                 type: string
 *               specialization:
 *                 type: string
 *               experienceYears:
 *                 type: integer
 *               qualification:
 *                 type: string
 *               bio:
 *                 type: string
 *               consultationFee:
 *                 type: number
 *     responses:
 *       201:
 *         description: Doctor profile created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Doctor role required
 */
router.post('/', authenticate, authorize('doctor'), validate(schemas.createDoctor), doctorController.createDoctor);

/**
 * @swagger
 * /doctors/search:
 *   get:
 *     summary: Search doctors
 *     tags: [Doctors]
 *     parameters:
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of doctors
 */
router.get('/search', doctorController.searchDoctors);

/**
 * @swagger
 * /doctors/me:
 *   get:
 *     summary: Get my doctor profile
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Doctor role required
 */
router.get('/me', authenticate, authorize('doctor'), doctorController.getMyDoctorProfile);

/**
 * @swagger
 * /doctors/{id}:
 *   get:
 *     summary: Get doctor by ID
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Doctor details
 *       404:
 *         description: Doctor not found
 */
router.get('/:id', doctorController.getDoctor);

/**
 * @swagger
 * /doctors/{id}:
 *   put:
 *     summary: Update doctor profile
 *     tags: [Doctors]
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
 *               specialization:
 *                 type: string
 *               experienceYears:
 *                 type: integer
 *               qualification:
 *                 type: string
 *               bio:
 *                 type: string
 *               consultationFee:
 *                 type: number
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Doctor profile updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put('/:id', authenticate, authorize('doctor'), validate(schemas.createDoctor), doctorController.updateDoctor);

export default router;


