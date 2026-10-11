# DUGSI PRO 2026

DUGSI PRO 2026 is a modern school management web application for students, attendance, academics, finance, staff, admissions, library, inventory, reports, and school operations.

## Stack

- React 19 + TypeScript
- Vite 6
- Express
- Supabase
- Tailwind CSS v4
- PWA support
- Motion + Lucide
- Recharts
- jsPDF / Excel import-export

## Local development

Prerequisites: Node.js 22+

```bash
npm ci
npm run dev
```

The development server runs the Vite SPA through Express.

## Production build

```bash
npm ci
npm run build
npm start
```

The production server serves the compiled SPA and API from the same Express process.

## Verification

The repository includes:

```bash
npm run lint
npm run test:students-contract
npm run test:attendance-contract
npm run test:auth-contract
npm run test:auth-session
node scripts/server-smoke.mjs
npm run build
```

The GitHub Actions workflow runs type-checking, student production contract checks, the production build, the runtime smoke test, and a production dependency audit.

## Render deployment

The repository includes `render.yaml` for a Render web service.

Build command:

```
npm ci && npm run build
```

Start command:

```
npm start
```

The Render service is configured for Node 22, production mode, and a health check on `/`.

### Required environment variables

Set the following in Render:

- `SESSION_SECRET` — a persistent random secret of at least 32 characters. Production refuses to start without it.
- `APP_URL` — your live Render HTTPS URL. Password-reset links are not generated from an untrusted Host header.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — configure these to deliver password recovery and teacher invitation emails. Password recovery intentionally does not expose reset tokens in API responses or logs.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

Add `GEMINI_API_KEY` and SMTP variables when those services are enabled.


### Authentication database migration

Before deploying the password-recovery endpoints, apply
`supabase/migrations/20261011_authentication_recovery.sql` in the Supabase SQL Editor.
The migration adds expiry/hash fields for one-time password-reset tokens. The canonical
`DUGSI_PRO_2026_ALL_TABLES.sql` and in-app SQL setup were updated too, but existing databases
must run the migration explicitly.

Production authentication fails closed when the cloud identity database is unavailable;
it will not authenticate users from ephemeral local JSON files. Signup issues a secure
HttpOnly session cookie, and cloud login never accepts a stale local password as a substitute
for the current Supabase password.

## Security notes

Browser sessions use an HttpOnly, SameSite cookie. Authorization tokens are not persisted in localStorage. Protected API routes enforce authenticated sessions, tenant isolation, and role-based permissions.

