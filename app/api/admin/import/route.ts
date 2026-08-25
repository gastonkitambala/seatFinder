import { requireSession } from '@/lib/session';
import { parseCsv, parseWorkbook, type ParseResult } from '@/lib/parse';
import { importGuests } from '@/lib/db';

export const runtime = 'nodejs';

/** Guard against a huge upload occupying memory. A guest list is never this big. */
const MAX_BYTES = 5 * 1024 * 1024;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/**
 * Parse an uploaded guest list and, when asked to, commit it.
 *
 * The dashboard calls this twice: once with commit=false to show a preview, and
 * again with commit=true once the organizer has seen what will happen. Nothing
 * is written to the database until that second call.
 */
export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'That upload could not be read.' }, { status: 400 });
  }

  const file = form.get('file');
  const mode = form.get('mode') === 'append' ? 'append' : 'replace';
  const commit = form.get('commit') === 'true';

  if (!(file instanceof File)) {
    return Response.json({ error: 'Please choose a file to upload.' }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ error: 'That file is empty.' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: 'That file is larger than 5 MB. Please upload just the guest list.' },
      { status: 400 }
    );
  }

  const extension = extensionOf(file.name);
  let result: ParseResult;

  if (extension === '.csv' || extension === '.txt') {
    result = parseCsv(await file.text());
  } else if (extension === '.xlsx' || extension === '.xlsm') {
    result = await parseWorkbook(await file.arrayBuffer());
  } else if (extension === '.xls') {
    return Response.json(
      {
        error:
          'That is an older .xls file. Please open it in Excel and choose "Save As" then .xlsx or .csv.',
      },
      { status: 400 }
    );
  } else {
    return Response.json(
      {
        error: `"${file.name}" is not a spreadsheet we can read. Please upload a .csv or .xlsx file.`,
      },
      { status: 400 }
    );
  }

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  if (!commit) {
    return Response.json({
      preview: true,
      mode,
      fileName: file.name,
      headers: result.headers,
      total: result.rows.length,
      rows: result.rows.slice(0, 10),
      errors: result.errors,
    });
  }

  const imported = importGuests(result.rows, mode);

  return Response.json({
    imported,
    skipped: result.errors.length,
    errors: result.errors,
    mode,
  });
}
