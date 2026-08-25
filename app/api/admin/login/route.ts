import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  checkPassword,
  checkThrottle,
  clearAttempts,
  clientKey,
  createSessionToken,
  recordFailure,
  sessionCookieOptions,
} from '@/lib/auth';

export async function POST(request: Request) {
  const key = clientKey(request);
  const throttle = checkThrottle(key);

  if (!throttle.allowed) {
    return Response.json(
      {
        error: `Too many attempts. Please wait ${throttle.retryAfterMinutes} minute${
          throttle.retryAfterMinutes === 1 ? '' : 's'
        } and try again.`,
      },
      { status: 429 }
    );
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return Response.json({ error: 'That request could not be read.' }, { status: 400 });
  }

  if (!password) {
    return Response.json({ error: 'Please enter the password.' }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = checkPassword(password);
  } catch (error) {
    // A missing ADMIN_PASSWORD is a setup mistake, not a bad login.
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }

  if (!valid) {
    recordFailure(key);
    const after = checkThrottle(key);
    return Response.json(
      {
        error:
          after.remaining > 0
            ? `That password is not correct. ${after.remaining} attempt${
                after.remaining === 1 ? '' : 's'
              } remaining.`
            : 'That password is not correct. Please wait 15 minutes before trying again.',
      },
      { status: 401 }
    );
  }

  clearAttempts(key);

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());

  return Response.json({ ok: true });
}
