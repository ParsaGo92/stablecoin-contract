import crypto from 'crypto';

export function generateSecretKey(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashSecretKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
