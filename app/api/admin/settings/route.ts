import { requireSession } from '@/lib/session';
import { getSettings, setSetting } from '@/lib/db';

export const runtime = 'nodejs';

/** Only these keys are writable, so a stray field cannot invent new settings. */
const EDITABLE = ['couple_names', 'welcome_message', 'closing_message'] as const;

const LIMITS: Record<(typeof EDITABLE)[number], number> = {
  couple_names: 80,
  welcome_message: 400,
  closing_message: 400,
};

export async function PATCH(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'That request could not be read.' }, { status: 400 });
  }

  for (const key of EDITABLE) {
    const value = body[key];
    if (value === undefined) continue;

    if (typeof value !== 'string') {
      return Response.json({ error: `${key} must be text.` }, { status: 400 });
    }

    const trimmed = value.trim();
    if (trimmed === '') {
      return Response.json({ error: 'None of these fields can be left empty.' }, { status: 400 });
    }
    if (trimmed.length > LIMITS[key]) {
      return Response.json(
        { error: `That text is too long — please keep it under ${LIMITS[key]} characters.` },
        { status: 400 }
      );
    }

    setSetting(key, trimmed);
  }

  return Response.json({ settings: getSettings() });
}
