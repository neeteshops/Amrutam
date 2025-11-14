import request from 'supertest';
import app from '../index';
import pool from '../config/database';
import { redisClient } from '../config/redis';

describe('Authentication', () => {
  const testUsers: string[] = [];

  beforeAll(async () => {
    // Run migrations or setup test database
  });

  afterEach(async () => {
    // Clean up test users after each test
    if (testUsers.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const email of testUsers) {
          await client.query('DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
          await client.query('DELETE FROM users WHERE email = $1', [email]);
        }
        await client.query('COMMIT');
        testUsers.length = 0; // Clear the array
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  });

  afterAll(async () => {
    // Final cleanup
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-%@example.com']);
      await client.query('DELETE FROM users WHERE email LIKE $1', ['test-%@example.com']);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await pool.end();
    }

    // Close Redis connection if open
    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
      }
    } catch (error) {
      // Ignore Redis errors during cleanup
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      testUsers.push(uniqueEmail);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(uniqueEmail);
    });

    it('should reject duplicate email', async () => {
      const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      testUsers.push(uniqueEmail);

      // First registration should succeed
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        });

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        });

      expect(response.status).toBe(409);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      testUsers.push(uniqueEmail);

      // Register user first
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        });

      // Then try to login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      testUsers.push(uniqueEmail);

      // Register user first
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        });

      // Try to login with wrong password
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: uniqueEmail,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });
});


