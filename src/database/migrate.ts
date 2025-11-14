import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../config/database';
import logger from '../utils/logger';

export const runMigrations = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Look for schema.sql in src/database (development) or dist/database (production)
    // If not found, try parent directory
    let schemaPath = join(__dirname, 'schema.sql');
    try {
      readFileSync(schemaPath, 'utf-8');
    } catch {
      // Try src/database if we're in dist
      schemaPath = join(__dirname, '..', '..', 'src', 'database', 'schema.sql');
    }
    const schema = readFileSync(schemaPath, 'utf-8');
    
    await client.query(schema);
    
    await client.query('COMMIT');
    logger.info('Database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}


