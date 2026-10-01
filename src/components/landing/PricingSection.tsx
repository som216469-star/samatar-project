import React, { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface PricingSectionProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
}

export default function PricingSection({
  onNavigate,
  isAuthenticated,
}: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  const pricingTiers = [
    {
      name: 'Starter School',
      target: 'Up to 250 Students · Primary & Community Schools',
      monthlyPrice: '$29',
      annualPrice: '$24',
      period: 'per month',
      description:
        'Essential digital infrastructure to organize student profiles, twice-daily attendance, and monthly tuition collection.',
      features: [
        'Complete Student Directory & Guardian Contacts',
        'Classes & Classroom Capacity Management',
        'Morning & Afternoon Attendance Roll Call',
        'Monthly Tuition Invoicing & Payment Receipts',
        'Bulk Excel (.xlsx) Student Roster Import',
        'Printable PDF Student & Attendance Rosters',
      ],
      highlighted: false,
      ctaText: 'Start with Starter',
    },
    {
      name: 'Professional School',
      target: 'Up to 800 Students · Primary & Secondary Academies',
      monthlyPrice: '$59',
      annualPrice: '$49',
      period: 'per month',
      description:
        'Full academic, financial, and operational suite including automated exam grading, report cards, payroll, and teacher portals.',
      features: [
        'Everything in Starter School',
        'Subjects, Course Codes & Weekly Timetables',
        'Term Examinations & Automated Letter Grading',
        'Official Student PDF Report Cards with Remarks',
        'Expenses, Budgets & Monthly Staff Payroll Suite',
        'Admissions Pipeline, Library & Asset Inventory',
        'Role-Based Teacher & Bursar Portal Access',
      ],
      highlighted: true,
      ctaText: 'Start with Professional',
    },
    {
      name: 'Campus & Network',
      target: 'Unlimited Students · Multi-Branch Educational Institutions',
      monthlyPrice: '$119',
      annualPrice: '$99',
      period: 'per month',
      description:
        'Enterprise institutional deployment for large academies requiring custom letterhead reporting, full backups, and priority onboarding.',
      features: [
        'Everything in Professional School',
        'Unlimited Student & Faculty Profiles',
        'Custom Academic Cycle & Multi-Currency Setup',
        'Official Institutional Letterhead PDF Exports',
        'One-Click Full System JSON Database Backup',
        'Dedicated Data Migration & Staff Onboarding',
      ],
      highlighted: false,
      ctaText: 'Start with Campus',
    },
  ];

  return (
    <section
      id="pricing"
      className="py-24 md:py-32 bg-[#070a12] border-t border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Billing Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <div className="text-xs font-medium text-[#94a3b8] mb-3">
              09 · Predictable Institutional Licensing
            </div>
            <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-4">
              Transparent plans scaled to your school.
            </h2>
            <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
              Every plan includes multi-tenant data isolation, unlimited daily roll calls, and instant PDF generation with no hidden per-user fees.
            </p>
          </div>

          {/* Interactive Billing Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0a0d16] border border-white/[0.08] self-start">
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                billingCycle === 'annual'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Annual Billing · Save 20%
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                billingCycle === 'monthly'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {pricingTiers.map((tier) => {
            const price =
              billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
            return (
              <div
                key={tier.name}
                className={`p-7 sm:p-8 rounded-2xl flex flex-col justify-between border ${
                  tier.highlighted
                    ? 'bg-[#0b1020] border-[#6366f1] shadow-2xl shadow-indigo-950/50'
                    : 'bg-[#0a0d16] border-white/[0.08]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    {tier.highlighted && (
                      <span className="text-xs font-mono font-semibold text-[#a5b4fc]">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#94a3b8] mb-6">{tier.target}</div>

                  <div className="flex items-baseline gap-2 pb-6 mb-6 border-b border-white/[0.07]">
                    <span className="landing-display text-4xl sm:text-5xl font-bold text-white font-mono tabular-nums">
                      {price}
                    </span>
                    <div className="text-xs text-[#64748b]">
                      <div>{tier.period}</div>
                      <div>
                        {billingCycle === 'annual'
                          ? 'Billed annually'
                          : 'Billed monthly'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed mb-6">
                    {tier.description}
                  </p>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feat, fIdx) => (
                      <li
                        key={fIdx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#e2e8f0]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onNavigate(isAuthenticated ? 'dashboard' : 'signup')
                  }
                  className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                    tier.highlighted
                      ? 'bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-lg shadow-indigo-600/25'
                      : 'border border-white/[0.12] hover:border-white/[0.25] bg-white/[0.03] hover:bg-white/[0.07] text-white'
                  }`}
                >
                  <span>
                    {isAuthenticated ? 'Open School Workspace' : tier.ctaText}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
