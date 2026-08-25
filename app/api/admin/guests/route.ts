import { requireSession } from '@/lib/session';
import { createGuest, deleteAllGuests, listGuests } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  return Response.json({ guests: listGuests() });
}

export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  let body: { firstName?: unknown; lastName?: unknown; tableLabel?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'That request could not be read.' }, { status: 400 });
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const tableLabel = typeof body.tableLabel === 'string' ? body.tableLabel.trim() : '';

  if (!firstName) {
    return Response.json({ error: 'A first name is required.' }, { status: 400 });
  }
  if (!tableLabel) {
    return Response.json({ error: 'A table is required.' }, { status: 400 });
  }

  return Response.json({ guest: createGuest({ firstName, lastName, tableLabel }) });
}

/** Clear the whole list. Used by the dashboard's "remove every guest" action. */
export async function DELETE() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  return Response.json({ deleted: deleteAllGuests() });
}
