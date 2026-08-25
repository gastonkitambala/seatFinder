import Papa from 'papaparse';

export type ParsedRow = {
  firstName: string;
  lastName: string;
  tableLabel: string;
};

/** A row that could not be imported, identified by its 1-based spreadsheet row number. */
export type RowError = {
  row: number;
  reason: string;
};

export type ParseSuccess = {
  ok: true;
  rows: ParsedRow[];
  errors: RowError[];
  headers: string[];
};

export type ParseFailure = {
  ok: false;
  error: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

export type HeaderMatch =
  | { ok: true; first: number; last: number; table: number }
  | { ok: false; missing: string[]; seen: string[] };

/**
 * Header spellings we accept, normalised to lowercase with spaces, underscores,
 * and punctuation removed. Organisers export from Excel, Google Sheets, and
 * planning tools that all label these columns slightly differently.
 */
const FIRST_NAME_HEADERS = [
  'firstname', 'first', 'givenname', 'given', 'forename',
  'prenom', 'nome', 'nombre', 'vorname',
];

const LAST_NAME_HEADERS = [
  'lastname', 'last', 'surname', 'familyname', 'family',
  'nom', 'apellido', 'nachname', 'cognome',
];

const TABLE_HEADERS = [
  'table', 'tablenumber', 'tableno', 'tablenum', 'tablename',
  'tableassignment', 'seating', 'seatingtable', 'mesa', 'tisch',
];

/** A single combined-name column, which we split on the first space. */
const FULL_NAME_HEADERS = ['name', 'guest', 'guestname', 'fullname'];

const COMBINING_MARKS = /[̀-ͯ]/g;

function headerKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.includes(headerKey(h)));
}

/**
 * Locate the first-name, last-name, and table columns in a header row.
 *
 * A dedicated last-name column is optional: a single "Name" column is split, and
 * a guest list of first names only is still importable. A table column is not
 * optional, because without it the site has nothing to tell anyone.
 */
export function matchHeaders(headers: string[]): HeaderMatch {
  const table = findColumn(headers, TABLE_HEADERS);
  let first = findColumn(headers, FIRST_NAME_HEADERS);
  let last = findColumn(headers, LAST_NAME_HEADERS);

  // Fall back to a combined "Name" column when there is no explicit first name.
  if (first === -1) {
    const fullName = findColumn(headers, FULL_NAME_HEADERS);
    if (fullName !== -1) {
      first = fullName;
      last = -1;
    }
  }

  const missing: string[] = [];
  if (first === -1) missing.push('First Name');
  if (table === -1) missing.push('Table');

  if (missing.length > 0) {
    return { ok: false, missing, seen: headers.filter((h) => h.trim() !== '') };
  }

  return { ok: true, first, last, table };
}

function cell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return '';
  return (row[index] ?? '').toString().trim();
}

/** Split "Amara Okonkwo" into first and last; a lone token becomes a first name. */
function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Turn a raw grid of cells into guest rows.
 *
 * Shared by both the CSV and the Excel path so the two formats can never drift
 * apart in how they validate. Bad rows are collected rather than thrown, so a
 * single typo three-quarters down the spreadsheet does not block the import.
 */
export function rowsFromMatrix(matrix: string[][]): ParseResult {
  const grid = matrix.filter((r) => Array.isArray(r));
  if (grid.length === 0) {
    return { ok: false, error: 'That file looks empty — there were no rows to read.' };
  }

  const headers = grid[0].map((h) => (h ?? '').toString().trim());
  const match = matchHeaders(headers);

  if (!match.ok) {
    const missing = match.missing.map((m) => `"${m}"`).join(' and ');
    const seen = match.seen.length > 0 ? match.seen.join(', ') : '(no column headings at all)';
    return {
      ok: false,
      error:
        `No column matching ${missing} was found. ` +
        `The first row of the file contains: ${seen}. ` +
        `Please make sure the first row holds the column headings.`,
    };
  }

  const usesCombinedName =
    match.last === -1 && FULL_NAME_HEADERS.includes(headerKey(headers[match.first] ?? ''));

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < grid.length; i++) {
    const raw = grid[i];
    const rowNumber = i + 1; // 1-based, and row 1 is the header
    const firstCell = cell(raw, match.first);
    const lastCell = cell(raw, match.last);
    const tableCell = cell(raw, match.table);

    // A completely blank line is trailing spreadsheet padding, not a mistake.
    if (!firstCell && !lastCell && !tableCell) continue;

    let firstName = firstCell;
    let lastName = lastCell;
    if (usesCombinedName) {
      const split = splitFullName(firstCell);
      firstName = split.firstName;
      lastName = split.lastName;
    }

    if (!firstName) {
      errors.push({ row: rowNumber, reason: 'Missing a first name' });
      continue;
    }
    if (!tableCell) {
      errors.push({ row: rowNumber, reason: 'Missing a table' });
      continue;
    }

    rows.push({ firstName, lastName, tableLabel: tableCell });
  }

  if (rows.length === 0 && errors.length === 0) {
    return {
      ok: false,
      error: 'The column headings were found, but there are no guest rows beneath them.',
    };
  }

  return { ok: true, rows, errors, headers };
}

/** Parse a CSV file. Handles quoted fields, CRLF endings, and a UTF-8 BOM. */
export function parseCsv(text: string): ParseResult {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  if (withoutBom.trim() === '') {
    return { ok: false, error: 'That file looks empty — there were no rows to read.' };
  }

  const parsed = Papa.parse<string[]>(withoutBom, { skipEmptyLines: 'greedy' });
  return rowsFromMatrix(parsed.data as string[][]);
}

/** Parse the first worksheet of an .xlsx workbook. */
export async function parseWorkbook(buffer: ArrayBuffer): Promise<ParseResult> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return {
      ok: false,
      error:
        'That file could not be opened as an Excel workbook. Please re-save it as .xlsx or .csv.',
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { ok: false, error: 'That workbook has no worksheets in it.' };
  }

  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    // ExcelJS row values are 1-based with a leading hole at index 0.
    const raw = row.values as unknown[];
    const values: string[] = [];
    for (let i = 1; i < raw.length; i++) {
      values.push(cellToString(raw[i]));
    }
    matrix.push(values);
  });

  return rowsFromMatrix(matrix);
}

/** Flatten the several shapes an ExcelJS cell value can take into plain text. */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.richText)) {
      return obj.richText.map((part) => (part as { text?: string }).text ?? '').join('');
    }
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.result === 'string' || typeof obj.result === 'number') {
      return String(obj.result);
    }
  }

  return String(value);
}
