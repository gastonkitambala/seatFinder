# Seat Finder — Deborah & Itaka

A wedding seat finder. Guests scan a QR code at the venue, type their name, and
see their table. Behind it is a private dashboard where the organizer uploads the
seating spreadsheet.

The guest journey is the whole point: **scan → type → tap → table number.** No
instructions, no scrolling, no waiting.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then edit it, see below
npm run dev                    # http://localhost:3000
```

Set these in `.env.local`:

| Variable | What it is |
|---|---|
| `ADMIN_PASSWORD` | The organizer's password. **Change it before the wedding.** |
| `SESSION_SECRET` | Signs the admin session cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_PATH` | Where the SQLite file lives. Defaults to `./data/seatfinder.db`. |

Then:

1. Open `/admin/login` and sign in.
2. Upload the guest list. There's a sample at `fixtures/guest-list-sample.csv`.
3. Upload the couple's photo and edit the wording in the same dashboard.
4. Point the QR code at the site root.

---

## The spreadsheet

CSV or `.xlsx`, with a heading row:

| First Name | Last Name | Table |
| ---------- | --------- | ----- |
| Amara      | Okonkwo   | 12    |
| Tobias     | Lindqvist | 8     |

Column order doesn't matter and extra columns are ignored. Headings are matched
loosely — case, spaces, and underscores are ignored, and these all work:

- **First name:** `First Name`, `firstname`, `Given Name`, `Forename`, `Prénom`
- **Last name:** `Last Name`, `surname`, `family_name`, `Nom` — optional
- **Table:** `Table`, `Table Number`, `Table #`, `Seating` — required

A single combined `Name` column also works; it's split on the first space.

**Table values are text, not numbers.** `12`, `A3`, and `Head Table` are all
valid. Purely numeric tables render as a huge numeral; anything else renders as
its own words.

Rows missing a first name or a table are skipped and listed by row number rather
than failing the whole import. Nothing is written until you confirm the preview.

---

## How it's built

- **Next.js 15** (App Router) with **SQLite** via `better-sqlite3`
- **Tailwind** over CSS custom properties — all design tokens live in `app/globals.css`
- **CSS animations only**, no animation library: a QR-scanned page must open
  instantly on venue wifi
- `exceljs` for `.xlsx` (not the `xlsx` npm package, which is stale and carries
  published advisories)

```
app/            routes: guest page, admin, API
components/
  guest/        SeatFinder (the search island), ResultCard, Flourish
  admin/        Dashboard, ImportPanel, GuestTable, AppearancePanel
lib/
  normalize.ts  lowercase, trim, strip accents
  search.ts     the matcher
  parse.ts      CSV + XLSX -> guest rows
  db.ts         schema and queries
  auth.ts       password check, signed session, login throttle
```

### The search

The **entire guest list is sent to the page as JSON on first load** and matched
in the browser. At wedding scale that's a few kilobytes, results appear as fast
as a guest can type, and it keeps working if the venue wifi drops mid-evening.

Matching is accent-insensitive (`deborah` finds `Déborah`), case-insensitive,
whitespace-tolerant, and token-based: every word you type must start some word in
the guest's name. So `smith` finds them by surname alone, and `jo sm` finds
`John Smith`. Results rank exact name → first-name prefix → surname → substring.

The autocomplete deliberately **does not show table numbers**. That would let
anyone read a stranger's seat off the list, and it removes the reason to tap.

### Security

One password from an environment variable, compared in constant time. On success
the server sets an HttpOnly, SameSite=Lax session cookie holding a signed
12-hour expiry. Five failed attempts locks that address out for 15 minutes.
Middleware redirects logged-out visitors; every admin page and API route
independently verifies the cookie's signature. `/admin` is `noindex`.

---

## Deploying

SQLite needs a persistent disk, so deploy somewhere with a volume — **Railway,
Fly.io, or a VPS**. Vercel's serverless filesystem will not keep the database
between requests.

The couple's photo is stored **inside the database** as a blob, so backing up is
a single file: whatever `DATABASE_PATH` points at.

---

## Tests

```bash
npm test
```

45 tests over the matcher and the spreadsheet parser — the two pieces where a
bug is invisible until a guest is standing in the venue holding their phone.
