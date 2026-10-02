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

- `SESSION_SECRET` — a long random secret; the Blueprint is configured to generate one.
- `APP_URL` — your live Render URL.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

Add `GEMINI_API_KEY` and SMTP variables when those services are enabled.

## Security notes

Browser sessions use an HttpOnly, SameSite cookie. Authorization tokens are not persisted in localStorage. Protected API routes enforce authenticated sessions, tenant isolation, and role-based permissions.

