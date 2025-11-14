import crypto from 'crypto';
import { config } from '../config/config';

const algorithm = 'aes-256-gcm';
const keyLength = 32;
const ivLength = 16;
const saltLength = 64;
const tagLength = 16;
const tagPosition = saltLength + ivLength;
const encryptedPosition = tagPosition + tagLength;

const getKey = (): Buffer => {
  const key = config.encryption.key;
  if (key.length < 32) {
    throw new Error('Encryption key must be at least 32 characters');
  }
  return crypto.scryptSync(key.substring(0, 32), 'salt', keyLength);
};

export const encrypt = (text: string): string => {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(ivLength);
    const salt = crypto.randomBytes(saltLength);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
};

export const decrypt = (encryptedData: string): string => {
  try {
    const key = getKey();
    const data = Buffer.from(encryptedData, 'base64');
    
    const iv = data.subarray(saltLength, tagPosition);
    const tag = data.subarray(tagPosition, encryptedPosition);
    const encrypted = data.subarray(encryptedPosition);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
};


