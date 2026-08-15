# Secure Spreadsheet Viewer (SSV)

A Next.js app that shows Google Sheets data through a web UI instead of
sharing the sheet directly. Every viewer sees their own email watermarked
across the page, so a leaked screenshot can be traced back to who viewed it.
Access is controlled by an admin who approves or blocks signed-in users.

## What's included

```
app/
  page.tsx                          Home page — lists sheets, shows watermark
  admin/page.tsx                    Admin page — approve/block users
  admin/sheets/page.tsx             Admin page — add sheets, manual refresh
  sheets/[sheetId]/page.tsx         Spreadsheet viewer page
  api/auth/[...nextauth]/route.ts   Google Sign-In
  api/sheets/route.ts               List sheets
  api/sheets/[sheetId]/data/route.ts  Paginated sheet data (latest or a chosen snapshot)
  api/sheets/[sheetId]/snapshots/route.ts  List history for a sheet
  api/sheets/[sheetId]/search/route.ts  Column-specific search across all history
  api/admin/users/route.ts          List users (admin only)
  api/admin/users/[userId]/route.ts   Approve/block a user (admin only)
  api/admin/sheets/route.ts         List/add sheets (admin only)
  api/admin/sheets/[sheetId]/refresh/route.ts  Manual re-sync (admin only)
  api/cron/sync-sheets/route.ts     Daily sync job (00:00 UTC) for all sheets
components/
  SheetGrid.tsx                     AG Grid data table
  EmailWatermark.tsx                Repeating watermark overlay
  AdminUserList.tsx                 Admin approve/block table
  AdminSheetList.tsx                Admin add-sheet form + refresh buttons
  Providers.tsx                     Wraps the app in NextAuth's SessionProvider
lib/
  auth.ts                           NextAuth config, status/admin logic
  googleSheets.ts                   Google Sheets API fetch helper
  supabase.ts                       Supabase server client
  syncSheet.ts                      Shared sync logic (cron + manual refresh)
  pruneSnapshots.ts                 90-day history retention (called by cron)
  tableQuery.ts                     Filter/paginate helper
  requireAdmin.ts                   Admin route guard
migrations/
  001_initial_schema.sql            users, sheets, sheet_rows tables
  002_add_user_access_control.sql   status, is_admin columns
  003_simplify_to_cached_only.sql   drops the old live/sync-interval columns
  004_add_phone.sql                 adds phone number to users
  005_add_sheet_snapshots.sql       preserves history across syncs instead of overwriting
vercel.json                         Daily cron schedule for sheet sync
.env.example                        All required environment variables
```

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. In the SQL editor, run `migrations/001_initial_schema.sql`, then
   `migrations/002_add_user_access_control.sql`, then
   `migrations/003_simplify_to_cached_only.sql`, then
   `migrations/004_add_phone.sql`, then
   `migrations/005_add_sheet_snapshots.sql`, in that order.
3. In **Project Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (not `anon`) → `SUPABASE_SERVICE_ROLE_KEY`

   The service role key bypasses Row Level Security and must only ever be
   used server-side (it already is — every use is in `lib/supabase.ts`,
   imported only from API routes and server components).

## 2. Set up Google Sign-In (OAuth)

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project (or reuse one).
2. **APIs & Services → OAuth consent screen** — configure it (Internal if
   you're on Google Workspace and want to restrict to your org, External
   otherwise).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: Web application
   - Authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
     (and `http://localhost:3000/api/auth/callback/google` for local dev)
4. Copy the Client ID/Secret → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## 3. Set up the Sheets API service account

This is separate from Sign-In — it's how the app itself reads the
spreadsheet, so viewers never need "Share" access to the sheet.

1. Same Google Cloud project → **APIs & Services → Library** → enable
   **Google Sheets API**.
2. **IAM & Admin → Service Accounts → Create Service Account** (no roles
   needed at the project level).
3. Open the service account → **Keys → Add Key → Create new key → JSON**.
   Download it.
4. From the JSON file, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the `\n`
     escapes as-is; the code un-escapes them automatically)
5. Open the actual Google Sheet you want to serve → **Share** → paste the
   service account's email → give it **Viewer** access.

## 4. Add sheets via the admin page (no SQL needed)

Once you're signed in as the bootstrap admin, go to `/admin/sheets` and use
the **Add a sheet** form:

- **Display name** — whatever you want shown in the app (e.g. "Q3 Revenue")
- **Google Sheet ID** — the long string in the sheet's URL:
  `https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID/edit`
- **Tab name** — the exact name of the tab at the bottom of the sheet (e.g.
  `Sheet1`), not the `gid=` number in the URL

Make sure the sheet has already been shared with your service account's
email (Viewer access, from step 3) before adding it — otherwise the first
fetch will fail with a permissions error.

After adding a sheet, it won't have any data yet until it's synced — either
wait for the nightly cron, or just click **Refresh now** next to it on the
same page to fetch it immediately.

If you'd rather do this via SQL instead, that still works:
```sql
insert into sheets (google_sheet_id, sheet_tab_name, display_name)
values ('1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890', 'Sheet1', 'Q3 Revenue');
```

## How data gets refreshed

There is no "live" mode — every sheet is always served from the Postgres
cache (`sheet_rows`), so page loads, search, and pagination never wait on
the Google Sheets API. The cache is refreshed in exactly two ways:

1. **Daily cron** — `vercel.json` schedules `/api/cron/sync-sheets` for
   `0 0 * * *` (00:00 **UTC** — adjust the cron expression if you want a
   different time zone's midnight). It re-syncs every registered sheet.
2. **Manual admin trigger** — the **Refresh now** button on `/admin/sheets`
   calls `/api/admin/sheets/[sheetId]/refresh`, which re-syncs just that one
   sheet immediately. Useful right after adding a sheet, or whenever you
   know the source data just changed and don't want to wait for midnight.

Both call the same underlying sync logic (`lib/syncSheet.ts`): it re-fetches
the full tab from Google Sheets, **inserts a new snapshot** (a row in
`sheet_snapshots` plus its own set of `sheet_rows`) rather than overwriting
the previous one, and updates `last_synced_at` on the sheet. The viewer page
defaults to showing the most recent snapshot, but every prior sync's data
stays in the database.

## Viewing history

On the sheet viewer page, if more than one snapshot exists for that sheet, a
dropdown appears next to the search box (defaulting to "Latest") listing
every past sync with its timestamp and row count. Selecting one loads that
exact snapshot's data read-only — no separate page, no admin permission
needed, any approved viewer can do this.

There's also a **search box tied specifically to the "Stock Name" column**
— not a column picker, not a whole-sheet search. Type a value and it
searches only that column, across **every** snapshot in history (not just
the one currently on screen), returning matches with a "Synced at" column,
ordered newest sync first. This is powered by
`app/api/sheets/[sheetId]/search/route.ts`, which filters directly on
`sheet_rows.synced_at` (set at insert time during each sync) rather than
joining back to `sheet_snapshots` — so it doesn't need any extra tables.
Note the same underlying sheet row will appear once per sync it matched in,
which is expected: the point is to show how that stock's row looked across
time, not to deduplicate identical rows.

The column name is a constant (`SEARCH_COLUMN = 'Stock Name'`) at the top of
that route file — change it there if the column you want to search on ever
changes; it's intentionally not a request parameter or a UI dropdown.

## Automatic history cleanup (90-day retention)

The daily cron job (`/api/cron/sync-sheets`) runs `lib/pruneSnapshots.ts`
right after syncing every sheet. It deletes any snapshot older than 90 days,
**except it always keeps at least the single most recent snapshot per
sheet**, even if that one is itself older than 90 days (so a sheet that
hasn't synced successfully in a while never ends up with zero data).
Deleting a snapshot cascades to delete its rows in `sheet_rows`
automatically via the foreign key.

To change the retention window, edit the `90` passed to `pruneOldSnapshots()`
in `app/api/cron/sync-sheets/route.ts`.

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in every value, including:

```
BOOTSTRAP_ADMIN_EMAILS=you@company.com
```

This auto-approves and grants admin to that email the first time you sign
in — without it you'd have no way to reach the admin page on a fresh
install. You can add more comma-separated emails.

Generate `NEXTAUTH_SECRET` with:
```
openssl rand -base64 32
```

Generate `CRON_SECRET` the same way (any random string works).

## 6. Run locally

```
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in with the email listed in
`BOOTSTRAP_ADMIN_EMAILS` — you'll land as an approved admin immediately.
Any other Google account that signs in will show "access pending approval"
until you approve them at `/admin`.

## 7. Deploy to Vercel

1. Push this repo to GitHub, import it in Vercel.
2. Add all the same environment variables in **Project Settings →
   Environment Variables**.
3. Vercel automatically picks up `vercel.json`'s cron schedule (every 5
   minutes) once deployed — no extra setup needed. It also automatically
   sends the `Authorization: Bearer $CRON_SECRET` header to your cron route
   as long as `CRON_SECRET` is set as an env var.
4. Update the OAuth redirect URI in Google Cloud Console to your production
   domain (`https://your-app.vercel.app/api/auth/callback/google`), and
   update `NEXTAUTH_URL` accordingly.

## How the pieces fit together

- **Google Sign-In** tells the app who's viewing — it does not by itself
  grant access to any data.
- **`status` on the `users` table** (`pending` / `approved` / `blocked`) is
  the actual gate. New sign-ins default to `pending`. An admin approves
  them at `/admin`.
- **The service account** reads the actual spreadsheet — it's a separate
  identity from any human user, so nobody needs "Share" access on the
  Google Sheet itself.
- **The watermark** is rendered from the signed-in user's own session and
  overlays every page — it's a deterrent (identifies who saw the data),
  not a technical prevention of copying, screenshotting, or OCR.

## Collecting name and phone number

Google OAuth doesn't provide a phone number, so it's collected separately:

1. A user signs in with Google (`status: 'pending'`, no `phone` yet).
2. `middleware.ts` checks every request's JWT — if `phone` is missing, the
   user is redirected to `/complete-profile` no matter what page they were
   trying to reach (except sign-in/out routes and the profile page itself,
   which stay reachable so they're never stuck).
3. They submit name + phone on that page (`app/api/profile/route.ts`
   validates and saves it to `users`).
4. The session/JWT is refreshed (`useSession().update()`), and they're sent
   to the home page. From then on `middleware.ts` lets them through — the
   usual `pending`/`approved`/`blocked` gate (checked at the page and API
   level, same as before) still applies on top of this.

Both fields are visible to admins in the `/admin` user list. This is a
one-time gate — it doesn't ask again once a phone number is on file, and an
admin can currently only see/edit it via direct Supabase access (there's no
in-app "edit user" form yet).

## Known limitations to revisit as you scale

- Cached-mode sorting currently only orders by original row position — add
  jsonb `->>'field'` ordering or generated columns if you need to sort by
  arbitrary columns server-side.
- Cached-mode search does a full jsonb-as-text scan — fine up to tens of
  thousands of rows; add targeted indexed columns for heavily-searched
  fields beyond that.
- The cron sync does a full delete-and-reinsert per sheet — fine for
  moderate sizes; switch to a diffing upsert keyed on a stable row ID for
  very large sheets that sync frequently.
