import { requireSession } from '@/lib/session';
import { deleteGuest, updateGuest } from '@/lib/db';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: 'That guest could not be found.' }, { status: 404 });
  }

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

  const guest = updateGuest(id, { firstName, lastName, tableLabel });
  if (!guest) {
    return Response.json({ error: 'That guest could not be found.' }, { status: 404 });
  }

  return Response.json({ guest });
}

export async function DELETE(_request: Request, context: Context) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: 'That guest could not be found.' }, { status: 404 });
  }

  if (!deleteGuest(id)) {
    return Response.json({ error: 'That guest could not be found.' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
