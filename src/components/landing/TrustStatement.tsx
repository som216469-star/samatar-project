import React from 'react';

export default function TrustStatement() {
  const capabilityMetrics = [
    {
      figure: '12',
      unit: 'Integrated Modules',
      context: 'Unified student registry, grading, billing, and campus operations',
    },
    {
      figure: '2×',
      unit: 'Daily Roll Call Sessions',
      context: 'Morning (Before Break) and Afternoon (After Break) attendance tracking',
    },
    {
      figure: '100%',
      unit: 'Multi-Tenant Isolation',
      context: 'Dedicated School ID database separation with role-based access control',
    },
    {
      figure: '< 2s',
      unit: 'Official PDF Generation',
      context: 'Instant printable report cards, fee receipts, and audit statements',
    },
  ];

  const domainPillars = [
    'Academic Registry & Admissions',
    'Morning & Afternoon Attendance',
    'Examinations & Automated Grading',
    'Tuition Invoicing & Payroll Ledger',
    'Timetable, Library & Inventory',
    'Role-Based Access & Security',
  ];

  return (
    <section
      id="trust-statement"
      className="py-16 md:py-24 bg-[#070a12] border-y border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Editorial Statement */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            Institutional Infrastructure · Built for Primary, Secondary &amp; Academy Networks
          </div>
          <h2 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance mb-4">
            Everything your school needs, in one place.
          </h2>
          <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
            Replace disconnected spreadsheets, handwritten registers, and paper receipt books with a single source of truth engineered for daily educational operations.
          </p>
        </div>

        {/* Quantitative Capability Benchmarks (Hairline Architectural Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-white/[0.08] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
          {capabilityMetrics.map((metric, idx) => (
            <div key={idx} className="py-6 sm:px-6 first:sm:pl-0 last:sm:pr-0">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="landing-display text-3xl sm:text-4xl font-bold text-white font-mono tabular-nums">
                  {metric.figure}
                </span>
                <span className="text-xs font-semibold text-[#a5b4fc]">
                  {metric.unit}
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                {metric.context}
              </p>
            </div>
          ))}
        </div>

        {/* Unboxed Product Category Indicators */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#64748b]">
          {domainPillars.map((pillar, idx) => (
            <React.Fragment key={pillar}>
              <span className="text-[#94a3b8] font-medium">{pillar}</span>
              {idx < domainPillars.length - 1 && (
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
