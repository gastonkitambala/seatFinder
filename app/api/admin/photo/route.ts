import { requireSession } from '@/lib/session';
import { deleteHeroPhoto, setHeroPhoto } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'That upload could not be read.' }, { status: 400 });
  }

  const file = form.get('photo');

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'Please choose a photo to upload.' }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return Response.json(
      { error: 'Please upload a JPEG, PNG, WebP, or AVIF image.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      {
        error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please use one under 8 MB so the page loads quickly on phones.`,
      },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  setHeroPhoto(file.type, bytes);

  return Response.json({ ok: true });
}

export async function DELETE() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  deleteHeroPhoto();
  return Response.json({ ok: true });
}
