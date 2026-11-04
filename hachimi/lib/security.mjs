import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const KEY_PATTERN = /^MGP(?:-[A-Z0-9]{4}){4}$/;

export function normalizeKey(value) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidKeyFormat(value) {
  return KEY_PATTERN.test(normalizeKey(value));
}

export function hashKey(value, pepper) {
  return createHash('sha256')
    .update(`${pepper}:${normalizeKey(value)}`)
    .digest('hex');
}

export function createActivationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(16);
  const chunks = [];
  for (let chunk = 0; chunk < 4; chunk += 1) {
    let text = '';
    for (let index = 0; index < 4; index += 1) {
      text += alphabet[bytes[chunk * 4 + index] % alphabet.length];
    }
    chunks.push(text);
  }
  return `MGP-${chunks.join('-')}`;
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const digest = scryptSync(password, salt, 64, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  }).toString('hex');
  return { salt, digest };
}

export function verifyPassword(password, salt, expectedHex) {
  const actual = Buffer.from(hashPassword(password, salt).digest, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
