# DUGSI PRO 2026 — CURRENT SYSTEM DOCUMENTATION & TECHNICAL AUDIT

**Audit Date:** October 2, 2026  
**System Version:** DUGSI PRO 2026 Enterprise Edition  
**Audit Scope:** Comprehensive factual inspection of the active codebase, modular frontend architecture, Express REST APIs, Supabase PostgreSQL + Local JSON dual persistence, Zero-Trust session authentication, Teacher Invitation & Portal workflows, PWA & Offline Sync Queue, and security posture.

---

## 1. Executive Summary & Product Overview
**DUGSI PRO 2026** is a multi-tenant institutional school management and financial accounting platform designed for madrasas, integrated primary/secondary Islamic academies, and Quranic memorization centers.

The platform is organized into four integrated operational pillars:
1. **Academic & Student Core:** Student directory with 7 sub-sections (`all`, `add`, `active`, `inactive`, `archived`, `import`, `export`), duplicate prevention, 360° student profiles, dual-session daily attendance (`before_break` & `after_break`), class & room management, curriculum subjects, exam scoring & automated grading, and printable PDF report cards.
2. **HR, People & Teacher Portal:** Specialized teachers directory with zero-trust email invitation onboarding (`/activate-teacher?token=...`), dedicated Teacher Portal (scoped to assigned classes and subjects), staff directory, guardians directory with student linkage, staff daily attendance, and collision-validated weekly timetable scheduling.
3. **Campus Operations & Communications:** Applicant admissions with one-click student enrollment conversion, library book catalog & circulation loans, physical inventory & asset ledger, targeted campus announcements, and direct WhatsApp notification dispatch.
4. **Institutional Finance & Accounting Suite:** Configurable fee structures, single & bulk invoice generation, multi-channel payment ledger (Cash, Bank, EVC Plus, Zaad) with official thermal/A4 receipts, operational expense approvals, non-tuition income tracking, automated payroll with linked salary expense generation, department budgets with live actual-vs-planned variance, real-time Profit & Loss (P&L) statements, and Cash Flow reconciliation.

---

## 2. Technology Stack & Framework Architecture
- **Client Frontend:** React 19 Single Page Application (SPA), TypeScript 5.8, Vite 6.
- **Styling & UI System:** Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React icons, Motion (`motion/react`) transitions, Recharts analytics visualizations, and tokenized light/dark theme variables (`src/index.css` + `src/components/ui/primitives.tsx`).
- **Progressive Web App (PWA) & Offline Engine:** `vite-plugin-pwa` with Workbox precaching, `/api/*` navigation fallback denylist (`navigateFallbackDenylist: [/^\/api\//]`), compliant `manifest.webmanifest` (`id: '/'`, 192x192, 512x512, maskable 512x512, iOS `apple-touch-icon.png`), `PWAInstallButton`, and `OfflineSyncBadge` backed by `src/utils/offlineSync.ts` (`localStorage` mutation queue with automatic online replay).
- **Backend Server:** Node.js + Express 4 (`server.ts`) running on port `3000` with Vite middleware in development and static `dist/` serving in production (`esbuild` bundle to `dist/server.cjs`).
- **Primary Cloud Database:** `@supabase/supabase-js` v2 + `@supabase/server` connected to PostgreSQL (27 tables defined in `DUGSI_PRO_2026_ALL_TABLES.sql` and `SQL_SETUP_SCRIPT`).
- **Resilient Local Persistence:** Automatic fallback and write-through persistence to `database.json` (with `/tmp/dugsi_database.json` and in-memory fallback for read-only container filesystems) and automatic cloud synchronization (`syncLocalToSupabase`).
- **Email & Document Engines:** `nodemailer` SMTP transactional email service (`server/emailService.ts`) with automatic link simulation fallback; client-side `jspdf`, `jspdf-autotable`, and `xlsx` (SheetJS) for PDF/Excel import & export.

---

## 3. Complete Folder & File Architecture

```text
/
├── .env.example                               # Sanitized environment variable contract
├── DUGSI_PRO_2026_ALL_TABLES.sql              # Complete 27-table PostgreSQL / Supabase DDL schema
├── DUGSI_PRO_2026_CURRENT_SYSTEM_DOCUMENTATION.md
├── SYSTEM_DOCUMENTATION.md                    # Somali technical & functional documentation
├── database.json                              # Resilient local JSON persistence store
├── index.html                                 # HTML entrypoint with SEO, OpenGraph, JSON-LD & PWA tags
├── metadata.json                              # AI Studio applet metadata manifest
├── package.json                               # Scripts & dependencies
├── tsconfig.json                              # TypeScript configuration
├── vite.config.ts                             # Vite + Tailwind v4 + VitePWA configuration
├── server.ts                                  # Express server entrypoint, Core APIs & Supabase sync
├── server/
│   ├── authSession.ts                         # Zero-Trust session token store, TTL & tenant resolver
│   ├── emailService.ts                        # Nodemailer SMTP teacher invitation email dispatcher
│   ├── teacherAuthRoutes.ts                   # Teacher token verification, account activation & status toggle
│   ├── modernRoutes.ts                        # HR, Timetable, Admissions, Library, Inventory, Announcements APIs
│   └── financeRoutes.ts                       # Fee Structures, Invoices, Payments, Expenses, Income, Payroll, Budgets, P&L APIs
├── public/
│   ├── manifest.webmanifest                   # Web App Manifest
│   ├── icon.svg / favicon.ico                 # Vector & browser tab icons
│   ├── apple-touch-icon.png                   # 180x180 iOS home screen icon
│   ├── pwa-192x192.png / pwa-512x512.png      # Standard PWA icons (purpose: any)
│   └── pwa-maskable-512x512.png               # Android maskable icon (purpose: maskable)
└── src/
    ├── main.tsx                               # React 19 root mount
    ├── App.tsx                                # Top-level state orchestrator, auth gate & view router
    ├── types.ts                               # Domain TypeScript interfaces
    ├── index.css                              # Tailwind CSS v4 & custom theme design tokens
    ├── app/
    │   ├── AppShell.tsx                       # Institutional sidebar, topbar, Cmd+K palette & breadcrumbs
    │   ├── navigationConfig.ts                # Role-based navigation tree & access helpers
    │   └── routeConfig.ts                     # Tab & sub-section URL synchronization
    ├── lib/
    │   ├── apiClient.ts                       # Centralized fetch wrapper injecting Bearer token & X-School-Email
    │   └── authStorage.ts                     # Canonical session & token persistence in localStorage
    ├── utils/
    │   └── offlineSync.ts                     # Offline mutation queue & auto-replay hook (useNetworkSync)
    ├── hooks/
    │   ├── useInstitutionalData.ts            # Central data fetching, CRUD handlers & PDF report card generator
    │   ├── usePWAInstall.ts                   # beforeinstallprompt & iOS standalone detector
    │   └── institutional/
    │       └── useAttendanceData.ts           # Attendance state & calculation helpers
    ├── components/
    │   ├── LandingPage.tsx                    # Public marketing & interactive showcase
    │   ├── OfflineSyncBadge.tsx               # Real-time connectivity indicator & manual sync modal
    │   ├── PWAInstallButton.tsx               # In-app install button & iOS Safari guide modal
    │   ├── landing/                           # 15 modular landing page sections
    │   ├── layout/PageLayout.tsx              # Standardized page header, toolbar & content layout
    │   └── ui/primitives.tsx                  # Button, Badge, StatusBadge, StatCard, Modal, Drawer, EmptyState, Skeleton
    └── features/
        ├── auth/
        │   ├── AuthPortalView.tsx             # Sign In & School Sign Up portal
        │   └── TeacherActivateView.tsx        # One-time token teacher password creation & activation view
        ├── dashboard/ExecutiveDashboard.tsx   # School Admin KPI dashboard, charts & quick actions
        ├── teacher/TeacherPortalDashboard.tsx # Teacher-specific dashboard (assigned classes, subjects, schedule)
        ├── students/
        │   ├── StudentsPage.tsx               # Unified student directory controller
        │   └── components/                    # Roster table, filter toolbar, stats, add/import/export views, 360° profile modal
        ├── attendance/
        │   ├── StudentAttendancePage.tsx      # Dual-session student attendance sheet & history
        │   └── StaffAttendanceView.tsx        # Daily teacher & staff check-in ledger
        ├── academics/
        │   ├── ClassesView.tsx                # Classrooms, capacities & homeroom teachers
        │   ├── SubjectsView.tsx               # Curriculum subjects & pass/max mark thresholds
        │   ├── ExamsView.tsx                  # Assessment mark entry, grade calculation & filtering
        │   └── TimetableScheduleView.tsx      # Weekly timetable grid with conflict detection
        ├── people/PeopleView.tsx              # Teachers, Staff & Guardians directory with invitation actions
        ├── operations/
        │   ├── AdmissionsView.tsx             # Applicant pipeline & 1-click student enrollment
        │   ├── LibraryView.tsx                # Book catalog & loan issue/return tracking
        │   ├── InventoryView.tsx              # Campus assets & condition tracking
        │   └── AnnouncementsView.tsx          # Priority announcements & audience targeting
        ├── finance/
        │   ├── FinanceView.tsx                # Unified 11-tab Finance & Accounting workspace
        │   ├── FinanceDashboard.tsx           # Revenue vs. Expense KPIs & charts
        │   ├── FeeStructuresModule.tsx        # Recurring tuition & fee templates
        │   ├── InvoicesModule.tsx             # Single/bulk invoicing, discounts, print & WhatsApp dispatch
        │   ├── PaymentsModule.tsx             # Payment collection & thermal/A4 official receipts
        │   ├── ExpensesModule.tsx             # Expense vouchers & approval workflow
        │   ├── IncomeModule.tsx               # Non-tuition revenue ledger
        │   ├── PayrollModule.tsx              # Staff salary computation, payslips & auto-expense sync
        │   ├── BudgetsModule.tsx              # Planned vs. live actual budget variance analyzer
        │   ├── ProfitLossView.tsx             # Real-time P&L statement & monthly trend breakdown
        │   ├── CashFlowView.tsx               # Inflow/outflow timeline & closing cash position
        │   ├── FinancialReportsModule.tsx     # Exportable revenue, expense, fee & payroll statements
        │   └── financeUtils.ts                # Currency formatting, print windows & CSV/Excel helpers
        ├── reports/
        │   ├── ReportsView.tsx                # Academic & attendance analytics center
        │   └── reportsPdfExport.ts            # Institutional PDF report generators
        └── settings/SettingsPage.tsx          # School profile, grading thresholds, Supabase SQL & factory reset
```

---

## 4. Authentication, Zero-Trust Sessions, Teacher Onboarding & Multi-Tenancy

### 4.1. Zero-Trust Session Management (`server/authSession.ts`)
- Upon login (`POST /api/auth/login`), the server generates a 256-bit cryptographically random session token (`crypto.randomBytes(32).toString('hex')`) stored in `activeSessions` with a 14-day TTL.
- Every API request from `src/lib/apiClient.ts` and `src/utils/offlineSync.ts` attaches `Authorization: Bearer <token>` and `X-School-Email`.
- `getAuthenticatedUser(req, loadLocalDB)` resolves the authenticated identity and tenant `schoolId` directly from the server-side session store (or verified database records), preventing cross-tenant spoofing.

### 4.2. Teacher Invitation & Account Activation (`server/teacherAuthRoutes.ts`)
- Administrators never set or view teacher passwords. When a teacher is added with an email (`POST /api/teachers`), their status is set to `INVITED` with a 7-day one-time `invitationToken`.
- `server/emailService.ts` dispatches an HTML invitation email via SMTP (or outputs a direct copyable activation link `/activate-teacher?token=...` if SMTP is not configured).
- The teacher opens `/activate-teacher?token=...`, verified by `GET /api/teachers/verify-invitation/:token`, and sets their own password via `POST /api/teachers/activate-account`. The token is permanently invalidated and status transitions to `ACTIVE`.

### 4.3. Role-Based Access Control (RBAC)
- **Supported Roles:** `Super Admin`, `School Admin` (`admin`), `Principal`, `Accountant`, `Teacher` (`teacher`), `Receptionist`, `Librarian`, `Staff` (`staff`).
- **Frontend Enforcement (`src/app/navigationConfig.ts`):** Filters sidebar items, sub-sections, and `Cmd+K` command palette results by role. Teachers see `TeacherPortalDashboard` and are scoped to their assigned classes/subjects.
- **Backend Enforcement (`server.ts`, `server/financeRoutes.ts`, `server/teacherAuthRoutes.ts`):** Blocks unauthorized mutations (`403 Forbidden`) for teachers/staff on finance routes, fee records, teacher invitations, and unassigned class attendance.

---

## 5. Database Architecture & 27-Table Verification Matrix

All 27 tables are defined in `DUGSI_PRO_2026_ALL_TABLES.sql` and embedded in `server.ts` (`SQL_SETUP_SCRIPT`), with multi-tenant partitioning via `school_id` and resilient dual persistence (Supabase PostgreSQL + `database.json` fallback):

| # | Supabase Table Name | Local JSON Key | Module / Domain | Persistence Status |
|---|---|---|---|---|
| 1 | `dugsiga_users` | `users` | Auth & RBAC Accounts | **Supabase + Local Sync** |
| 2 | `dugsiga_students` | `students` | Student Directory & Demographics | **Supabase + Local Sync** |
| 3 | `dugsiga_classes` | `classes` | Classrooms & Capacities | **Supabase + Local Sync** |
| 4 | `dugsiga_subjects` | `subjects` | Curriculum Subjects | **Supabase + Local Sync** |
| 5 | `dugsiga_exam_scores` | `examScores` | Exams, Marks & Grades | **Supabase + Local Sync** |
| 6 | `dugsiga_attendance` | `attendance` | Dual-Session Student Attendance | **Supabase + Local Sync** |
| 7 | `dugsiga_fees` | `fees` | Legacy Monthly Fee Records | **Supabase + Local Sync** |
| 8 | `dugsiga_settings` | `settings` | School Profile & Thresholds | **Supabase + Local Sync** |
| 9 | `dugsiga_teachers` | `teachers` | Teachers & Invitation Tokens | **Supabase + Local Sync** |
| 10 | `dugsiga_staff` | `staff` | Support & Admin Personnel | **Supabase + Local Sync** |
| 11 | `dugsiga_guardians` | `guardians` | Parents & Student Links | **Supabase + Local Sync** |
| 12 | `dugsiga_staff_attendance` | `staffAttendance` | Daily Staff Check-In Logs | **Supabase + Local Sync** |
| 13 | `dugsiga_timetable` | `timetable` | Weekly Class Schedule Grid | **Supabase + Local Sync** |
| 14 | `dugsiga_admissions` | `admissions` | Applicant Intake & Enrollment | **Supabase + Local Sync** |
| 15 | `dugsiga_announcements` | `announcements` | Targeted Campus Announcements | **Supabase + Local Sync** |
| 16 | `dugsiga_library_books` | `libraryBooks` | Library Book Catalog | **Supabase + Local Sync** |
| 17 | `dugsiga_library_loans` | `libraryLoans` | Book Borrowing & Returns | **Supabase + Local Sync** |
| 18 | `dugsiga_inventory` | `inventory` | Physical Assets & Equipment | **Supabase + Local Sync** |
| 19 | `dugsiga_documents` | `documents` | Institutional Document Metadata | **Supabase + Local Sync** |
| 20 | `dugsiga_notifications` | `notifications` | WhatsApp & System Alert Logs | **Supabase + Local Sync** |
| 21 | `dugsiga_fee_structures` | `feeStructures` | Tuition & Fee Templates | **Supabase + Local Sync** |
| 22 | `dugsiga_invoices` | `invoices` | Student Invoices & Balances | **Supabase + Local Sync** |
| 23 | `dugsiga_payments` | `payments` | Payment Receipts & Ledger | **Supabase + Local Sync** |
| 24 | `dugsiga_expenses` | `expenses` | Operational & Salary Expenses | **Supabase + Local Sync** |
| 25 | `dugsiga_income` | `income` | Non-Tuition Revenue Streams | **Supabase + Local Sync** |
| 26 | `dugsiga_budgets` | `budgets` | Department Budgets & Variances | **Supabase + Local Sync** |
| 27 | `dugsiga_payroll` | `payroll` | Staff Payroll & Payslips | **Supabase + Local Sync** |

---

## 6. Finance Accounting Integrity & Double-Counting Prevention
- **Legacy Fee Auto-Bridging (`syncLegacyFeesToInvoices`):** Automatically bridges legacy `dugsiga_fees` records into `invoices` and `payments` idempotently (`inv.id === f.id || inv.feeId === f.id`) while mirroring invoice updates back to `fees`.
- **Realized Revenue vs. Receivables:** Profit & Loss (`/api/profit-loss`) and Cash Flow (`/api/cash-flow`) calculate revenue strictly from **cleared payments** (`payments`) plus standalone non-fee income (`income`). Unpaid invoice balances are tracked as `totalOutstandingFees` (Accounts Receivable) and never inflate revenue.
- **Payroll-to-Expense Deduplication:** Marking a payroll record as `Paid` (`POST /api/payroll` or `PUT /api/payroll/:id/pay`) automatically creates or updates a single linked expense record (`id: exp-pr-<payrollId>`, `category: 'Salaries'`). P&L and Cash Flow aggregate paid expenses from the expense ledger, preventing double-counting between payroll and expenses.

---

## 7. Progressive Web App (PWA) & Offline Sync Architecture
- **Service Worker & Workbox (`vite.config.ts`):** Pre-caches static application shell assets (`js, css, html, ico, png, svg, woff, woff2`) and caches Google Fonts (`CacheFirst`), while explicitly excluding `/api/*` routes via `navigateFallbackDenylist: [/^\/api\//]` so authenticated tenant data is never cached in shared browser storage.
- **Offline Mutation Queue (`src/utils/offlineSync.ts`):** When offline, student, attendance, and exam score mutations are queued in `localStorage` (`dugsiga_offline_sync_queue`), deduplicated, and automatically replayed with full `Authorization: Bearer` and `X-School-Email` headers as soon as `window` fires the `online` event or the user clicks **Hadda Sync Garee** in `OfflineSyncBadge`.
