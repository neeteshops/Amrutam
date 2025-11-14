import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new AppError(`Validation error: ${errors.map((e) => e.message).join(', ')}`, 400);
    }

    req.body = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    role: Joi.string().valid('patient', 'doctor').default('patient'),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(100).optional(),
    lastName: Joi.string().min(1).max(100).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    dateOfBirth: Joi.date().optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    address: Joi.string().optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().max(100).optional(),
    pincode: Joi.string().max(10).optional(),
  }),

  createDoctor: Joi.object({
    licenseNumber: Joi.string().required(),
    specialization: Joi.string().required(),
    experienceYears: Joi.number().integer().min(0).optional(),
    qualification: Joi.string().optional(),
    bio: Joi.string().optional(),
    consultationFee: Joi.number().positive().required(),
  }),

  createAvailabilitySlot: Joi.object({
    dayOfWeek: Joi.number().integer().min(0).max(6).required(),
    startTime: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required(),
    timezone: Joi.string().optional(),
    isRecurring: Joi.boolean().default(true),
    validFrom: Joi.date().optional(),
    validUntil: Joi.date().optional(),
  }),

  bookConsultation: Joi.object({
    doctorId: Joi.string().uuid().required(),
    scheduledAt: Joi.date().iso().required(),
    consultationType: Joi.string().valid('video', 'audio', 'chat', 'in_person').default('video'),
    symptoms: Joi.string().optional(),
  }),

  updateConsultation: Joi.object({
    status: Joi.string().valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show').optional(),
    symptoms: Joi.string().optional(),
    diagnosis: Joi.string().optional(),
    notes: Joi.string().optional(),
  }),

  createPrescription: Joi.object({
    consultationId: Joi.string().uuid().required(),
    medications: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        dosage: Joi.string().required(),
        frequency: Joi.string().required(),
        duration: Joi.string().required(),
      })
    ).required(),
    instructions: Joi.string().optional(),
    followUpDate: Joi.date().optional(),
  }),

  searchDoctors: Joi.object({
    specialization: Joi.string().optional(),
    city: Joi.string().optional(),
    minRating: Joi.number().min(0).max(5).optional(),
    isAvailable: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),

  enableMfa: Joi.object({
    token: Joi.string().length(6).required(),
  }),
};

