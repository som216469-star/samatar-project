import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  Award,
  FileText,
} from 'lucide-react';

export default function SchoolWorkflow() {
  const workflowStages = [
    {
      index: '01',
      name: 'Admissions',
      short: 'Applicant intake',
      icon: UserPlus,
      detail:
        'Prospective students submit applications and assessment records. Approved applicants convert into enrolled students with one click.',
    },
    {
      index: '02',
      name: 'Student Registry',
      short: 'Master profile',
      icon: Users,
      detail:
        'Each student receives a unique ID, guardian contact profile, and active enrollment status in the central school database.',
    },
    {
      index: '03',
      name: 'Classes & Timetable',
      short: 'Room & schedule',
      icon: BookOpen,
      detail:
        'Students are mapped to grade classrooms with designated Class Masters, subject curricula, and weekly period schedules.',
    },
    {
      index: '04',
      name: 'Daily Roll Call',
      short: '2× daily sessions',
      icon: Calendar,
      detail:
        'Teachers log Morning (Before Break) and Afternoon (After Break) attendance directly from classroom rosters.',
    },
    {
      index: '05',
      name: 'Tuition Billing',
      short: 'Invoices & receipts',
      icon: DollarSign,
      detail:
        'Monthly fee structures generate student invoices automatically, tracking full payments, partial balances, and audit receipts.',
    },
    {
      index: '06',
      name: 'Exams & Grading',
      short: 'Automated marks',
      icon: Award,
      detail:
        'Subject instructors enter term exam scores; Dugsi Pro computes percentages and assigns A, B, C, D, or Fail grades.',
    },
    {
      index: '07',
      name: 'Official Reports',
      short: 'PDF transcripts',
      icon: FileText,
      detail:
        'Principals and registrars generate printable PDF report cards, attendance statements, and financial reconciliation ledgers.',
    },
  ];

  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const activeStage = workflowStages[activeStageIndex];

  return (
    <section
      id="workflow"
      className="py-24 md:py-32 bg-[#070a12] border-t border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            05 · Connected Institutional Lifecycle
          </div>
          <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-4">
            Data entered once powers every downstream workflow.
          </h2>
          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Follow how a student record moves seamlessly from initial admission to graduation transcripts without manual re-entry.
          </p>
        </div>

        {/* Interactive 7-Stage Pipeline */}
        <div className="rounded-2xl bg-[#0a0d16] border border-white/[0.08] p-6 md:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {workflowStages.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = idx === activeStageIndex;
              return (
                <button
                  key={stage.index}
                  type="button"
                  onClick={() => setActiveStageIndex(idx)}
                  className={`p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#101626] border-[#6366f1] shadow-md'
                      : 'bg-[#0d111c] border-white/[0.05] hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-[#64748b] tabular-nums">
                      {stage.index}
                    </span>
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? 'text-[#818cf8]' : 'text-[#64748b]'
                      }`}
                    />
                  </div>
                  <div className="text-xs font-semibold text-white mb-0.5 truncate">
                    {stage.name}
                  </div>
                  <div className="text-[11px] text-[#94a3b8] truncate">
                    {stage.short}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detail Bar */}
          <div className="p-5 rounded-xl bg-[#0d111c] border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <div className="text-xs font-mono text-[#a5b4fc]">
                Stage {activeStage.index} of 07 · {activeStage.name}
              </div>
              <p className="text-sm text-[#f8fafc] leading-relaxed">
                {activeStage.detail}
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 shrink-0">
              Synchronized Automatically
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
