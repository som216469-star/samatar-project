import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Clock,
  BookOpen,
  Package,
  Bell,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

interface FeaturesOverviewProps {
  onNavigate?: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated?: boolean;
}

export default function FeaturesOverview({
  onNavigate,
  isAuthenticated = false,
}: FeaturesOverviewProps) {
  const [timetableDay, setTimetableDay] = useState<'Sat' | 'Sun' | 'Mon'>('Sat');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'bursar' | 'teacher'>('admin');

  const handleAction = () => {
    if (onNavigate) {
      onNavigate(isAuthenticated ? 'dashboard' : 'signup');
    }
  };

  return (
    <section
      id="campus-operations"
      className="py-24 md:py-32 border-t border-white/[0.07] bg-[#070a12]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28 md:space-y-36">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            03 · Campus Operations, Logistics &amp; Governance
          </div>
          <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-5">
            Every operational department, connected out of the box.
          </h2>
          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Beyond core academics and finance, Dugsi Pro equips your institution with dedicated modules for admissions, scheduling, library lending, asset tracking, communications, and role security.
          </p>
        </div>

        {/* =================================================================
            FEATURE 07: ADMISSIONS
           ================================================================= */}
        <div
          id="admissions-feature"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              07 · Admissions &amp; Enrollment Pipeline
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Streamline new student applications and enrollment.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Track prospective students from initial inquiry and assessment through final approval, then convert approved applicants into active classroom rosters with a single click.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Structured applicant stages: Pending Review, Approved, Enrolled, or Waitlisted</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>One-click conversion from approved applicant to active student record</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Previous school history and guardian contact verification</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-[#818cf8]" />
                <span className="text-sm font-semibold text-white">
                  Admissions Pipeline · 2026 Intake
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 tabular-nums">
                18 Approved This Week
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { app: 'APP-2026-089', name: 'ayaan Maxamuud Cali', target: 'Fasalka 2A', guardian: '+252 61 5221100', stage: 'Approved · Ready to Enroll' },
                { app: 'APP-2026-090', name: 'Cumar Xuseen Warsame', target: 'Fasalka 4A', guardian: '+252 61 5887766', stage: 'Enrolled in Roster' },
                { app: 'APP-2026-091', name: 'Hodan Cabdi Nuur', target: 'Fasalka 1B', guardian: '+252 61 5334455', stage: 'Assessment Scheduled' },
              ].map((item) => (
                <div
                  key={item.app}
                  className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-white capitalize">{item.name}</div>
                    <div className="text-[11px] font-mono text-[#64748b]">
                      {item.app} · Applying for {item.target} · {item.guardian}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#a5b4fc] font-medium">
                    {item.stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 08: TIMETABLE
           ================================================================= */}
        <div
          id="timetable-feature"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 lg:order-2 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              08 · Academic Timetable
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Conflict-free weekly class and teacher schedules.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Organize daily teaching periods across every classroom, assign subject instructors and room numbers, and give teachers instant visibility into their weekly teaching load.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Day-by-day period scheduling with start/end times and room numbers</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Filter schedules by classroom or individual subject instructor</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Synchronized with teacher portals for daily lesson readiness</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 lg:order-1 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#818cf8]" />
                <span className="text-sm font-semibold text-white">
                  Weekly Class Timetable · Fasalka 4A
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                {(['Sat', 'Sun', 'Mon'] as const).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setTimetableDay(day)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      timetableDay === day
                        ? 'bg-[#4f46e5] text-white'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {day === 'Sat' ? 'Saturday' : day === 'Sun' ? 'Sunday' : 'Monday'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {(timetableDay === 'Sat'
                ? [
                    { time: '07:30 – 08:20', subject: 'Mathematics', teacher: 'Macallin Maxamed Cusmaan', room: 'Room 104' },
                    { time: '08:20 – 09:10', subject: 'English Language', teacher: 'Macallimad Maryan Jaamac', room: 'Room 104' },
                    { time: '09:30 – 10:20', subject: 'General Science', teacher: 'Macallin Cabdi Xasan', room: 'Lab 02' },
                  ]
                : timetableDay === 'Sun'
                ? [
                    { time: '07:30 – 08:20', subject: 'Islamic Studies', teacher: 'Macallin Xasan Cabdi', room: 'Room 104' },
                    { time: '08:20 – 09:10', subject: 'Mathematics', teacher: 'Macallin Maxamed Cusmaan', room: 'Room 104' },
                    { time: '09:30 – 10:20', subject: 'Arabic Language', teacher: 'Macallin Xasan Cabdi', room: 'Room 104' },
                  ]
                : [
                    { time: '07:30 – 08:20', subject: 'General Science', teacher: 'Macallin Cabdi Xasan', room: 'Lab 02' },
                    { time: '08:20 – 09:10', subject: 'Social Studies', teacher: 'Macallimad Fartuun Cali', room: 'Room 104' },
                    { time: '09:30 – 10:20', subject: 'English Language', teacher: 'Macallimad Maryan Jaamac', room: 'Room 104' },
                  ]
              ).map((slot) => (
                <div
                  key={slot.time}
                  className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#a5b4fc] tabular-nums">
                      {slot.time}
                    </span>
                    <div>
                      <div className="font-semibold text-white">{slot.subject}</div>
                      <div className="text-[11px] text-[#94a3b8]">{slot.teacher}</div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#64748b]">{slot.room}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 09 & 10: LIBRARY & INVENTORY (ALTERNATING DEEP DIVES)
           ================================================================= */}
        <div
          id="library-feature"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              09 · School Library &amp; Lending
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Catalog textbooks and track student book loans.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Maintain an organized catalog of textbooks and reference materials, issue books to students or teachers with due dates, and monitor available copies in real time.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Track total copies, available stock, ISBNs, and shelf locations</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Issue and return loans with automatic overdue status detection</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#818cf8]" />
                <span className="text-sm font-semibold text-white">
                  Library Catalog &amp; Active Loans
                </span>
              </div>
              <span className="text-xs font-mono text-[#94a3b8] tabular-nums">
                1,240 Volumes Indexed
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { title: 'Secondary Mathematics Form 4', isbn: 'ISBN-978-019', avail: '38 / 45 Available', status: '7 Borrowed' },
                { title: 'Integrated Biology & Lab Manual', isbn: 'ISBN-978-042', avail: '29 / 30 Available', status: '1 Borrowed' },
                { title: 'Modern English Grammar & Composition', isbn: 'ISBN-978-118', avail: '50 / 50 Available', status: 'In Stock' },
              ].map((book) => (
                <div
                  key={book.isbn}
                  className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-white">{book.title}</div>
                    <div className="text-[11px] font-mono text-[#64748b]">{book.isbn}</div>
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="text-[#94a3b8]">{book.avail}</span>
                    <span className="text-emerald-400">{book.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 10: INVENTORY & ASSETS
           ================================================================= */}
        <div
          id="inventory-feature"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 lg:order-2 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              10 · Campus Inventory &amp; Assets
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Account for every classroom desk, computer, and lab asset.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Keep a verified register of school furniture, IT hardware, science laboratory equipment, and stationery supplies with unit valuations and condition tracking.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Track item quantities, assigned locations, unit costs, and asset conditions</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Prevent supply shortages and maintain institutional asset valuations</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 lg:order-1 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-[#818cf8]" />
                <span className="text-sm font-semibold text-white">
                  Campus Asset &amp; Equipment Register
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 tabular-nums">
                Audited · Q1 2026
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { asset: 'Classroom Dual Student Desks', loc: 'Block A · Rooms 101–108', qty: '220 Units', cond: 'Good Condition' },
                { asset: 'Desktop Workstations (Core i5)', loc: 'Computer Lab 01', qty: '32 Units', cond: 'Operational' },
                { asset: 'Optical Compound Microscopes', loc: 'Science Lab 02', qty: '18 Units', cond: 'Operational' },
              ].map((item) => (
                <div
                  key={item.asset}
                  className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-white">{item.asset}</div>
                    <div className="text-[11px] text-[#64748b]">{item.loc}</div>
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="text-white font-semibold">{item.qty}</span>
                    <span className="text-emerald-400">{item.cond}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 11: ANNOUNCEMENTS
           ================================================================= */}
        <div
          id="announcements-feature"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              11 · Institutional Announcements
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Targeted broadcasts for faculty, classes, and parents.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Publish official exam schedules, holiday notices, and faculty briefings to the school notice board or dispatch direct WhatsApp updates to student guardians.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Audience targeting: All School, Teachers Only, Parents, or Specific Class</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Pin urgent administrative notices to the top of staff workspaces</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#818cf8]" />
                <span className="text-sm font-semibold text-white">
                  Institutional Notice Board
                </span>
              </div>
              <span className="text-xs text-[#94a3b8]">Broadcast Center</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-4 rounded-xl bg-[#0d111c] border border-[#6366f1]/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    Term 1 Final Examination Schedule Published
                  </span>
                  <span className="font-mono text-[11px] text-[#a5b4fc]">
                    Pinned · All Classes
                  </span>
                </div>
                <p className="text-[#94a3b8] leading-relaxed">
                  Final examinations for Grades 1 through 8 begin Saturday, March 28. All subject teachers must finalize continuous assessment marks by Thursday.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.05] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    Parent-Teacher Academic Review Day
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    Guardians &amp; Faculty
                  </span>
                </div>
                <p className="text-[#94a3b8] leading-relaxed">
                  Official Term 1 PDF report cards will be distributed during the Parent-Teacher conference on April 4 from 08:30 AM.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 12: ROLES & PERMISSIONS (RBAC)
           ================================================================= */}
        <div
          id="roles-permissions"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 lg:order-2 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              12 · Roles, Permissions &amp; Tenant Isolation
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Security-first role boundaries and school data isolation.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Enforce strict role-based access control across your institution while isolating your school&apos;s entire database behind a dedicated multi-tenant School ID.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Granular route and navigation guards for Principals, Bursars, and Teachers</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Teachers access assigned attendance, exams, and classes without seeing school payroll</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Multi-tenant School ID enforcement on every authenticated API request</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAction}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#a5b4fc] hover:text-white transition-colors cursor-pointer group"
              >
                <span>Provision Your Isolated School Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 lg:order-1 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">
                  Role-Based Access Control (RBAC) Matrix
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                {(['admin', 'bursar', 'teacher'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${
                      selectedRole === r
                        ? 'bg-[#4f46e5] text-white'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {r === 'admin' ? 'Principal / Admin' : r === 'bursar' ? 'Finance / Bursar' : 'Class Teacher'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                {
                  module: 'Student Registry & Admissions',
                  access:
                    selectedRole === 'admin'
                      ? 'Full Read / Write / Bulk Import'
                      : selectedRole === 'bursar'
                      ? 'Read Directory & Fee Links'
                      : 'View Assigned Class Roster',
                  allowed: true,
                },
                {
                  module: 'Daily Attendance & Exam Score Entry',
                  access:
                    selectedRole === 'admin'
                      ? 'Full Institutional Oversight'
                      : selectedRole === 'bursar'
                      ? 'Summary Read Access'
                      : 'Full Entry for Assigned Classes',
                  allowed: true,
                },
                {
                  module: 'Tuition Invoicing, Payroll & Budgets',
                  access:
                    selectedRole === 'admin' || selectedRole === 'bursar'
                      ? 'Full Ledger & Receipt Authority'
                      : 'Restricted · Hidden by Route Guard',
                  allowed: selectedRole !== 'teacher',
                },
                {
                  module: 'System Settings & JSON Database Backup',
                  access:
                    selectedRole === 'admin'
                      ? 'Full Administrative Control'
                      : 'Restricted · Principal Only',
                  allowed: selectedRole === 'admin',
                },
              ].map((perm) => (
                <div
                  key={perm.module}
                  className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span className="font-semibold text-white">{perm.module}</span>
                  <span
                    className={`font-mono text-[11px] font-medium ${
                      perm.allowed ? 'text-emerald-400' : 'text-[#64748b]'
                    }`}
                  >
                    {perm.access}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
