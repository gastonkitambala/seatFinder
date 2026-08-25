import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from './auth';

/**
 * The real session check, run in the Node runtime where node:crypto exists.
 *
 * Middleware only sees whether a cookie is present; every admin page and API
 * route calls this to verify the signature and expiry before doing any work.
 */
export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Guard for admin API routes. Returns a 401 Response when unauthenticated. */
export async function requireSession(): Promise<Response | null> {
  if (await hasValidSession()) return null;
  return Response.json(
    { error: 'Your session has expired. Please sign in again.' },
    { status: 401 }
  );
}
