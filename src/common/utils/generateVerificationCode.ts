import * as crypto from 'crypto';

export function generateVerificationCode() {
  const code = crypto.randomInt(0, 1_000_000);
  return code.toString().padStart(6, '0');
}
