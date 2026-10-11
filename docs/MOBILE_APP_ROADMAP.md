# DUGSI PRO Web + Mobile Delivery Roadmap

**Status:** Proposed implementation plan  
**Existing production:** React 19 + TypeScript + Vite web SPA served by Express on Render  
**Database:** Existing Supabase project and `dugsiga_*` tables  
**Allowed application roles:** `admin` and `teacher` only  
**Out of scope:** Guardian/student sign-in, a second database, an immediate rewrite of the production web app

## 1. Architecture decision

Keep the current web application and its Render service running. Add a separate native client under `apps/mobile/` using Expo, React Native, TypeScript and Expo Router. Android and iOS will use the same Express API and Supabase data as the web application; they will not create their own copy of school records.

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
- Store the refresh token in OS-backed secure storage on the device (Expo SecureStore), not AsyncStorage or ordinary preferences. Keep access tokens in memory where practical.
- Resolve `role`, `school_id`, teacher ID and assigned classes from trusted server/database records, never from client-supplied values.
- Preserve existing web cookie behavior. The mobile client sends the access token in `Authorization: Bearer …` and never receives any service-role or secret key.
- Apply login rate limiting, generic credential errors, token-expiry handling and audit-safe logging. Never log passwords, access tokens or refresh tokens.
- Add permission checks to all reused API routes that the audit identifies as relying on UI-only restrictions.

**Gate:** web login/logout remains unchanged; mobile login, refresh, logout and expired/revoked-session behavior pass API integration tests; an unauthenticated request cannot access private data.

### Phase 2 — Native app foundation

Create `apps/mobile/` as an independently buildable Expo app, without replacing the current Vite web entrypoint.

- Configure Expo Router, TypeScript, DUGSI PRO brand assets, app name, Android package ID and iOS bundle ID.
- Build a mobile API client with a single configured API base URL, JSON/error normalization, timeout and safe retry rules. Never retry non-idempotent writes blindly.
- Add secure session restoration, token refresh, logout and a clear session-expired state.
- Implement adaptive navigation and reusable components: loading, empty, error, offline, confirmation, input validation, data list and detail view.
- Add development, preview and production configuration. Commit lockfiles; publish no secrets in `EXPO_PUBLIC_*` variables except the public API URL and any explicitly approved public settings.

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
- Add push notifications via Expo Notifications only with user permission and a server-side device-token registry. Do not put sensitive student information in lock-screen notification text by default.

**Gate:** airplane-mode attendance can be queued and synced without duplicates; conflicts and failed syncs remain visible; revoked users cannot continue syncing protected writes.

### Phase 6 — Release readiness

1. Ship preview builds to a small internal test group first.
2. Validate on physical Android devices and an iOS simulator/device, with slow connections, expired sessions, app restarts and OS permission denial.
3. Produce an Android APK for internal installation; produce Android App Bundle / iOS archive for stores only when the relevant store accounts, signing and ownership are ready.
4. Use Expo EAS Build / Submit for native artifacts and release automation. Render remains the web/API host; a mobile binary is not deployed to Render.
5. Release gradually, monitor API error rates and auth failures, and keep a rollback path for each API/schema change.

**Gate:** release checklist signed off; no critical/high security defects; all P0 role and tenant-isolation tests pass; support and versioning details documented.

## 3. Required automated test matrix

| Area | Required tests |
|---|---|
| Web regression | Existing TypeScript check, student/attendance contract tests, production build, server smoke test and production dependency audit. |
| Native quality | TypeScript, lint, Expo Doctor, unit tests and Android/iOS JavaScript bundle exports in CI. |
| Authentication | Correct/incorrect login, inactive/invited teacher denial, access-token expiry, refresh rotation, replayed refresh token, logout and password/session failures. |
| Roles | Admin allowed; teacher denied for admin-only routes; teacher can see only assigned classes; unknown roles denied by default. |
| Tenant security | A user from school A cannot read, create, update, export or delete school B records by changing IDs or request bodies. |
| Attendance | Duplicate submissions, edits, double sessions, offline queue, retries, conflict resolution and audit record. |
| Shared data | Create/update a safe test record on web and verify the same record through mobile API, and the reverse. Clean up only test fixtures. |
| Devices | Small screen, keyboard overlap, screen-reader labels, app background/foreground, poor connectivity and signed-out navigation. |
| Release | Preview builds, install/uninstall, app upgrade, signing and basic production smoke tests. |

CI should retain the existing root web job and add a separate mobile job that installs from `apps/mobile`'s lockfile, runs quality checks and exports Android/iOS bundles. A signed EAS production build should be a manual/release workflow, not a requirement for every pull request.

## 4. Security and database migration rules

- Add only backward-compatible migrations at first; never drop or rename production columns as part of mobile MVP work.
- Test migrations on a non-production Supabase environment, inspect security/performance advisors, then apply them with a reviewed migration file and a recovery plan.
- Maintain RLS on exposed tables. Keep service-role access server-side and restrict the native app to the Express API until a separate, deliberate authorization review approves another approach.
- Validate input and authorization server-side, scope every query by the authenticated `school_id`, and enforce class-level restrictions for teachers.
- Keep access tokens short-lived and refresh tokens hashed, rotated and revocable. Do not expose session secrets, SMTP/Gemini keys or database credentials in client bundles.
- Treat logs, local cache, exports and push notifications as potentially sensitive. Clear cached protected data on logout/account switch and define how device compromise/lost devices are handled.

## 5. Official implementation references

- Expo Router: https://docs.expo.dev/router/introduction/
- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo build setup: https://docs.expo.dev/build/setup/
- Supabase + Expo React Native quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase security checklist: https://supabase.com/docs/guides/security/product-security/

## Recommended first implementation slice

Start Phase 1 and the minimal Phase 2 shell in a dedicated feature branch. Deliver secure mobile-session APIs plus login/logout screens and API-level tests first. Do not begin offline sync, push notifications, finance writes or a whole-web rewrite until that slice passes its acceptance gate.
