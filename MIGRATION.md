# Tenure dashboard — Supabase → Neon

The page no longer talks to a database. It calls this site's own `/api` routes,
which hold the Neon connection string server-side. Nothing secret ships to the browser.

```
index.html  ──fetch──▶  /api/months      GET   distinct months
                        /api/employees   GET   ?month=YYYY-MM
                        /api/login       POST  { code }  → HttpOnly session cookie
                        /api/upload      POST  { month, employees }  (admin only)
                                    │
                                    └──▶ Neon Postgres (DATABASE_URL, server-side only)
```

The Excel parsing still happens in the browser; only the parsed rows are POSTed.

## 1. Create the table

Run `schema.sql` in the Neon SQL editor, in the **same project as Demographics**.

> Check first that this project has no `employees` table already:
> `select to_regclass('public.employees');` — expect `null`.

## 2. Set environment variables (Vercel → tenure → Settings → Environment Variables)

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (the one ending `-pooler...`) |
| `ADMIN_CODE` | the upload code — replaces the old hard-coded `ak_2026` |
| `SESSION_SECRET` | 32+ random bytes, e.g. `openssl rand -hex 32` |

Set all three for Production **and** Preview. Missing values make `/api/login` return
a 500 rather than silently letting anyone in.

## 3. Deploy

`git push` — Vercel installs `@neondatabase/serverless` from `package.json` and picks
up `api/*.js` as serverless functions automatically. No config file needed.

## 4. Re-upload the six registers

Feb–Jul 2026 must be re-uploaded through the fixed parser. The Supabase copy has
every Cape Town AWOL misfiled as Resigned, and that cannot be repaired in SQL —
the distinction was lost when the file was first parsed.

Upload oldest → newest. Each upload replaces that month/branch in one transaction.

## 5. Close the old door

The Supabase anon key is in this repo's git history and `public.employees` has RLS
**disabled**, so that key still grants full read/write to the old table. After you have
confirmed Neon has all six months:

```sql
-- Supabase SQL editor. Archive first if you want the old rows.
alter table public.employees enable row level security;   -- no policies = no anon access
-- then, once you are sure:
-- drop table public.employees;
```

`public.Guests` and `public.monthly_rosters` also have RLS disabled but belong to other
apps — check what reads them before touching those.

## What changed in the app

- Supabase JS SDK and the anon key: gone.
- `ak_2026` in page source: gone. The code is checked server-side; success sets an
  HttpOnly/Secure/SameSite=Strict cookie that expires after 8 hours.
- Upload is now one transaction (delete + insert). A failure leaves the month intact —
  previously a failed insert after a successful delete emptied it.
- A unique index on `(month, branch, emp_code)` blocks double imports.
- Realtime subscription: removed. The uploader refreshes after upload.

## Local development

`npx vercel dev` with the three variables in `.env.local`. Cookies work on localhost.
