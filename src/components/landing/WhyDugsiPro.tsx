import React from 'react';

export default function WhyDugsiPro() {
  const principles = [
    {
      index: '01',
      title: 'Multi-Tenant Data Isolation',
      description:
        'Every school operates within a strict tenant boundary keyed to its verified School ID. Student records, fee ledgers, and grades never cross institutional boundaries.',
    },
    {
      index: '02',
      title: 'Role-Based Access Control (RBAC)',
      description:
        'Principals, registrars, bursars, and class teachers each receive scoped navigation and route guards aligned with their exact institutional responsibilities.',
    },
    {
      index: '03',
      title: 'Offline-Resilient PWA Architecture',
      description:
        'Built with Progressive Web App caching and offline action queuing so teachers can continue logging attendance even during intermittent connectivity.',
    },
    {
      index: '04',
      title: 'Bilingual Operational Clarity',
      description:
        'Designed for immediate adoption by both Somali and English-speaking administrators and faculty, with intuitive workflows that require zero technical training.',
    },
    {
      index: '05',
      title: 'Publication-Grade PDF & Excel Engines',
      description:
        'Generate official report cards, tuition receipts, attendance statements, and full Excel spreadsheets directly from the browser without third-party plugins.',
    },
    {
      index: '06',
      title: 'Full Institutional Data Ownership',
      description:
        'Export your school’s complete database into structured JSON or Excel formats at any time with a single click for archival and compliance.',
    },
  ];

  return (
    <section
      id="why-dugsi-pro"
      className="py-24 md:py-32 bg-[#06080f] border-t border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            08 · Enterprise Architecture &amp; Reliability
          </div>
          <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-4">
            Engineered for institutional trust and longevity.
          </h2>
          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Dugsi Pro combines modern web performance with strict security boundaries so your school’s academic and financial history remains protected year after year.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-white/[0.08]">
          {principles.map((item) => (
            <div
              key={item.index}
              className="p-7 sm:p-8 border-r border-b border-white/[0.08] bg-[#06080f] hover:bg-[#0a0d16] transition-colors duration-150"
            >
              <div className="font-mono text-xs text-[#818cf8] tabular-nums mb-3">
                {item.index}
              </div>
              <h3 className="text-base font-bold text-white mb-2.5">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
