import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Upload,
  Search,
  FileText,
} from 'lucide-react';

interface FeatureDetailSectionsProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
}

export default function FeatureDetailSections({
  onNavigate,
  isAuthenticated,
}: FeatureDetailSectionsProps) {
  const [studentClassFilter, setStudentClassFilter] = useState<'all' | '4A' | '3B'>('all');
  const [attendanceSession, setAttendanceSession] = useState<'morning' | 'afternoon'>('morning');
  const [examTerm, setExamTerm] = useState<'term1' | 'term2'>('term1');
  const [peopleTab, setPeopleTab] = useState<'teachers' | 'staff'>('teachers');
  const [financeTab, setFinanceTab] = useState<'invoices' | 'payroll'>('invoices');
  const [reportType, setReportType] = useState<'transcript' | 'ledger'>('transcript');

  const sampleStudents = [
    { id: 'STD-2026-041', name: 'Maxamed Cali Jaamac', cls: '4A', gender: 'Male', phone: '+252 61 5123456', status: 'Active · Paid' },
    { id: 'STD-2026-042', name: 'Caasho Axmed Nuur', cls: '3B', gender: 'Female', phone: '+252 61 5654321', status: 'Active · Paid' },
    { id: 'STD-2026-043', name: 'Cabdiraxmaan Xasan Faarax', cls: '4A', gender: 'Male', phone: '+252 61 5998877', status: 'Active · Partial' },
    { id: 'STD-2026-044', name: 'Fadumo Cusmaan Geedi', cls: '3B', gender: 'Female', phone: '+252 61 5443322', status: 'Active · Paid' },
  ].filter((s) => studentClassFilter === 'all' || s.cls === studentClassFilter);

  return (
    <section
      id="features"
      className="py-24 md:py-32 border-t border-white/[0.07] bg-[#06080f]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28 md:space-y-36">
        {/* Section Intro Header */}
        <div className="max-w-3xl">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            02 · Core Academic &amp; Financial Capabilities
          </div>
          <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-5">
            Purpose-built modules for every daily school workflow.
          </h2>
          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Explore how each capability inside Dugsi Pro replaces manual paperwork with structured, auditable institutional workflows.
          </p>
        </div>

        {/* =================================================================
            FEATURE 01: STUDENT MANAGEMENT
           ================================================================= */}
        <div
          id="students-management"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              01 · Student Management
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Complete student profiles and bulk Excel onboarding.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Maintain a verified central directory of every enrolled student—including assigned classroom, guardian telephone contacts, fee status, and academic history—in one searchable registry.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Instant search and filtering across student name, ID, class, and guardian phone</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Bulk Excel (.xlsx) student roster import with standardized template download</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>One-click printable PDF student directory and class-level rosters</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'signup')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#a5b4fc] hover:text-white transition-colors cursor-pointer group"
              >
                <span>Manage Student Registry</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Interactive Student Directory Mockup */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div>
                <div className="text-sm font-semibold text-white">
                  Student Directory · Active Roster
                </div>
                <div className="text-xs text-[#64748b]">
                  428 Enrolled · Academic Year 2025/2026
                </div>
              </div>

              {/* Interactive Class Filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                {(['all', '4A', '3B'] as const).map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setStudentClassFilter(cls)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      studentClassFilter === cls
                        ? 'bg-[#4f46e5] text-white'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {cls === 'all' ? 'All Classes' : `Fasalka ${cls}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {sampleStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-3 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/15 text-[#a5b4fc] font-mono font-bold flex items-center justify-center shrink-0">
                      {student.name
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{student.name}</div>
                      <div className="text-[11px] text-[#64748b] font-mono">
                        {student.id} · Fasalka {student.cls} · {student.gender}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-mono text-[11px] text-[#94a3b8] tabular-nums">
                      {student.phone}
                    </span>
                    <span className="font-medium text-emerald-400">
                      {student.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#64748b]">
              <span className="flex items-center gap-1.5 text-[#94a3b8]">
                <Upload className="w-3.5 h-3.5 text-[#818cf8]" />
                <span>Excel (.xlsx) Bulk Import Ready</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#94a3b8]">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Directory PDF</span>
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 02: ATTENDANCE MANAGEMENT
           ================================================================= */}
        <div
          id="attendance-management"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 lg:order-2 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              02 · Attendance &amp; Roll Call
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Twice-daily classroom roll call in seconds.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Log student attendance across both Morning (Subaxdii / Before Break) and Afternoon (Galabtii / After Break) sessions with one-click batch controls and instant absentee tracking.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Dedicated Morning (Before Break) and Afternoon (After Break) session sheets</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>One-click &ldquo;Mark All Present&rdquo; action so teachers only tap exceptions</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Individual student attendance history and printable class attendance PDFs</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'signup')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#a5b4fc] hover:text-white transition-colors cursor-pointer group"
              >
                <span>Explore Attendance Roll Call</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Interactive Attendance Mockup */}
          <div className="lg:col-span-7 lg:order-1 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div>
                <div className="text-sm font-semibold text-white">
                  Roll Call Sheet · Fasalka 4A
                </div>
                <div className="text-xs text-[#64748b]">
                  Date: 2026-03-18 · 36 Students Enrolled
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setAttendanceSession('morning')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    attendanceSession === 'morning'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Morning (Before Break)
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceSession('afternoon')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    attendanceSession === 'afternoon'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Afternoon (After Break)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4 text-center">
              <div className="p-3 rounded-xl bg-[#0d111c] border border-white/[0.05]">
                <div className="text-[11px] text-[#94a3b8]">Present</div>
                <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                  {attendanceSession === 'morning' ? '33' : '34'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0d111c] border border-white/[0.05]">
                <div className="text-[11px] text-[#94a3b8]">Absent</div>
                <div className="text-lg font-bold text-rose-400 font-mono tabular-nums mt-0.5">
                  {attendanceSession === 'morning' ? '1' : '1'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0d111c] border border-white/[0.05]">
                <div className="text-[11px] text-[#94a3b8]">Late</div>
                <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                  {attendanceSession === 'morning' ? '1' : '0'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0d111c] border border-white/[0.05]">
                <div className="text-[11px] text-[#94a3b8]">Excused</div>
                <div className="text-lg font-bold text-sky-400 font-mono tabular-nums mt-0.5">
                  1
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Maxamed Cali Jaamac', roll: '01', state: 'Present' },
                { name: 'Caasho Axmed Nuur', roll: '02', state: 'Present' },
                {
                  name: 'Cabdiraxmaan Xasan Faarax',
                  roll: '03',
                  state: attendanceSession === 'morning' ? 'Late' : 'Present',
                },
              ].map((item) => (
                <div
                  key={item.roll}
                  className="p-3 rounded-xl bg-[#0d111c] border border-white/[0.05] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#64748b] tabular-nums">
                      #{item.roll}
                    </span>
                    <span className="font-semibold text-white">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        item.state === 'Present'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {item.state}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 03: EXAMS & RESULTS
           ================================================================= */}
        <div
          id="exams-management"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              03 · Exams &amp; Automated Results
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Automated grading matrices and term rankings.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Enter subject marks per term and let Dugsi Pro automatically compute percentages, apply your school&apos;s custom pass threshold, and assign letter grades (Grade A, B, C, D, or Fail).
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Support for Term 1, Term 2, Midterm, and Final examination cycles</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero-error percentage calculation and customizable pass/fail boundaries</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Direct integration with printable student report cards and teacher remarks</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'signup')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#a5b4fc] hover:text-white transition-colors cursor-pointer group"
              >
                <span>Inspect Grading Engine</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Interactive Exams Mockup */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div>
                <div className="text-sm font-semibold text-white">
                  Examination Score Matrix · Maxamed Cali Jaamac
                </div>
                <div className="text-xs text-[#64748b]">
                  Fasalka 4A · Pass Threshold: 60% Minimum
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setExamTerm('term1')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    examTerm === 'term1'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Term 1 Final
                </button>
                <button
                  type="button"
                  onClick={() => setExamTerm('term2')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    examTerm === 'term2'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Term 2 Final
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {(examTerm === 'term1'
                ? [
                    { code: 'MATH-104', subject: 'Mathematics', score: 94, max: 100, grade: 'Grade A' },
                    { code: 'ENG-104', subject: 'English Language', score: 88, max: 100, grade: 'Grade B' },
                    { code: 'SCI-104', subject: 'General Science', score: 91, max: 100, grade: 'Grade A' },
                    { code: 'ISL-104', subject: 'Islamic Studies', score: 97, max: 100, grade: 'Grade A' },
                  ]
                : [
                    { code: 'MATH-104', subject: 'Mathematics', score: 96, max: 100, grade: 'Grade A' },
                    { code: 'ENG-104', subject: 'English Language', score: 91, max: 100, grade: 'Grade A' },
                    { code: 'SCI-104', subject: 'General Science', score: 89, max: 100, grade: 'Grade B' },
                    { code: 'ISL-104', subject: 'Islamic Studies', score: 98, max: 100, grade: 'Grade A' },
                  ]
              ).map((row) => (
                <div
                  key={row.code}
                  className="p-3 rounded-xl bg-[#0d111c] border border-white/[0.05] flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">{row.subject}</div>
                    <div className="text-[11px] font-mono text-[#64748b]">{row.code}</div>
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="text-white font-semibold">
                      {row.score} / {row.max}
                    </span>
                    <span className="text-emerald-400 font-semibold">{row.grade}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-[#94a3b8]">
                Cumulative Average:{' '}
                <strong className="text-white font-mono tabular-nums">
                  {examTerm === 'term1' ? '92.5%' : '93.5%'}
                </strong>
              </span>
              <span className="font-semibold text-emerald-400">
                Status: Passed · Distinction
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 04: TEACHERS & STAFF
           ================================================================= */}
        <div
          id="teachers-staff"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 lg:order-2 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              04 · Teachers &amp; Staff Directory
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Coordinate faculty, class masters, and support staff.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Manage teacher profiles, assign head teachers to specific classrooms, invite educators to their dedicated portal, and monitor daily staff attendance and salary records.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Assign designated Class Masters and subject-specific instructors</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>One-click teacher portal invitation and secure password activation flow</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Dedicated directories for teaching faculty, non-teaching staff, and guardians</span>
              </li>
            </ul>
          </div>

          {/* Interactive Teachers & Staff Mockup */}
          <div className="lg:col-span-7 lg:order-1 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div>
                <div className="text-sm font-semibold text-white">
                  People &amp; HR Directory
                </div>
                <div className="text-xs text-[#64748b]">
                  24 Faculty Members · 9 Operational Staff
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setPeopleTab('teachers')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    peopleTab === 'teachers'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Teaching Faculty
                </button>
                <button
                  type="button"
                  onClick={() => setPeopleTab('staff')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    peopleTab === 'staff'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Support Staff
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {(peopleTab === 'teachers'
                ? [
                    { name: 'Macallin Maxamed Cusmaan', role: 'Head Teacher · Fasalka 4A', dept: 'Mathematics & Physics', status: 'Portal Active' },
                    { name: 'Macallimad Maryan Jaamac', role: 'Head Teacher · Fasalka 3B', dept: 'English & Literature', status: 'Portal Active' },
                    { name: 'Macallin Xasan Cabdi', role: 'Subject Instructor · Grade 4', dept: 'Islamic Studies & Arabic', status: 'Portal Active' },
                  ]
                : [
                    { name: 'Axmed Warsame Cali', role: 'Senior Bursar', dept: 'Finance & Accounts Office', status: 'On Duty' },
                    { name: 'Xaawo Nuur Xuseen', role: 'Admissions Registrar', dept: 'Student Records Office', status: 'On Duty' },
                    { name: 'Cabdullaahi Faarax', role: 'Campus Librarian', dept: 'Central Library', status: 'On Duty' },
                  ]
              ).map((person) => (
                <div
                  key={person.name}
                  className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-white">{person.name}</div>
                    <div className="text-[11px] text-[#94a3b8]">
                      {person.role} · {person.dept}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400 font-medium">
                    {person.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================
            FEATURE 05: FEES & FINANCE
           ================================================================= */}
        <div
          id="fees-management"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              05 · Fees &amp; Institutional Finance
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Full-cycle tuition billing, receipts, expenses, and payroll.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Eliminate revenue leakage with structured fee structures, monthly student invoices, partial payment tracking, printable receipts, operational expense logs, and staff payroll.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Automated balance calculation across Paid, Partial, and Unpaid invoices</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Printable PDF payment receipts and direct WhatsApp guardian reminders</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Integrated general income, expense categories, budgets, and monthly payroll</span>
              </li>
            </ul>
          </div>

          {/* Interactive Finance Mockup */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div>
                <div className="text-sm font-semibold text-white">
                  Institutional Finance Suite
                </div>
                <div className="text-xs text-[#64748b]">
                  March 2026 Financial Period · Currency: USD ($)
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setFinanceTab('invoices')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    financeTab === 'invoices'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Tuition Invoices
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceTab('payroll')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    financeTab === 'payroll'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Payroll &amp; Expenses
                </button>
              </div>
            </div>

            {financeTab === 'invoices' ? (
              <div className="space-y-2.5 text-xs">
                {[
                  { id: 'INV-2026-301', name: 'Maxamed Cali Jaamac', amount: '$50.00', paid: '$50.00', bal: '$0.00', status: 'PAID' },
                  { id: 'INV-2026-302', name: 'Caasho Axmed Nuur', amount: '$50.00', paid: '$50.00', bal: '$0.00', status: 'PAID' },
                  { id: 'INV-2026-303', name: 'Cabdiraxmaan Xasan Faarax', amount: '$50.00', paid: '$30.00', bal: '$20.00', status: 'PARTIAL' },
                ].map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-white">{inv.name}</div>
                      <div className="text-[11px] font-mono text-[#64748b]">{inv.id} · March Tuition</div>
                    </div>
                    <div className="flex items-center gap-4 font-mono tabular-nums">
                      <span className="text-[#94a3b8]">Paid: {inv.paid}</span>
                      <span className="text-white">Bal: {inv.bal}</span>
                      <span
                        className={`font-semibold ${
                          inv.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {[
                  { ref: 'PAY-2026-01', title: 'Macallin Maxamed Cusmaan · March Salary', category: 'Faculty Payroll', amount: '$450.00', status: 'Disbursed' },
                  { ref: 'PAY-2026-02', title: 'Macallimad Maryan Jaamac · March Salary', category: 'Faculty Payroll', amount: '$450.00', status: 'Disbursed' },
                  { ref: 'EXP-2026-14', title: 'Science Lab Supplies & Textbooks', category: 'Academic Expense', amount: '$320.00', status: 'Approved' },
                ].map((row) => (
                  <div
                    key={row.ref}
                    className="p-3.5 rounded-xl bg-[#0d111c] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-white">{row.title}</div>
                      <div className="text-[11px] font-mono text-[#64748b]">
                        {row.ref} · {row.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 font-mono tabular-nums">
                      <span className="text-white font-semibold">{row.amount}</span>
                      <span className="text-emerald-400">{row.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =================================================================
            FEATURE 06: REPORTS & ANALYTICS
           ================================================================= */}
        <div
          id="reports-analytics"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 lg:order-2 space-y-5">
            <div className="text-xs font-mono text-[#a5b4fc]">
              06 · Reports &amp; Analytics
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Instant official PDF report cards and audit statements.
            </h3>
            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              Generate publication-ready student transcripts, class attendance sheets, and financial collection statements formatted with your school&apos;s official letterhead.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#cbd5e1]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Individual student report cards with subject breakdown and principal remarks</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Exportable PDF and Excel (.xlsx) financial and attendance summaries</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Visual executive analytics for enrollment growth and collection efficiency</span>
              </li>
            </ul>
          </div>

          {/* Interactive Reports Mockup */}
          <div className="lg:col-span-7 lg:order-1 rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#818cf8]" />
                <span className="text-sm font-semibold text-white">
                  Official Document Generator
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070a11] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setReportType('transcript')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    reportType === 'transcript'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Student Report Card
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('ledger')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    reportType === 'ledger'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Financial Audit PDF
                </button>
              </div>
            </div>

            {reportType === 'transcript' ? (
              <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.05] space-y-3 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <div className="font-bold text-white text-sm">
                      OFFICIAL ACADEMIC TRANSCRIPT · TERM 1
                    </div>
                    <div className="text-[#94a3b8] mt-0.5">
                      Student: Maxamed Cali Jaamac · Class: Fasalka 4A
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-emerald-400 font-bold text-sm">92.5%</div>
                    <div className="text-[11px] text-[#64748b]">Rank: #2 of 36</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[#64748b] block text-[10px]">Mathematics</span>
                    <span className="text-white font-semibold">94% (A)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[#64748b] block text-[10px]">English</span>
                    <span className="text-white font-semibold">88% (B)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[#64748b] block text-[10px]">Science</span>
                    <span className="text-white font-semibold">91% (A)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[#64748b] block text-[10px]">Islamic Studies</span>
                    <span className="text-white font-semibold">97% (A)</span>
                  </div>
                </div>
                <div className="pt-2 text-[#94a3b8] italic">
                  Principal Remarks: &ldquo;Demonstrates exemplary academic consistency and classroom leadership.&rdquo;
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.05] space-y-3 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <div className="font-bold text-white text-sm">
                      MONTHLY FINANCIAL RECONCILIATION STATEMENT
                    </div>
                    <div className="text-[#94a3b8] mt-0.5">
                      Period: March 2026 · Verified Institutional Ledger
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-emerald-400 font-bold text-sm">$18,450.00</div>
                    <div className="text-[11px] text-[#64748b]">88.4% Collected</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[#64748b] block text-[10px]">Total Billed</span>
                    <span className="text-white font-semibold">$20,860.00</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[#64748b] block text-[10px]">Total Collected</span>
                    <span className="text-emerald-400 font-semibold">$18,450.00</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[#64748b] block text-[10px]">Outstanding</span>
                    <span className="text-amber-400 font-semibold">$2,410.00</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
