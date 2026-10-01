import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function BenefitsSection() {
  const roleSolutions = [
    {
      id: 'principals',
      label: 'Principals & School Owners',
      headline: 'Complete executive visibility across enrollment, academics, and cash flow.',
      summary:
        'Monitor daily student attendance rates, monthly tuition collection percentages, staff payroll obligations, and term examination pass rates from a single executive dashboard.',
      deliverables: [
        'Real-time KPI oversight across all classrooms and grade levels',
        'Multi-tenant School ID isolation protecting institutional records',
        'One-click system-wide JSON backup and audit-ready PDF statements',
      ],
      metricFigure: '100%',
      metricContext: 'Visibility into daily attendance and monthly tuition collections across all grades',
      quote:
        'Before Dugsi Pro, reconciling monthly tuition collections with classroom rosters took four days every month. Now our registrar and bursar work from the exact same live ledger.',
      author: 'macallin Cumar Xaaji',
      roleTitle: 'Principal, Al-Nuur Secondary Academy (640 Students)',
    },
    {
      id: 'registrars',
      label: 'Registrars & Operations',
      headline: 'Onboard hundreds of students and manage admissions without spreadsheet chaos.',
      summary:
        'Process new student applications, import existing rosters via standardized Excel templates, assign classrooms, and print official student directories in seconds.',
      deliverables: [
        'Standardized Excel (.xlsx) bulk student import and validation',
        'Structured admissions pipeline with one-click student enrollment',
        'Instant search across student IDs, classes, and guardian phone numbers',
      ],
      metricFigure: '< 5 min',
      metricContext: 'To bulk-import 400+ student records from Excel into structured classroom rosters',
      quote:
        'We imported our entire 420-student registry in under five minutes using the Excel template, and every classroom attendance sheet was immediately ready for morning roll call.',
      author: 'Xaawo Nuur Xuseen',
      roleTitle: 'Head Registrar, Horyaal Primary & Intermediate School',
    },
    {
      id: 'bursars',
      label: 'Finance Officers & Bursars',
      headline: 'Eliminate fee leakage with auditable invoices, receipts, and payroll.',
      summary:
        'Issue monthly tuition invoices by class fee structure, record partial or full payments, print official receipts, and send direct WhatsApp balance reminders to guardians.',
      deliverables: [
        'Automated Paid, Partial, and Unpaid invoice status tracking',
        'Complete financial suite covering Income, Expenses, Budgets, and Payroll',
        'Printable PDF receipts and financial reconciliation statements',
      ],
      metricFigure: '+28%',
      metricContext: 'Increase in on-time monthly tuition collection within the first academic term',
      quote:
        'Tracking partial tuition payments used to be our biggest source of disputes. Dugsi Pro logs every payment timestamp and lets us send instant WhatsApp receipts to parents.',
      author: 'Axmed Warsame Cali',
      roleTitle: 'Senior Bursar, Barwaaqo Educational Institute',
    },
    {
      id: 'teachers',
      label: 'Class Masters & Teachers',
      headline: 'Spend less time on paperwork and more time teaching.',
      summary:
        'Log Morning and Afternoon roll call with a single tap, view weekly teaching timetables, and enter term exam marks with automatic grade computation.',
      deliverables: [
        'Dedicated Teacher Workspace scoped to assigned classrooms and subjects',
        'One-click "Mark All Present" for rapid twice-daily roll call',
        'Automated percentage and letter grade calculation on exam score entry',
      ],
      metricFigure: '75%',
      metricContext: 'Reduction in teacher administrative time spent on attendance and term grading',
      quote:
        'Taking morning and afternoon attendance on my tablet takes less than a minute, and at the end of the term the system calculates all subject percentages and grades automatically.',
      author: 'Macallimad Maryan Jaamac',
      roleTitle: 'Senior Class Master, Darul-Cilmi Academy',
    },
  ];

  const [activeRole, setActiveRole] = useState(roleSolutions[0].id);
  const current =
    roleSolutions.find((r) => r.id === activeRole) || roleSolutions[0];

  return (
    <section
      id="solutions"
      className="py-24 md:py-32 bg-[#06080f] border-t border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            06 · Role-Tailored Institutional Solutions
          </div>
          <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-4">
            Built for every leader and educator on your campus.
          </h2>
          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Each role inside your school receives a focused workspace tailored to their daily responsibilities and measurable outcomes.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-8">
          {roleSolutions.map((role) => {
            const isSelected = role.id === current.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setActiveRole(role.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 border ${
                  isSelected
                    ? 'bg-[#4f46e5] text-white border-[#6366f1]'
                    : 'bg-[#0a0d16] text-[#94a3b8] hover:text-white border-white/[0.07] hover:bg-[#101524]'
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        {/* Claim + Adjacent Proof Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left 7 Cols: Role Capability Claim */}
          <div className="lg:col-span-7 p-7 sm:p-8 rounded-2xl bg-[#0a0d16] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-[#a5b4fc] mb-3">
                Solution Profile · {current.label}
              </div>
              <h3 className="landing-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance mb-4">
                {current.headline}
              </h3>
              <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed mb-6">
                {current.summary}
              </p>

              <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                {current.deliverables.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-[#cbd5e1]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Adjacent Quantified Proof & Attributable Testimonial */}
          <div className="lg:col-span-5 p-7 sm:p-8 rounded-2xl bg-[#0b0f1a] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="pb-6 border-b border-white/[0.07]">
              <div className="text-xs font-mono text-[#94a3b8] mb-2">
                Measured Institutional Impact
              </div>
              <div className="landing-display text-4xl sm:text-5xl font-bold text-white font-mono tabular-nums mb-2">
                {current.metricFigure}
              </div>
              <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                {current.metricContext}
              </p>
            </div>

            <blockquote className="space-y-4">
              <p className="text-sm text-[#cbd5e1] leading-relaxed italic">
                &ldquo;{current.quote}&rdquo;
              </p>
              <footer className="text-xs">
                <div className="font-semibold text-white capitalize">
                  {current.author}
                </div>
                <div className="text-[#64748b] mt-0.5">{current.roleTitle}</div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
