import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  BookOpen,
  DollarSign,
  FileText,
  Layers,
  Bell,
  ArrowRight,
  CheckCircle2,
  Database,
} from 'lucide-react';

interface ProductOverviewProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
}

interface EcosystemDomain {
  id: string;
  index: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  synchronizedRecords: string[];
  connectedModules: string;
  authorizedRoles: string;
}

export default function ProductOverview({
  onNavigate,
  isAuthenticated,
}: ProductOverviewProps) {
  const domains: EcosystemDomain[] = [
    {
      id: 'students',
      index: '01',
      name: 'Students',
      tagline: 'Lifecycle Registry & Profiles',
      icon: Users,
      description:
        'Every enrolled student is assigned a unique institutional record that automatically populates classroom rosters, roll call sheets, fee invoices, and term exam transcripts.',
      synchronizedRecords: [
        'Verified full name, gender, and student ID code',
        'Assigned classroom and academic year status',
        'Linked parent/guardian telephone contact directory',
        'Bulk Excel import and printable roster exports',
      ],
      connectedModules: 'Attendance · Academics · Finance · Reports',
      authorizedRoles: 'Principal · Registrar · Class Teacher',
    },
    {
      id: 'teachers',
      index: '02',
      name: 'Teachers',
      tagline: 'Faculty, HR & Staff Attendance',
      icon: UserCheck,
      description:
        'Coordinate teaching faculty and administrative staff with designated class master assignments, subject allocations, daily staff attendance, and monthly payroll records.',
      synchronizedRecords: [
        'Designated Class Master & subject instructor mapping',
        'Secure teacher account invitations and role activation',
        'Daily staff attendance and check-in tracking',
        'Synchronized monthly salary and payroll slips',
      ],
      connectedModules: 'Academics · Timetable · Finance Payroll',
      authorizedRoles: 'Principal · HR Admin · Bursar',
    },
    {
      id: 'attendance',
      index: '03',
      name: 'Attendance',
      tagline: 'Morning & Afternoon Roll Call',
      icon: Calendar,
      description:
        'Capture student attendance across both Morning (Before Break) and Afternoon (After Break) sessions with one-click present marking and historical absence tracking.',
      synchronizedRecords: [
        'Two-session daily roll call (Subaxdii & Galabtii)',
        'Present, Absent, Late, and Excused status logging',
        'Individual student attendance history timelines',
        'Official printable classroom attendance statements',
      ],
      connectedModules: 'Students · Classes · Official Reports',
      authorizedRoles: 'Principal · Class Teacher · Registrar',
    },
    {
      id: 'academics',
      index: '04',
      name: 'Academics',
      tagline: 'Classes, Subjects & Exam Grading',
      icon: BookOpen,
      description:
        'Structure grade levels, classroom capacities, and subject codes while automating term examination calculations, pass/fail thresholds, and letter grades.',
      synchronizedRecords: [
        'Classroom capacities, room numbers, and head teachers',
        'Subject catalog with standardized course codes',
        'Term 1, Term 2, and Midterm exam score matrices',
        'Automatic percentage and A/B/C/D grade calculation',
      ],
      connectedModules: 'Students · Teachers · Report Cards',
      authorizedRoles: 'Principal · Academic Head · Subject Teacher',
    },
    {
      id: 'finance',
      index: '05',
      name: 'Finance',
      tagline: 'Tuition Billing, Expenses & Payroll',
      icon: DollarSign,
      description:
        'Manage the complete financial health of your institution—from monthly student tuition invoices and partial payment receipts to operational expenses, budgets, and staff payroll.',
      synchronizedRecords: [
        'Class-based fee structures and monthly student invoices',
        'Full and partial tuition payment receipts with audit trail',
        'Institutional income, operational expenses, and budgets',
        'Teacher and staff monthly payroll disbursement logs',
      ],
      connectedModules: 'Students · Teachers · Financial Reports',
      authorizedRoles: 'Principal · Bursar / Finance Officer',
    },
    {
      id: 'reports',
      index: '06',
      name: 'Reports',
      tagline: 'Transcripts & Institutional Analytics',
      icon: FileText,
      description:
        'Transform live school records into executive clarity. Generate official student report cards, classroom attendance summaries, and financial audit statements in seconds.',
      synchronizedRecords: [
        'Individual student PDF report cards with principal remarks',
        'Term-by-term academic ranking and pass rate analytics',
        'Monthly tuition collection vs. outstanding balance ledgers',
        'One-click institutional JSON backup and Excel exports',
      ],
      connectedModules: 'All Academic, Attendance & Financial Modules',
      authorizedRoles: 'Principal · Registrar · Bursar',
    },
    {
      id: 'operations',
      index: '07',
      name: 'Operations',
      tagline: 'Admissions, Timetable, Library & Assets',
      icon: Layers,
      description:
        'Run campus-wide logistics from a single command center—managing new student admissions pipelines, weekly class timetables, library book loans, and school inventory.',
      synchronizedRecords: [
        'Applicant pipeline with one-click enrollment into classes',
        'Conflict-free weekly classroom and teacher timetables',
        'Library book catalog, borrowing tracking, and returns',
        'School furniture, lab equipment, and asset inventory',
      ],
      connectedModules: 'Students · Teachers · Classes',
      authorizedRoles: 'Principal · Operations Admin · Librarian',
    },
    {
      id: 'communication',
      index: '08',
      name: 'Communication',
      tagline: 'Announcements & Role Notices',
      icon: Bell,
      description:
        'Keep administrators, faculty, students, and parents aligned with targeted institutional announcements, exam schedule notices, and direct WhatsApp fee reminders.',
      synchronizedRecords: [
        'School-wide and class-specific notice board broadcasts',
        'Priority pinning for urgent academic or calendar updates',
        'Direct WhatsApp payment receipt and balance notifications',
        'Role-targeted visibility across staff and guardians',
      ],
      connectedModules: 'Students · Teachers · Finance',
      authorizedRoles: 'Principal · Registrar · Bursar',
    },
  ];

  const [activeDomainId, setActiveDomainId] = useState<string>('students');
  const activeDomain =
    domains.find((d) => d.id === activeDomainId) || domains[0];
  const ActiveIcon = activeDomain.icon;

  return (
    <section
      id="product-overview"
      className="py-24 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      {/* Section Header */}
      <div className="max-w-3xl mb-16">
        <div className="text-xs font-medium text-[#94a3b8] mb-3">
          01 · Unified Platform Architecture
        </div>
        <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-5">
          One platform for your entire school.
        </h2>
        <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
          Dugsi Pro is architected around a single institutional data core. When a registrar enrolls a student or a bursar records a payment, every connected module updates immediately without duplicate entry.
        </p>
      </div>

      {/* Interactive Ecosystem Architecture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: 8-Module Architectural Selector Matrix */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {domains.map((domain) => {
              const Icon = domain.icon;
              const isSelected = domain.id === activeDomain.id;
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setActiveDomainId(domain.id)}
                  className={`p-4 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#101626] border-[#6366f1] shadow-lg shadow-indigo-950/40'
                      : 'bg-[#0a0d16] border-white/[0.07] hover:border-white/[0.16] hover:bg-[#0d111c]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-mono text-xs text-[#64748b] tabular-nums">
                      {domain.index}
                    </span>
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? 'text-[#818cf8]' : 'text-[#64748b]'
                      }`}
                    />
                  </div>
                  <div className="text-base font-semibold text-white mb-0.5">
                    {domain.name}
                  </div>
                  <div className="text-xs text-[#94a3b8] truncate">
                    {domain.tagline}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Central Data Bus Bar */}
          <div className="p-4 rounded-xl bg-[#0a0d16] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#cbd5e1]">
              <Database className="w-4 h-4 text-[#818cf8] shrink-0" />
              <span className="font-semibold text-white">
                Central Institutional Record
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[#94a3b8]">
                Real-time relational sync across all 8 modules
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 shrink-0">
              Zero Data Duplication
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Active Module Architectural Inspector */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-2xl bg-[#0b0f1a] border border-white/[0.09] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8]">
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono text-[#94a3b8]">
                    Module {activeDomain.index} · {activeDomain.name}
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {activeDomain.tagline}
                  </h3>
                </div>
              </div>
            </div>

            <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
              {activeDomain.description}
            </p>

            <div className="space-y-2.5 mb-6">
              <div className="text-xs font-semibold text-white mb-2">
                Synchronized Capabilities
              </div>
              {activeDomain.synchronizedRecords.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-[#cbd5e1]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-[#070a11] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64748b]">Connected Modules</span>
                <span className="text-[#cbd5e1] font-medium text-right">
                  {activeDomain.connectedModules}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.05]">
                <span className="text-[#64748b]">Role Permissions</span>
                <span className="text-[#a5b4fc] font-medium text-right">
                  {activeDomain.authorizedRoles}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/[0.07] flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'signup')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#a5b4fc] hover:text-white transition-colors cursor-pointer group"
            >
              <span>
                {isAuthenticated
                  ? `Open ${activeDomain.name} in Workspace`
                  : `Explore ${activeDomain.name} Module`}
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[11px] font-mono text-[#64748b] tabular-nums">
              {activeDomain.index} / 08
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
