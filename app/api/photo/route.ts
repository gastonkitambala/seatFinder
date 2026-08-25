import { getHeroPhoto } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Serve the couple's photo out of the database.
 *
 * The public page requests it with a ?v=<timestamp> that changes whenever the
 * organizer uploads a new one, so the immutable cache header is safe: a new
 * photo produces a new URL rather than waiting for a cache to expire.
 */
export async function GET() {
  const photo = getHeroPhoto();

  if (!photo) {
    return new Response('No photo has been uploaded yet.', { status: 404 });
  }

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      'Content-Type': photo.mime,
      'Content-Length': String(photo.bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
