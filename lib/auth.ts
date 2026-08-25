import crypto from 'node:crypto';
import { SESSION_COOKIE } from './constants';

export { SESSION_COOKIE };

const SESSION_HOURS = 12;

/** Login attempts allowed from one address before it is locked out. */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in before starting the server.`
    );
  }
  return value;
}

/** Constant-time string comparison that does not leak length through timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // Hash first so the comparison length is fixed regardless of input length.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, requiredEnv('ADMIN_PASSWORD'));
}

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', requiredEnv('SESSION_SECRET'))
    .update(payload)
    .digest('base64url');
}

/**
 * Build a signed session token of the form `<expiry>.<hmac>`.
 *
 * There is exactly one organizer, so the token carries no identity — only an
 * expiry that the server signs and therefore trusts.
 */
export function createSessionToken(): string {
  const expiry = String(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  return `${expiry}.${sign(expiry)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;

  const expiry = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (!safeEqual(signature, sign(expiry))) return false;

  const expiresAt = Number(expiry);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  };
}

/**
 * In-memory login throttle.
 *
 * A single-instance wedding site does not warrant a shared store; the tradeoff
 * is that the counter resets on restart, which is acceptable for a one-night tool.
 */
const attempts = new Map<string, { count: number; firstAt: number }>();

export type ThrottleState = {
  allowed: boolean;
  remaining: number;
  retryAfterMinutes: number;
};

export function checkThrottle(key: string): ThrottleState {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAt > WINDOW_MS) {
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterMinutes: 0 };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  return {
    allowed: remaining > 0,
    remaining,
    retryAfterMinutes: Math.ceil((WINDOW_MS - (now - record.firstAt)) / 60000),
  };
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  record.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

/** Best-effort client address for throttling, behind a proxy or not. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'local';
}
