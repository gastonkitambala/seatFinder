/**
 * Values shared between the Edge middleware and the Node server.
 *
 * Kept free of any Node built-in so middleware can import it: pulling in
 * lib/auth.ts there fails the build, because node:crypto has no Edge equivalent.
 */
export const SESSION_COOKIE = 'sf_admin';
