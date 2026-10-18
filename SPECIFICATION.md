# HRIS DTR v1 — Specification

Status: **grilling complete (confirmed by user); implementation paused after TODO #4** (2026-10-18).

---

## 1. Architecture & Design Specification

### 1.1 Scope & phase

- Real tool for a small team, but **v1 is a local demo**: `npm run dev` at `localhost:3000`, HTTP, **computer browsers only** (no responsive/mobile/PWA work — smartphone aspect was explicitly dropped in Round 5, superseding earlier decisions).
- Later-version concerns (explicitly out of v1): public VPS deployment ("punch from anywhere"), SMTP/email, CSV export, localization, SSO, geo-fencing, native phone app.
- **English-only** UI.

### 1.2 Stack (settled in grilling)

| Concern | Choice |
|---|---|
| Framework | Next.js 16.4 (App Router, TypeScript) — user rejected Java/Spring and Laravel |
| Database | SQLite file (`data/hris.db`), zero-ops |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI primitives — **`render` prop, not Radix `asChild`**) |
| Passwords | bcryptjs (hashed), min 8 chars |
| Sessions | Cookie-based (`hris_session`, httpOnly, sameSite=lax, 7-day TTL), DB-backed session rows; token issuance for a future app deferred |
| Rendering | `cacheComponents: true` (scaffold default); authenticated routes use `export const instant = false` per the bundled Next 16 docs' auth guide |
| Data access | Route handlers for all mutations; server components read via `src/lib/*` (route handlers kept as normal Next.js structure, **no future-native-app promise**) |

### 1.3 Data model (SQLite, all timestamps stored as **UTC epoch milliseconds**)

- `users` — id, username (unique), full_name, email?, password_hash, role (`admin`|`employee`), active (1/0), created_at. **Deactivate only, never delete** (punch history preserved).
- `sessions` — token PK, user_id FK, created_at, expires_at.
- `punches` — **event log**: id, user_id FK, punched_at, ip (accountability only, not gating), created_at. Index `(user_id, punched_at)`. Sessions/pairs are **derived at display time**, never stored.
- `corrections` — id, user_id FK, punch_id FK? (NULL = adding a missing punch), target_date (`YYYY-MM-DD` office tz), proposed_at (UTC ms), reason (required), status (`pending`|`approved`|`rejected`), admin_note?, reviewed_by?, reviewed_at?, old_value?, new_value?, created_at. Full audit trail is mandatory.
- `settings` — key/value (officeName, officeTimezone).

Migrations: `src/lib/db.ts` executes `CREATE TABLE IF NOT EXISTS` schema on first connection (WAL + foreign_keys pragmas). No migration tool for v1.

### 1.4 Business rules

- **Punching**: single status-aware toggle button ("Punch In"/"Punch Out"); server sets the timestamp (client never sends a time); **60-second cooldown** per user; IP logged from `x-forwarded-for`.
- **Pairing**: same-calendar-day only (office tz) — **no overnight sessions**; odd count of punches in a day = unpaired IN ("Missing time out"), resolved only via correction. Arbitrary punch counts per day (lunch in/out supported; IN/OUT derived by even/odd position).
- **Timezone**: store UTC, display in a single office timezone (default `Asia/Manila`, configurable in Settings). Helpers in `src/lib/tz.ts` (`dayKey`, `formatClock`, `parseLocalDateTime`, …).
- **Corrections flow**: employee picks a day row in their DTR → "Report incorrect time" → mode = adjust existing punch (choose punch) or missing punch (add) → corrected time + required reason → admin Approve (applies punch change/add + writes old→new audit) or Reject (**note required**). Status visible to employee; no retraction; proposed times must be in the past; one pending request per punch.
- **No direct admin edits** — every change to punches goes through the correction flow, including the admin's own records (admin approves their own requests; single-admin teams).
- **Home routing**: empty DB → `/setup` (one-time "Create initial admin"); no session → `/login`; admin → `/admin`; employee → `/punch`.
- **Roles**: Employee + Admin. Admin is also an employee (own punch + DTR). Nav shows admin links only to admins, with a pending-corrections count badge.

### 1.5 Screens

- **Employee**: `/punch` (status card + toggle + today's punch list), `/dtr` (monthly grid: rows = days, cols = punches + first-in/last-out + status; "Report incorrect time" per row; "My correction requests" table below).
- **Admin** (`/admin`): Employees (create/edit/deactivate/role/password reset), Punch Log (filter by employee + date range, shows IN/OUT kind + IP), Corrections queue (Pending/All tabs, approve w/ confirmation dialog, reject w/ required note), DTR View (employee picker + month grid, read-only), Settings (office name + timezone).
- Auth screens: `/login`, `/setup`. No dashboard.

### 1.6 Seeding (`npm run seed`)

Aborts if users exist. Creates admin `admin/admin123`, 5 employees (`jreyes`, `asantos`, `mcruz`, `lgarcia`, `rlim` / `password123`), ~35 days of weekday punch history (some missed lunches/outs), and one pending correction (Ana Santos, missing out-punch, yesterday, 17:30).

### 1.7 Environment facts a new session must know

- Next 16.4 docs live in `node_modules/next/dist/docs/` — **read before coding** (repo AGENTS.md rule). `cookies()` is async; `LayoutProps`/`PageProps`/`RouteContext` globals need `npx next typegen` (already generated once).
- shadcn v4 here is **Base UI**: no `asChild`; use `render={<Button … />}` on `DialogTrigger` etc.; `Select.onValueChange(value: string | null, details)`.
- React Compiler lint (`react-hooks/purity`) **bans `Date.now()` in components** — use `nowMs()` from `src/lib/tz.ts` instead.
- `.gitignore` at repo root was the original empty file; replaced with Next's template + `/data/`.
- User's global git config has `commit.gpgsign = true` — **never commit unless asked** (it triggers their OpenPGP prompt).

---

## 2. TODO checklist

- [x] **#1** Scaffold Next.js+TS+Tailwind+shadcn/ui project at repo root
- [x] **#2** SQLite data layer: schema (users, punches, corrections, settings) + migrations — *done, see §3*
- [x] **#3** Auth: cookie sessions, bcrypt, login page, first-run create-admin screen — *done, see §3*
- [x] **#4** Employee punch flow: status toggle, event log write, 60s cooldown — *done, see §3*
- [ ] **#5** Employee DTR: monthly grid + correction request form
- [ ] **#6** Admin screens: employees, punch log, corrections queue, DTR view, settings
- [ ] **#7** Seed script: demo employees, punch history, pending correction
- [ ] **#8** Verify: lint, typecheck, build, smoke test full flows

---

## 3. Implementation state notes

### TODO #2 — COMPLETE (verified)

- `src/lib/db.ts` — connection singleton (WAL, FK on), inline `SCHEMA`, opens `data/hris.db` (gitignored), creates on demand. This is the entire "migration" story for v1.
- Supporting modules, all written and **typecheck-clean**:
  - `tz.ts` — Intl-based office-tz helpers + `nowMs()` (lint-safe `Date.now` wrapper)
  - `session.ts` — DB-backed cookie sessions (async `cookies()` correctly awaited)
  - `auth.ts` — `requireUser`/`requireAdmin` (redirect-based; **never wrap in try/catch in route handlers** — it swallows `NEXT_REDIRECT`)
  - `users.ts`, `punches.ts`, `corrections.ts` (incl. approve/reject with audit), `settings.ts`, `dtr.ts` (same-day pairing, month grid builder)
- **Verification performed** (2026-10-18): `tsc --noEmit` → clean; live `tsx` smoke → all 6 tables created; user CRUD, punch insert/range/last, tz roundtrip (`2026-10-18 08:30 Asia/Manila` correct), settings roundtrip all pass; test rows cleaned (db has 0 users, ready for setup/seed).

### TODO #3 — COMPLETE (verified)

Live smoke suite against `next dev` (curl, cookie jars), all PASS:

- **Routing**: empty DB `/` → `/setup`; logged-out `/` and `/admin/*` → `/login`; session user `/` → `/admin` (role-correct redirect).
- **Setup**: valid create-admin → 200 + `hris_session` cookie + `/admin`; second setup → 409; page `/setup` redirects to `/login` once users exist; validation on fresh DB: short password / bad username / missing fields → 400 with messages.
- **Login/logout**: wrong password → 401; valid → 200 + cookie; **inactive user → 401 by design** (generic "Invalid username or password" — no account-state disclosure, intentional); empty body → 400; logout → 200 and cookie cleared.
- **Page renders with session**: `/admin/employees` 200 (shows created user), `/dtr` 200, `/punch` 200.
- **Repo-wide gates (first ever run of build)**: `npm run lint` clean (all `react-hooks/purity` `Date.now` uses routed through `nowMs()` from `src/lib/tz.ts`), `tsc --noEmit` clean, **`npm run build` PASSES** (routes all `ƒ Dynamic` except `/login`, `/setup` static — correct).
- **Dev-console noise (benign, known)**: `instant = false` on root layout is the *sanctioned* opt-out for session-reading routes per `authentication-with-cache-components.md`; dev still logs "Could not validate `instant` … NEXT_REDIRECT" and "unstable value `Date.now()` while prerendering" — **dev-only, build unaffected** (verified). Do not chase these; the doc's "cookies() outside Suspense is a build error" applies to routes without the opt-out.
- Wipe-down done: `data/` removed (fresh start for next session), dev server killed.

### TODO #4 — COMPLETE (verified)

Files: `src/app/api/punch/route.ts`, `src/app/(app)/punch/page.tsx`, `punch-button.tsx`, `src/lib/punches.ts`, `tagKinds`/`pairDay` in `src/lib/dtr.ts`.

- **Bug fixed during review**: dead "Unbalanced punch count" branch in `punch/page.tsx` (condition `!clockedIn && punches.length % 2 === 1` was mutually exclusive with `clockedIn = length % 2 === 1`) — removed. The "still clocked in" reminder covers the in-progress case.
- **Live smoke (curl, admin user acting as employee — admin punches via same flow)**: no session → 401; punch in → 200 with server-set `punched_at` + `ip` = first `x-forwarded-for` hop; page shows clocked-in state, Punch Out button, reminder, numbered IN/OUT punch list (parity correct through 4 punches); **cooldown → 429 "Please wait 60s…"** on both punch-out and next punch-in; punch out → 200, page flips to clocked-out with last-punch time-out label; event log = exactly one row per punch (4 rows after 4 punches).
- **Test-harness gotchas (NOT app bugs, recorded so the next session doesn't repeat them)**: curl `-c JAR` without `-b JAR` **overwrites the jar empty** when the response has no Set-Cookie (this caused an entire false "all 401" suite); curl writes HttpOnly cookies as `#HttpOnly_…` lines — don't `grep -v '^#'` jars; React SSR text nodes are joined by `<!-- -->` — strip before grepping page HTML.
- Repo gates after #4: `npm run lint` clean, `tsc` clean, `npm run build` PASSES.

### Important: code for TODOs #5–#7 already exists but is UNVERIFIED

Written before the pause, compiles (`tsc` clean), **`npm run build` passes with them included**, but **not yet exercised at runtime** (except incidental 200s during the auth suite):

- **#5 DTR**: `/dtr` page, `components/dtr/dtr-table.tsx` (+ `MonthNav`, `toDtrDays`), `correction-dialog.tsx`, `/api/corrections`. (lib half — `tagKinds`/`pairDay`/`buildMonthDtr` — exercised incidentally via the punch page; believed sound.)
- **#6 Admin**: full `/admin/*` set + all `/api/admin/*` routes (see file list in `src/app`).
- **#7 Seed**: `scripts/seed.ts` written but **never run**.

Remaining work for the next session:

1. `npm run seed` (aborts if users exist — `data/` is currently empty) then `npm run dev` smoke: DTR grid → correction request → admin approve/reject → punch log filters → settings save.
2. Re-run lint/tsc/build at the end (all clean as of this pause, but re-verify after #5–#7 edits).
3. `next typegen` was run once; re-run if route types go stale.

Nothing has been committed to git (working tree only). Do not commit unless explicitly asked.
