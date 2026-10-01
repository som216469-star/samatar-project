import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
}

export default function HowItWorks({ onNavigate, isAuthenticated }: HowItWorksProps) {
  const steps = [
    {
      number: '01',
      timeframe: '2 Minutes',
      title: 'Provision Your School Workspace',
      description:
        'Register your institutional administrator account. Your school immediately receives an isolated multi-tenant workspace and dedicated School ID.',
    },
    {
      number: '02',
      timeframe: '10 Minutes',
      title: 'Configure Academic Structure & Fees',
      description:
        'Define your classrooms, subject codes, grading pass thresholds, and monthly tuition fee structures—or bulk-import your existing student roster from Excel.',
    },
    {
      number: '03',
      timeframe: 'Daily Operations',
      title: 'Run Attendance, Grading & Billing',
      description:
        'Invite teachers to record twice-daily roll call and exam scores while your finance office tracks tuition payments, receipts, and official PDF statements.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32 bg-[#070a12] border-t border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            07 · Institutional Onboarding
          </div>
          <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-4">
            Transition your school in three structured steps.
          </h2>
          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Dugsi Pro requires no external IT consultants or local servers. Set up your school structure and begin daily operations the same day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="p-7 rounded-2xl bg-[#0a0d16] border border-white/[0.08] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.06] font-mono text-xs tabular-nums">
                  <span className="text-[#818cf8] font-bold">Step {step.number}</span>
                  <span className="text-[#64748b]">{step.timeframe}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <button
            type="button"
            onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'signup')}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors duration-150 shadow-lg shadow-indigo-600/20 cursor-pointer group whitespace-nowrap"
          >
            <span>
              {isAuthenticated
                ? 'Open School Workspace'
                : 'Create Your School Workspace'}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
