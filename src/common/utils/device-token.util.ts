import { randomBytes } from 'crypto';
import { hashSync, compareSync } from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;
const TOKEN_BYTE_LENGTH = 32;

export function generateDeviceToken(): { rawToken: string; hash: string } {
  const rawToken = `dtkn_${randomBytes(TOKEN_BYTE_LENGTH).toString('hex')}`;
  const hash = hashSync(rawToken, BCRYPT_SALT_ROUNDS);
  return { rawToken, hash };
}

export function hashDeviceToken(rawToken: string): string {
  return hashSync(rawToken, BCRYPT_SALT_ROUNDS);
}

export function verifyDeviceToken(
  rawToken: string,
  storedHash: string,
): boolean {
  return compareSync(rawToken, storedHash);
}
