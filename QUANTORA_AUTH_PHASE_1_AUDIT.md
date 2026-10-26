# Quantora Auth Integration — Phase 1 Audit

**Taariikhda audit-ka:** 2026-10-26  
**Repository:** `som216469-star/samatar-project`  
**Base:** `main`  
**Nooca isbeddelka:** Dukumenti audit oo keliya; lama beddelin app code ama database.  
**Go'aanka:** Audit-ka waa la diiwaangeliyey. **Phase 2 weli waa xanniban tahay** ilaa tijaabooyinka la ordo oo natiijooyinkooda la xaqiijiyo.

## 1. Xuduudaha iyo badbaadada

- Koodhka waxaa laga akhriyey GitHub `main`; Supabase waxaa laga sameeyey metadata iyo SQL `SELECT`-yo akhris-keliya.
- Lama akhrin/soo bandhigin password hashes, email addresses ama secret values.
- Lama beddelin Supabase schema, records, Auth users, Render environment variables ama production settings.
- Production deploy lama bilaabin.
- Render environment values lagama xaqiijin karo `render.yaml` oo keliya; xaqiijinta `SUPABASE_URL` ee service-ka live-ka ah waxay u baahan tahay Dashboard read-only check, iyada oo aan la wadaagin secrets.

## 2. File inventory

| File | Waxa laga hubiyey |
|---|---|
| `package.json` | Dependencies iyo scripts-ka lint/build/contract tests |
| `server.ts` | Custom login/signup/logout, Supabase server client, middleware, role permissions, tenant scoping |
| `server/authSession.ts` | Session signing/expiry/revocation, password hashing iyo legacy password support |
| `server/teacherAuthRoutes.ts` | Teacher invitation, activation, tenant checks iyo cloud persistence |
| `server/modernRoutes.ts` | Tenant filters ee modules-ka casriga ah |
| `server/financeRoutes.ts` | Finance authorization iyo tenant checks |
| `src/App.tsx` | Frontend-ka wuxuu isticmaalaa Express auth API |
| `src/lib/authStorage.ts` | Web session handling iyo native token storage |
| `src/types.ts` | Frontend AuthUser role type |
| `scripts/auth-cloud-source-contract.mjs` | Static auth cloud-source checks |
| `scripts/tenant-boundary-contract.mjs` | Static tenant-boundary checks |
| `scripts/migration-history-contract.mjs` | Migration filename/history checks |
| `.github/workflows/quantora-auth-phase-1.yml` | CI workflow branch-ga audit-ka ku ordiya lint, contracts, build iyo smoke test; production deploy ma sameeyo |
| `.env.example`, `render.yaml` | Magacyada environment variables; secret values lama akhrin |

## 3. Xaaladda Supabase/database

- Supabase project-ka la arkay wuxuu ku jiraa xaaladda `ACTIVE_HEALTHY`, PostgreSQL 17.
- Waxaa jira 29 jadwal oo ku jira `public`; dhammaantood RLS waa u shidan yahay.
- Jadwal kasta wuxuu leeyahay policy `service_role_only`. SQL role-grant audit-ku ma helin table grants toos ah oo loogu talagalay `anon` ama `authenticated`; `service_role` ayaa leh rukhsadaha server-side.
- Waxaa la arkay 27 migrations oo remote lagu diiwaangeliyey, kii ugu dambeeyeyna waa `20261021173729_atomic_finance_transactions`. Liiska ku jira migration-history contract-ku wuxuu ka kooban yahay isla 27 migration names.
- Security advisor-ku wax security lints ah ma soo celin waqtiga audit-ka. Tani **ma xaqiijinayso** in app-level authorization ama tenant isolation ay dhammaantood sax yihiin.
- Performance advisor-ku wuxuu soo sheegay duplicate index warning iyo unused indexes; waxba lagama beddelin maadaama ay ka baxsan yihiin baaxadda Auth Phase 1.

**Saamaynta muhiimka ah:** maadaama backend-ku isticmaalo service-role/secret key, RLS keligii ma kala soocayo dugsiyada marka backend-ku fulinayo queries. Express API-gu waa inuu ku dabaqaa `school_id` sax ah dhammaan queries iyo mutations.

## 4. Natiijooyinka Auth

### 4.1 Auth-ka hadda jira ma aha Supabase Auth

`server.ts` wuxuu login-ka cloud mode ka raadiyaa `public.dugsiga_users`, kadibna wuxuu hubiyaa password-ka iyadoo la adeegsanayo `verifyPassword`. Session-ka waxaa sameeya `createSessionToken`; token-ka custom-ka ah wuxuu leeyahay qaab `s1.<payload>.<signature>`.

`server/authSession.ts`:
- Wuxuu adeegsadaa HMAC-SHA256 iyo session expiry 12 saacadood ah.
- Payload-ku wuxuu sidaa email, role iyo school identity.
- Web-ka wuxuu isticmaalaa HttpOnly/SameSite cookie `dugsi_session`; native app-ku wuxuu token-ka ku kaydiyaa secure storage.
- Backend-ka la baaray ma xaqiijiyo Supabase Auth JWT issuer/signature sida qorshaha Phase 2 u baahan yahay.

### 4.2 Password migration

- Jadwalka `dugsiga_users` wuxuu leeyahay `password`, `verified`, `role`, `school_id`, iyo `teacher_id`; `email` waa primary key.
- Password-yada cusub waxaa loo hash-gareeyaa `scrypt`; legacy hash format-kii hore weli waa la aqbalaa oo waxaa lagu upgrade-gareeyaa marka login-ku guuleysto.
- **Ha u qaadan in hash-yada scrypt si toos ah loogu import-gareyn karo Supabase Auth.** Marka hore xaqiiji hash formats-ka Supabase si rasmi ah u taageerto. Qorshaha badbaadsan ee default-ku waa invite/password reset iyadoo user record-kii hore la ilaalinayo.

### 4.3 Email verification

`POST /api/auth/verify` wuxuu hadda si toos ah uga jawaabaa success; signup-kuna wuxuu dhigaa `verified: true`. Sidaas darteed verification dhab ah lama dhaqan-geliyo koodhka la baaray. Waa in lagu beddelaa flow rasmi ah oo Supabase Auth ah iyadoo aan la xannibin users-kii hore inta migration-ku socdo.

### 4.4 Logout iyo revocation

Session revocation-ka waxaa lagu kaydiyaa `revokedSessions` Map oo ku jira process memory. Tani ma aha revocation wadaag ah oo u dhexaysa instances, mana sii jirto marka process-ku restart-garoobo. Sidaas awgeed, token hore loo xaday wuxuu suuragal ahaan shaqayn karaa ilaa expiry-ga haddii uu gaaro instance kale. Waa in lagu xalliyo session revocation dhab ah ama naqshad server-side ah ka hor cutover.

Sidoo kale, code-ku wuxuu `SESSION_SECRET` u oggol yahay fallback ku yimaada `SUPABASE_SECRET_KEY` ama `SUPABASE_SERVICE_ROLE_KEY`. `render.yaml` wuxuu qeexayaa `SESSION_SECRET` la generate-gareeyo, laakiin qiimaha live-ka ah lama xaqiijin. Hadafku waa in session secret gaar ah, random ah oo khasab ku ah production la adeegsado.

### 4.5 Teacher invitations

- Teacher activation-ku wuxuu adeegsadaa invitation token iyo expiry.
- Token-ka raw-ga ah waxaa lagu kaydiyaa `dugsiga_teachers.invitation_token`.
- Activation-ku marka hore wuxuu update-gareeyaa teacher row, kadibna wuxuu upsert-gareeyaa user-ka; haddii upsert-ku fashilmo, wuxuu isku dayaa rollback. Tani waa compensating rollback, ma aha hal transaction atomic ah.
- `dugsiga_users` wuxuu leeyahay unique primary key oo `email` ah, halka teachers-ku leeyihiin unique index `(school_id, lower(email))`. Marka waa in la qeexo in email keliya uu ku xirmayo hal school, ama in model membership oo kala duwan loo baahan yahay. Ha beddelin uniqueness-ka intaan xogta iyo product requirement-ka la xaqiijin.

## 5. Roles iyo tenant isolation

- Backend-ka `ROLE_PERMISSIONS` wuxuu aqoonsan yahay `Super Admin`, `School Admin`, `Principal`, `Teacher`, `Accountant`, `Receptionist`, `Librarian`, iyo `Staff`; `admin` waxaa loo normalize-gareeyaa `School Admin` oo leh dhammaan permissions.
- Frontend `AuthUser` type-ku wuxuu ku daraa `admin`, `teacher`, `staff`, iyo `accountant`. Tani waxay ka ballaaran tahay yoolka Auth integration ee hadda ah ee `admin` iyo `teacher`.
- Jadwalka `dugsiga_users` ma lahayn CHECK constraint ku koobaya `role` qiimayaal la oggol yahay. Phase 2/4 waa inay yeeshaan canonical role allowlist iyo mapping cad, iyada oo aan la tirtirin ama si aamusan loo beddelin legacy roles.
- `getSchoolId(req)` wuxuu school identity ka helaa signed server session, mana aqbalo school header client-ku doortay. Contract test-ku wuxuu hubiyaa tenant filters badan oo student/attendance/finance routes ah; tani waa static check, mana caddaynayso in dhammaan paths-ka la tijaabiyey.
- `service_role` wuxuu ka gudbi karaa RLS. Sidaa darteed, tests-ku waa inay caddeeyaan in school A aanu akhrin/qori karin school B, sidoo kalena client-ku aanu beddeli karin role ama `school_id`.

## 6. Khataraha / compatibility issues

| ID | Heerka | Arrin | Waxa loo baahan yahay |
|---|---|---|---|
| AUTH-01 | Sare | Custom HMAC session ayaa la isticmaalayaa halkii Supabase JWT laga xaqiijin lahaa | Samee Supabase JWT verification server-side; dual-run si cad loo xakameeyey |
| AUTH-02 | Sare | Revocation-ku process-local ayuu yahay | Qorshee session invalidation la wadaago ama Supabase session revocation |
| AUTH-03 | Sare | Privileged Supabase key waxaa loo oggol yahay session-secret fallback | Khasab ka dhig secret gaar ah production; waligaa ha soo bandhigin key values |
| AUTH-04 | Dhexe | Email verification hadda waa la dhaafaa | Ku dar verify/recovery flow marka phase-ga accounts la gaaro |
| AUTH-05 | Sare | API tenant isolation waxay ku tiirsan tahay Express sababta service-role access | Negative integration tests loogu sameeyo dhammaan data domains |
| AUTH-06 | Dhexe | Roles-ku way ka badan yihiin `admin` iyo `teacher`, schema-guna ma xaddido | Go'aami roles legacy-ga la ilaalinayo; samee canonical mapping iyo tests |
| AUTH-07 | Dhexe | Email waa global PK ee `dugsiga_users` | Caddee hal-school-per-user; haddii membership badan loo baahan yahay, ku dar membership relation additive ah |
| AUTH-08 | Dhexe | Teacher activation waa multi-step oo raw invitation token ayuu kaydiyaa | Tijaabi concurrency/rollback; qorshee token hashing iyo atomic persistence mustaqbalka |
| AUTH-09 | Dhexe | Legacy scrypt/hash records lama qaadan karo in si toos ah loo import-gareyn karo | Password reset/invite plan; ilaali custom auth iyo hash-yada inta cutover-ka la xaqiijinayo |

## 7. Migration plan — aan destructive ahayn

1. **Ka hor migration:** xaqiiji in Supabase project ref-ka Render `SUPABASE_URL` uu la mid yahay project-ka loogu talagalay; eeg env variable names oo keliya, ha daabicin values. Hubi backup/restore in la tijaabiyey iyo in staging project la heli karo.
2. **User mapping:** ku dar mapping nullable ah sida `auth_user_id uuid UNIQUE` ama mapping table cusub. Ha beddelin `email` primary key, `password`, `school_id`, roles ama teacher records inta compatibility test-ku socdo.
3. **Membership model:** sii hay `school_id` sida isha hadda jirta inta xiriirka account-school la xaqiijinayo. Haddii user hal email uu ka tirsan karo dugsiyo badan, qaabee membership table gaar ah halkii school-ka si aamusan loogu beddeli lahaa.
4. **Hash handling:** ha copy-gareyn scrypt strings si toos ah ugu `auth.users`; isticmaal flow rasmi ah oo invite/password recovery ah, ama hash import kaliya marka format-kiisa si cad loo taageero loona tijaabiyo.
5. **Staging integration:** samee Supabase Auth user mapping, xaqiijinta JWT ee Express, iyo server-side membership/role lookup. Client-ka ha ka aaminin role ama `school_id` uu codsiga ku soo diro.
6. **Transition:** custom auth-ka hore ha ahaado fallback xaddidan inta tijaabooyinka la fulinayo. Ha aqbalin custom token sidii Supabase JWT; mid kasta waa in la xaqiijiyaa iyadoo provider-kiisa la raacayo.
7. **Cutover gate:** kaliya marka login/logout, activation/invitations, reset/verify, wrong-role, expired/invalid-token iyo cross-tenant tests ay gudbaan ayaa cutover loo qorshayn karaa. Production deploy wuxuu u baahan yahay oggolaansho gaar ah.

## 8. Rollback plan

- Cutover-ka ku xakamee feature flag/config; marka error ama test regression yimaado, dib ugu celi custom-auth path-ka.
- Ha tirtirin `dugsiga_users`, teacher rows, password hashes, invitation history, `auth.users` records ama migrations.
- Ha drop-gareyn columns/constraints hore inta retention window iyo rollback-ku socdaan.
- Haddii Supabase Auth accounts la abuuro, re-use/disable-garee si ammaan ah sida qorshaha rollback-ku qeexayo; **ha tirtirin accounts** si lagu xalliyo rollback.
- Database changes-ka hore ha noqdaan additive iyo nullable; backup/restore drill waa in staging lagu xaqiijiyaa.
- Diiwaangeli failed step, affected mapping IDs (log gudaha ah oo ammaan ah), iyo habka dib loogu bilaabi karo iyada oo aan user data la lumin.

## 9. Test plan iyo xaaladda fulinta

### Scripts-ka la orday

Workflow-ga audit-ka: [Quantora Auth Phase 1 Baseline — GitHub Actions run #1](https://github.com/som216469-star/samatar-project/actions/runs/40363265891)

- Run ID: `40363265891`
- Commit la tijaabiyey: `62d960d9685fd17a156778353a662491d69d6eb0`
- Bilow: `2026-10-26T16:52:24Z`
- Dhammaad: `2026-10-26T16:53:06Z`
- Natiijada job-ka: `completed / success`

| Tijaabada | Natiijada |
|---|---|
| `bun install --frozen-lockfile` | PASS |
| `npm run lint` | PASS |
| `npm run test:students-contract` | PASS |
| `npm run test:attendance-contract` | PASS |
| `npm run test:auth-cloud-contract` | PASS |
| `npm run test:tenant-boundary-contract` | PASS |
| `npm run test:migration-history-contract` | PASS |
| `npm run test:database-source-contract` | PASS |
| `npm run test:finance-source-contract` | PASS |
| `npm run build` | PASS |
| `node scripts/server-smoke.mjs` | PASS |

Kuwani waa natiijooyinka GitHub Actions ee workflow-ga kor ku xusan, ma aha qiyaas. Workflow-gu wuxuu ku kooban yahay `audit/quantora-auth-phase-1-20261026`; waxba lama merge-gareyn `main`, production deploy-na lama bilaabin.

### Xaqiijinta Render ↔ Supabase (read-only)

- Render service-ka la helay waa `samatar-project`, repo-gu waa `som216469-star/samatar-project`, deployment branch-kuna waa `main`.
- Deployment-kii ugu dambeeyey ee la arkay waa commit `02ce8aafd1694de20e34d39cd531adaf5d071737`, xaaladdiisuna waa `live`; ma jiro deploy cusub oo audit branch-kan lagu sameeyey.
- Render app logs-ka deployment-ka `2026-10-22` waxay muujiyeen fariinta `Supabase si buuxda ayuu ugu xiran yahay (Direct Supabase Cloud Mode Active)`. Fariintani waxay xaqiijinaysaa in app-ku waqtigaas ku guulaystay hubinta cloud-mode/table checks.
- Supabase API-ga maareynta wuxuu muujiyey project `mdvfcqujqjnvfpzowayo` oo `ACTIVE_HEALTHY` ah, schemas/tables-kuna waxay la jaanqaadaan migration history-ga la hubiyey.
- Render service metadata-ga read-only-ga ah ma soo bandhigo qiimaha `SUPABASE_URL`; si ula kac ah looma beddelin ama looma daabicin secrets. Sidaas darteed **si toos ah looma xaqiijin in URL-ka live-ku ku dhammaado project ref-kan**. Waa in Dashboard-ka Render laga hubiyaa magaca/ref-ga oo keliya, iyada oo aan qiimaha buuxa la wadaagin. Tani waa pre-cutover check ka hor Phase 2, mana aha sabab loo sameeyo production deploy.

### Tijaabooyinka integration ee Phase 2–4

Kuwa soo socda wali waa acceptance tests-ka integration-ka mustaqbalka, sababtoo ah Supabase Auth integration cusub wali lama hirgelin:

- Login sax ah/qaldan; logout; invalid signature; expiry; session revocation/restart.
- Role aan la oggolayn, role escalation, teacher activation token khaldan/dhacay/horay loo isticmaalay.
- Email verification iyo password recovery.
- School A oo isku dayaya inuu akhriyo, wax ka beddelo ama tirtiro School B; isku dayo inuu beddelo `school_id` ama role.
- Teacher activation concurrency iyo rollback marka user upsert-ku fashilmo.
- Direct Data API access oo ka yimaada `anon`/`authenticated`; xaqiiji in aan loo oggolaan jadwallada server-only.
- Isticmaalayaasha hore iyo custom sessions inay sii shaqeeyaan inta transition-ka la tijaabinayo.

## 10. Shuruudaha dhammaadka Phase 1

- [x] Auth/source file inventory la diiwaangeliyey
- [x] Supabase tables, RLS, role grants iyo migration history la baaray read-only
- [x] Roles, tenant model, password/session/invitation risks la diiwaangeliyey
- [x] Migration iyo rollback plans la diyaariyey
- [x] Test plan iyo amarrada project-ka la diiwaangeliyey
- [x] Baseline tests dhab ahaan la orday; dhammaan steps-ku PASS ayay noqdeen
- [x] Environment variable *magacyada* ee `.env.example` iyo `render.yaml` waa la baaray
- [x] Render logs waxay caddeeyeen Direct Supabase Cloud Mode inuu shaqaynayey deployment-kii la baaray
- [ ] Exact live Render `SUPABASE_URL` project-ref match lama xaqiijin, sababtoo ah Render service metadata ma muujiyo env values; xaqiiji magaca/ref-ga adigoo Dashboard-ka isticmaalaya ka hor Phase 2 cutover

**Xaalad kama dambays ah:** **Phase 1 — Audit iyo diyaarinta waa la dhammeeyey.** Koodhka Auth iyo database-ka waxba lagama beddelin; audit report iyo CI workflow waxay ku jiraan branch gaar ah. Qodobka exact live project-ref match waa la diiwaangeliyey inuu yahay pre-cutover check. **Phase 2 lama bilaabin, production deploy lama samayn, users/data lama tirtirin.**
