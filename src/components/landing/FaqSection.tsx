import React, { useState } from 'react';
import { ChevronDown, FileSpreadsheet, ShieldCheck, BookOpen, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function FaqSection() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const resourceGuides = [
    {
      icon: FileSpreadsheet,
      category: 'Onboarding Guide',
      readTime: '3 min read',
      title: 'Bulk Importing Student Rosters via Excel (.xlsx)',
      summary:
        'How to format student names, classroom assignments, and guardian telephone numbers for instant batch import.',
    },
    {
      icon: BookOpen,
      category: 'Academic Setup',
      readTime: '4 min read',
      title: 'Configuring Grade Boundaries & Pass Thresholds',
      summary:
        'Customize minimum pass marks and automatic Grade A, B, C, D letter thresholds for term report cards.',
    },
    {
      icon: ShieldCheck,
      category: 'Security Architecture',
      readTime: '5 min read',
      title: 'Multi-Tenant Isolation & Role-Based Permissions',
      summary:
        'Understanding how School ID tenant boundaries and role guards protect student and financial records.',
    },
    {
      icon: WifiOff,
      category: 'Field Operations',
      readTime: '3 min read',
      title: 'Using Offline Sync for Classroom Attendance',
      summary:
        'How teachers record Morning and Afternoon roll calls during connectivity drops with automatic background sync.',
    },
  ];

  const faqs = [
    {
      q: 'What school operations can be managed inside Dugsi Pro?',
      a: 'Dugsi Pro unifies 12 core institutional modules: Student Directory & Profiles, Admissions Pipeline, Classes & Subjects, Weekly Timetables, Multi-Session Attendance (Morning & Afternoon), Examinations & Automated Grading, Tuition Invoicing & Payment Receipts, Expenses & Payroll, Library Lending, Asset Inventory, Announcements, and Official PDF Reports.',
    },
    {
      q: 'How is our school data kept private and isolated from other schools?',
      a: 'Every school workspace operates under strict multi-tenant isolation tied to a verified School ID. All API requests, database queries, student records, and financial ledgers are scoped exclusively to your institution.',
    },
    {
      q: 'Can we import our existing student list from Excel?',
      a: 'Yes. Inside the Students module, you can download a standardized Excel (.xlsx) template, paste your existing student names, assigned classes, and guardian phone numbers, and import hundreds of students in seconds.',
    },
    {
      q: 'How does the twice-daily attendance system work?',
      a: 'Class teachers select their classroom and session—Morning (Subaxdii / Before Break) or Afternoon (Galabtii / After Break)—and can mark the entire class Present with one click, then adjust individual Absent, Late, or Excused statuses.',
    },
    {
      q: 'Do teachers see school financial records or payroll?',
      a: 'No. Dugsi Pro enforces strict Role-Based Access Control (RBAC). Teachers only access their assigned classrooms, attendance sheets, exam score entry, and timetables. Financial ledgers, payroll, and system settings are restricted to authorized administrators and bursars.',
    },
    {
      q: 'Can Dugsi Pro generate printable PDF report cards and fee receipts?',
      a: 'Yes. The platform includes built-in PDF and Excel engines that generate official student report cards with principal remarks, printable tuition receipts, attendance statements, and financial audit summaries.',
    },
  ];

  return (
    <section
      id="resources"
      className="py-24 md:py-32 bg-[#06080f] border-t border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {/* Part 1: Institutional Resources & Implementation Guides */}
        <div>
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-medium text-[#94a3b8] mb-3">
              10 · Institutional Resources &amp; Documentation
            </div>
            <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-4">
              Implementation guides for school leaders.
            </h2>
            <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
              Practical documentation covering data migration, academic grading setup, and role governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {resourceGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <div
                  key={guide.title}
                  className="p-6 rounded-2xl bg-[#0a0d16] border border-white/[0.08] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#64748b] mb-4">
                      <span>{guide.category}</span>
                      <span>·</span>
                      <span className="font-mono">{guide.readTime}</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[#4f46e5]/15 text-[#818cf8] flex items-center justify-center mb-4">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-snug">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      {guide.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Part 2: Frequently Asked Questions */}
        <div id="faq" className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-medium text-[#94a3b8] mb-3">
              Frequently Asked Questions
            </div>
            <h3 className="landing-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
              Answers to common institutional questions.
            </h3>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              const panelId = `faq-panel-${idx}`;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-white/[0.08] bg-[#0a0d16] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4.5 flex items-center justify-between gap-4 text-left font-semibold text-sm sm:text-base text-white hover:text-[#a5b4fc] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#94a3b8] transition-transform duration-150 shrink-0 ${
                        isOpen ? 'rotate-180 text-[#a5b4fc]' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="px-6 pb-5 text-xs sm:text-sm text-[#94a3b8] leading-relaxed border-t border-white/[0.05] pt-3.5"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
