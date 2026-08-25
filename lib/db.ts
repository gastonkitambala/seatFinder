import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type Guest = {
  id: number;
  firstName: string;
  lastName: string;
  tableLabel: string;
};

export type HeroPhoto = {
  mime: string;
  bytes: Buffer;
  updatedAt: number;
};

const DEFAULT_SETTINGS: Record<string, string> = {
  couple_names: 'Deborah & Itaka',
  welcome_message:
    'We are so glad you are here. Find your name below to see where you are seated tonight.',
  closing_message:
    "We can't wait to celebrate with you! Enjoy the evening and have a wonderful time.",
};

let instance: Database.Database | null = null;

/**
 * Open the database, creating the file and schema on first run.
 *
 * Cached on the module so Next's dev server does not open a new handle on every
 * hot reload. The connection is deliberately process-wide and synchronous:
 * better-sqlite3 is fast enough that a wedding-sized guest list never blocks.
 */
export function getDb(): Database.Database {
  if (instance) return instance;

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'seatfinder.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS guests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name  TEXT NOT NULL,
      last_name   TEXT NOT NULL DEFAULT '',
      table_label TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_guests_name ON guests (last_name, first_name);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media (
      key        TEXT PRIMARY KEY,
      mime       TEXT NOT NULL,
      bytes      BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const seed = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    seed.run(key, value);
  }

  instance = db;
  return db;
}

type GuestRow = {
  id: number;
  first_name: string;
  last_name: string;
  table_label: string;
};

function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    tableLabel: row.table_label,
  };
}

export function listGuests(): Guest[] {
  const rows = getDb()
    .prepare(
      `SELECT id, first_name, last_name, table_label
         FROM guests
        ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE`
    )
    .all() as GuestRow[];
  return rows.map(toGuest);
}

export function countGuests(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM guests').get() as { n: number };
  return row.n;
}

/** Distinct table labels, for the "N tables" figure on the dashboard. */
export function countTables(): number {
  const row = getDb()
    .prepare('SELECT COUNT(DISTINCT table_label) AS n FROM guests')
    .get() as { n: number };
  return row.n;
}

export function createGuest(input: {
  firstName: string;
  lastName: string;
  tableLabel: string;
}): Guest {
  const result = getDb()
    .prepare(
      `INSERT INTO guests (first_name, last_name, table_label, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(input.firstName, input.lastName, input.tableLabel, Date.now());

  return {
    id: Number(result.lastInsertRowid),
    firstName: input.firstName,
    lastName: input.lastName,
    tableLabel: input.tableLabel,
  };
}

export function updateGuest(
  id: number,
  input: { firstName: string; lastName: string; tableLabel: string }
): Guest | null {
  const result = getDb()
    .prepare(
      `UPDATE guests SET first_name = ?, last_name = ?, table_label = ? WHERE id = ?`
    )
    .run(input.firstName, input.lastName, input.tableLabel, id);

  if (result.changes === 0) return null;
  return { id, ...input };
}

export function deleteGuest(id: number): boolean {
  const result = getDb().prepare('DELETE FROM guests WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Write an imported guest list to the database.
 *
 * Wrapped in a single transaction so a replace can never leave the site showing
 * a half-deleted seating chart if anything fails partway through.
 */
export function importGuests(
  rows: Array<{ firstName: string; lastName: string; tableLabel: string }>,
  mode: 'replace' | 'append'
): number {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO guests (first_name, last_name, table_label, created_at)
     VALUES (@firstName, @lastName, @tableLabel, @createdAt)`
  );

  const run = db.transaction((batch: typeof rows) => {
    if (mode === 'replace') {
      db.prepare('DELETE FROM guests').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'guests'").run();
    }
    const createdAt = Date.now();
    for (const row of batch) {
      insert.run({ ...row, createdAt });
    }
    return batch.length;
  });

  return run(rows);
}

export function deleteAllGuests(): number {
  const db = getDb();
  const n = countGuests();
  db.prepare('DELETE FROM guests').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'guests'").run();
  return n;
}

export function getSetting(key: string): string {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? DEFAULT_SETTINGS[key] ?? '';
}

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const out = { ...DEFAULT_SETTINGS };
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

export function getHeroPhoto(): HeroPhoto | null {
  const row = getDb()
    .prepare("SELECT mime, bytes, updated_at FROM media WHERE key = 'hero'")
    .get() as { mime: string; bytes: Buffer; updated_at: number } | undefined;

  if (!row) return null;
  return { mime: row.mime, bytes: row.bytes, updatedAt: row.updated_at };
}

/** Only the timestamp, so the public page can build a cache-busting URL cheaply. */
export function getHeroPhotoVersion(): number | null {
  const row = getDb()
    .prepare("SELECT updated_at FROM media WHERE key = 'hero'")
    .get() as { updated_at: number } | undefined;
  return row?.updated_at ?? null;
}

export function setHeroPhoto(mime: string, bytes: Buffer): void {
  getDb()
    .prepare(
      `INSERT INTO media (key, mime, bytes, updated_at) VALUES ('hero', ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET mime = excluded.mime,
                                      bytes = excluded.bytes,
                                      updated_at = excluded.updated_at`
    )
    .run(mime, bytes, Date.now());
}

export function deleteHeroPhoto(): void {
  getDb().prepare("DELETE FROM media WHERE key = 'hero'").run();
}
