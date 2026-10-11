# DUGSI PRO Web + Mobile Delivery Roadmap

**Status:** Capacitor implementation is being prepared on a dedicated GitHub branch; native scaffolds and CI must pass before merging.  
**Existing production:** React 19 + TypeScript + Vite web SPA served by Express on Render  
**Database:** Existing Supabase project and `dugsiga_*` tables  
**Allowed application roles:** `admin` and `teacher` only  
**Out of scope:** Guardian/student sign-in, a second database, an immediate rewrite of the production web app

## 1. Architecture decision

Keep the current web application and Render service running. Package the existing React/Vite application with Capacitor for Android and iOS, using a distinct `dist-mobile/` web bundle so the native assets can never overwrite Render's `dist/server.cjs`. The mobile build targets the shared Express API at `https://samatar-project.onrender.com`; it does not create a second backend or database. This first delivery reuses the responsive web UI inside the native WebView; genuinely native screens and platform-specific workflows remain later enhancements.

Keep one authoritative permission model. Resolve the school ID, account role and teacher's assigned classes on the server. The native UI may hide actions for usability, but the API must enforce every permission on every request.

### What the repository currently tells us

- The web client is React 19 / TypeScript / Vite; Express serves the production web build and `/api/*` endpoints.
- The backend uses custom signed sessions and the `dugsiga_users` / `dugsiga_teachers` records. The browser login endpoint issues an HttpOnly `dugsi_session` cookie and currently does not return the access token in its JSON response.
- The existing request-authentication code accepts a Bearer token as well as the browser cookie. This is a useful foundation, but native login, refresh, rotation, secure storage and device logout are not yet a complete mobile-session lifecycle.
- The Supabase public tables have RLS enabled and existing policies restricted to `service_role`. That matches an API-mediated design: do not expose a Supabase service-role/secret key to the native binary and do not bypass the current server-side role/tenant rules.
- Preserve the live web login contract while adding native authentication. Do not migrate existing password records to Supabase Auth as part of the first mobile release.

## 2. Delivery phases and acceptance gates

### Phase 0 — Baseline and safety

1. Record the currently passing web CI suite and production commit before code changes.
2. Map each existing module to its API endpoint, read/write behavior, admin/teacher permissions, and current contract test.
3. Establish a development/test database environment (a Supabase development branch or separate non-production project if available) before testing schema changes. Never use production school records as test fixtures.
4. Agree the first release scope: teacher daily work and essential admin operations; later modules remain in the current web app until added and tested on mobile.

**Gate:** current web checks pass, the API/role matrix is written down, and a non-production database is available for database-writing tests.

### Phase 1 — Secure shared API authentication

Add native-only endpoints alongside the existing browser flow:

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/refresh`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/auth/me`

Implementation requirements:

- Reuse the existing credential verification and account activation rules; refactor shared logic if needed rather than maintaining two independent password-checking implementations.
- Return an access token only from the native login endpoint, with an explicit expiry. Keep access tokens short-lived; use refresh-token rotation for longer sessions.
- Store only a hash of each opaque refresh token on the server. Persist device/session state in an additive Supabase migration; revoke refresh tokens on logout, rotation reuse or account deactivation.
- Keep the short-lived access token in memory and store it only in OS-backed secure storage (iOS Keychain / Android Keystore via `@aparajita/capacitor-secure-storage`), never in localStorage or ordinary preferences.
- Resolve `role`, `school_id`, teacher ID and assigned classes from trusted server/database records, never from client-supplied values.
- Preserve existing web cookie behavior. The mobile client sends the access token in `Authorization: Bearer …` and never receives any service-role or secret key.
- Apply login rate limiting, generic credential errors, token-expiry handling and audit-safe logging. Never log passwords, access tokens or refresh tokens.
- Add permission checks to all reused API routes that the audit identifies as relying on UI-only restrictions.

**Gate:** web login/logout remains unchanged; mobile login, refresh, logout and expired/revoked-session behavior pass API integration tests; an unauthenticated request cannot access private data.

### Phase 2 — Native app foundation

Build Capacitor Android/iOS shells alongside the existing root React/Vite application; do not create a second frontend or replace the current web entrypoint.

- Use `capacitor.config.json` with app ID `com.dugsipro.app` and the isolated `dist-mobile` output directory.
- Build the existing responsive React UI with `vite build --mode mobile`, relative asset URLs and no competing PWA service worker.
- Keep one configured API base URL in `.env.mobile`; this public URL is configuration, not a secret. Never place Supabase keys, SMTP credentials or session secrets in the mobile bundle.
- Add secure session restoration with iOS Keychain / Android Keystore, bearer-token API calls, logout and a clear expired-session state. Refresh-token rotation and persistent device revocation remain a separate security gate before a commercial release.
- Generate and commit the Android and iOS Capacitor projects; run `cap sync` whenever the web bundle or native plugin list changes.
- Keep both `package-lock.json` and `bun.lock` synchronized so GitHub CI and Render installs remain deterministic.

**Gate:** the app opens on Android and iOS, can sign in/sign out, handles invalid credentials and lost network gracefully, and the web deployment build is still green.

### Phase 3 — Mobile MVP

Deliver in this order so the core daily workflows are stable before broadening scope.

**Teacher**
- Dashboard for assigned classes and today's work.
- Class-limited student list and student profile with only data the teacher is allowed to view.
- Mark attendance, review the daily register and view history.
- View assigned timetable, announcements and relevant student academic information.

**Admin**
- Dashboard and student directory; add/edit student using server-side validation.
- Classes and attendance oversight.
- Teacher and school operational summaries.
- Finance at first as read-only summaries; financial writes stay in the web app until the mobile financial rules and audit trail are independently tested.

There will be no guardian or student login in this app. Shared navigation must reflect the existing `admin` / `teacher` contract rather than inventing new roles.

**Gate:** a change saved on web appears on mobile and vice versa; teachers cannot access another school's data or an unassigned class; admin-only mutations return 403 for teachers; duplicate attendance writes are prevented or handled idempotently.

### Phase 4 — Extend module coverage

Add modules incrementally based on usage: exams/results, admissions, finance workflows, receipts, staff, timetable management, library and inventory. Each module needs a written role matrix, data validation, loading/error/empty states, and module-level tests before release. Keep modules desktop-first on web where they are not yet practical on phones.

**Gate:** each module has API, authorization, regression and native UI coverage before being enabled in production.

### Phase 5 — Offline use and notifications

Do this only after online attendance is reliable.

- Queue only explicitly supported offline actions (initially attendance), with unique idempotency keys, created-at timestamps, retry limits and visible sync status.
- On reconnect, validate permissions again on the server and handle conflicts visibly; never silently overwrite newer server records.
- Add push notifications through Capacitor Push Notifications only with user permission and a server-side device-token registry. Do not put sensitive student information in lock-screen notification text by default.

**Gate:** airplane-mode attendance can be queued and synced without duplicates; conflicts and failed syncs remain visible; revoked users cannot continue syncing protected writes.

### Phase 6 — Release readiness

1. Ship preview builds to a small internal test group first.
2. Validate on physical Android devices and an iOS simulator/device, with slow connections, expired sessions, app restarts and OS permission denial.
3. Produce an Android APK for internal installation; produce Android App Bundle / iOS archive for stores only when the relevant store accounts, signing and ownership are ready.
4. Use Android Gradle tooling for APK/AAB output and Xcode on macOS for iOS archives; code signing and store submission require the appropriate developer accounts. Render remains the web/API host; a mobile binary is not deployed to Render.
5. Release gradually, monitor API error rates and auth failures, and keep a rollback path for each API/schema change.

**Gate:** release checklist signed off; no critical/high security defects; all P0 role and tenant-isolation tests pass; support and versioning details documented.

## 3. Required automated test matrix

| Area | Required tests |
|---|---|
| Web regression | Existing TypeScript check, student/attendance contract tests, production build, server smoke test and production dependency audit. |
| Native quality | TypeScript, lint, Capacitor configuration/sync checks, unit tests, an Android Gradle build in CI and iOS project validation on a macOS runner. |
| Authentication | Correct/incorrect login, inactive/invited teacher denial, access-token expiry, refresh rotation, replayed refresh token, logout and password/session failures. |
| Roles | Admin allowed; teacher denied for admin-only routes; teacher can see only assigned classes; unknown roles denied by default. |
| Tenant security | A user from school A cannot read, create, update, export or delete school B records by changing IDs or request bodies. |
| Attendance | Duplicate submissions, edits, double sessions, offline queue, retries, conflict resolution and audit record. |
| Shared data | Create/update a safe test record on web and verify the same record through mobile API, and the reverse. Clean up only test fixtures. |
| Devices | Small screen, keyboard overlap, screen-reader labels, app background/foreground, poor connectivity and signed-out navigation. |
| Release | Preview builds, install/uninstall, app upgrade, signing and basic production smoke tests. |

CI should retain the existing root web job and validate the separate `dist-mobile` build plus native project scaffolds. Once the initial setup is stable, add dedicated Android Gradle and macOS/Xcode validation jobs. Signed store builds should be manual/release workflows, not a requirement for every pull request.

## 4. Security and database migration rules

- Add only backward-compatible migrations at first; never drop or rename production columns as part of mobile MVP work.
- Test migrations on a non-production Supabase environment, inspect security/performance advisors, then apply them with a reviewed migration file and a recovery plan.
- Maintain RLS on exposed tables. Keep service-role access server-side and restrict the native app to the Express API until a separate, deliberate authorization review approves another approach.
- Validate input and authorization server-side, scope every query by the authenticated `school_id`, and enforce class-level restrictions for teachers.
- Keep access tokens short-lived and refresh tokens hashed, rotated and revocable. Do not expose session secrets, SMTP/Gemini keys or database credentials in client bundles.
- Treat logs, local cache, exports and push notifications as potentially sensitive. Clear cached protected data on logout/account switch and define how device compromise/lost devices are handled.

## 5. Official implementation references

- Capacitor configuration: https://capacitorjs.com/docs/config
- Capacitor CLI workflow: https://capacitorjs.com/docs/cli/commands/add
- Capacitor environment setup: https://capacitorjs.com/docs/getting-started/environment-setup
- Capacitor 8 upgrade/support notes: https://capacitorjs.com/docs/updating/8-0
- Supabase security checklist: https://supabase.com/docs/guides/security/product-security/

## Recommended first implementation slice

Finish the dedicated Capacitor feature branch first: regenerate both lockfiles, create native project scaffolds, run web and mobile-contract checks, validate the Render web build, and verify the restricted native CORS/token flow. Do not call this store-ready yet; refresh-token rotation, persistent revocation, real Android/iOS device testing and release signing must pass their later acceptance gates.
