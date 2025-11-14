import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { config } from '../config/config';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { auditService } from './auditService';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'patient' | 'doctor';
}

export interface LoginData {
  email: string;
  password: string;
  mfaToken?: string;
}

class AuthService {
  async register(data: RegisterData, ipAddress?: string, userAgent?: string): Promise<{ user: any; token: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );
      
      if (existingUser.rows.length > 0) {
        throw new AppError('User with this email already exists', 409);
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);
      
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, is_active, created_at`,
        [uuidv4(), data.email, passwordHash, data.role]
      );
      
      const user = userResult.rows[0];
      
      // Create profile
      await client.query(
        `INSERT INTO profiles (id, user_id, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), user.id, data.firstName, data.lastName, data.phone || null]
      );
      
      await client.query('COMMIT');
      
      // Generate token
      const token = this.generateToken(user);
      
      // Audit log
      await auditService.log({
        userId: user.id,
        action: 'user_registered',
        resourceType: 'user',
        resourceId: user.id,
        details: { email: data.email, role: data.role },
        ipAddress,
        userAgent,
      });
      
      logger.info(`User registered: ${user.email}`);
      
      return { user, token };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Registration error:', error);
      throw new AppError('Registration failed', 500);
    } finally {
      client.release();
    }
  }
  
  async login(data: LoginData, ipAddress?: string, userAgent?: string): Promise<{ user: any; token: string; requiresMfa?: boolean }> {
    const client = await pool.connect();
    
    try {
      // Find user
      const userResult = await client.query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.is_active, u.mfa_enabled, u.mfa_secret
         FROM users u
         WHERE u.email = $1`,
        [data.email]
      );
      
      if (userResult.rows.length === 0) {
        throw new AppError('Invalid credentials', 401);
      }
      
      const user = userResult.rows[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!isValidPassword) {
        await auditService.log({
          userId: user.id,
          action: 'login_failed',
          resourceType: 'auth',
          details: { reason: 'invalid_password' },
          ipAddress,
          userAgent,
        });
        throw new AppError('Invalid credentials', 401);
      }
      
      if (!user.is_active) {
        throw new AppError('Account is deactivated', 403);
      }
      
      // Check MFA
      if (user.mfa_enabled) {
        if (!data.mfaToken) {
          return { user: { id: user.id, email: user.email, role: user.role }, token: '', requiresMfa: true };
        }
        
        const isValidToken = speakeasy.totp.verify({
          secret: user.mfa_secret,
          encoding: 'base32',
          token: data.mfaToken,
          window: 2,
        });
        
        if (!isValidToken) {
          await auditService.log({
            userId: user.id,
            action: 'mfa_verification_failed',
            resourceType: 'auth',
            details: {},
            ipAddress,
            userAgent,
          });
          throw new AppError('Invalid MFA token', 401);
        }
      }
      
      // Update last login
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
      
      // Generate token
      const token = this.generateToken(user);
      
      // Audit log
      await auditService.log({
        userId: user.id,
        action: 'login_success',
        resourceType: 'auth',
        details: {},
        ipAddress,
        userAgent,
      });
      
      logger.info(`User logged in: ${user.email}`);
      
      return { user: { id: user.id, email: user.email, role: user.role }, token };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Login error:', error);
      throw new AppError('Login failed', 500);
    } finally {
      client.release();
    }
  }
  
  generateToken(user: { id: string; email: string; role: string }): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );
  }
  
  async setupMfa(userId: string): Promise<{ secret: string; qrCode: string }> {
    const client = await pool.connect();
    
    try {
      const secret = speakeasy.generateSecret({
        name: `${config.mfa.issuer} (${userId})`,
        issuer: config.mfa.issuer,
      });
      
      const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');
      
      await client.query(
        'UPDATE users SET mfa_secret = $1 WHERE id = $2',
        [secret.base32, userId]
      );
      
      return { secret: secret.base32 || '', qrCode };
    } catch (error) {
      logger.error('MFA setup error:', error);
      throw new AppError('MFA setup failed', 500);
    } finally {
      client.release();
    }
  }
  
  async enableMfa(userId: string, token: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const userResult = await client.query(
        'SELECT mfa_secret FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new AppError('User not found', 404);
      }
      
      const isValid = speakeasy.totp.verify({
        secret: userResult.rows[0].mfa_secret,
        encoding: 'base32',
        token,
        window: 2,
      });
      
      if (!isValid) {
        throw new AppError('Invalid MFA token', 400);
      }
      
      await client.query(
        'UPDATE users SET mfa_enabled = true WHERE id = $1',
        [userId]
      );
      
      logger.info(`MFA enabled for user: ${userId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('MFA enable error:', error);
      throw new AppError('Failed to enable MFA', 500);
    } finally {
      client.release();
    }
  }
}

export const authService = new AuthService();


