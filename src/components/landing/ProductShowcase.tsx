import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Award,
  FileText,
  BookOpen,
  ShieldCheck,
  Download,
} from 'lucide-react';

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'students'
    | 'attendance'
    | 'fees'
    | 'exams'
    | 'reports'
    | 'classes'
    | 'settings'
  >('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'Executive Dashboard', icon: BarChart3 },
    { id: 'students' as const, label: 'Student Registry', icon: Users },
    { id: 'attendance' as const, label: 'Roll Call', icon: Calendar },
    { id: 'fees' as const, label: 'Tuition & Finance', icon: DollarSign },
    { id: 'exams' as const, label: 'Exams & Grades', icon: Award },
    { id: 'reports' as const, label: 'Official PDF Reports', icon: FileText },
    { id: 'classes' as const, label: 'Classes & Subjects', icon: BookOpen },
    { id: 'settings' as const, label: 'Governance & Backup', icon: ShieldCheck },
  ];

  return (
    <section
      id="preview"
      className="py-24 md:py-32 bg-[#06080f] border-t border-white/[0.07]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-xs font-medium text-[#94a3b8] mb-3">
            04 · Interactive Product Tour
          </div>
          <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-4">
            Experience the Dugsi Pro workspace.
          </h2>
          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Switch between live operational views below to inspect how principals, registrars, bursars, and teachers interact with the platform every day.
          </p>
        </div>

        {/* Interactive Segmented Control Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 border ${
                  isActive
                    ? 'bg-[#4f46e5] text-white border-[#6366f1] shadow-md shadow-indigo-950/50'
                    : 'bg-[#0a0d16] text-[#94a3b8] hover:text-white border-white/[0.07] hover:bg-[#101524]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Application Window Frame */}
        <div className="rounded-2xl border border-white/[0.09] bg-[#0a0d16] shadow-2xl overflow-hidden">
          {/* Top Bar */}
          <div className="px-5 py-3.5 bg-[#070a11] border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="ml-3 text-xs font-mono text-[#64748b]">
                dugsipro.app/workspace/{activeTab}
              </span>
            </div>
            <div className="text-xs font-mono text-[#94a3b8]">
              School ID: <span className="text-emerald-400">Isolated Tenant</span>
            </div>
          </div>

          {/* Screen Body */}
          <div className="p-6 md:p-8 bg-[#090c14] min-h-[420px]">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs text-[#94a3b8] block mb-1">
                      Active Enrollment
                    </span>
                    <div className="flex items-baseline justify-between font-mono tabular-nums">
                      <span className="text-2xl md:text-3xl font-bold text-white">
                        428
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        100% Verified
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs text-[#94a3b8] block mb-1">
                      Tuition Revenue
                    </span>
                    <div className="flex items-baseline justify-between font-mono tabular-nums">
                      <span className="text-2xl md:text-3xl font-bold text-white">
                        $18,450
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        88.4% Collected
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs text-[#94a3b8] block mb-1">
                      Today&apos;s Roll Call
                    </span>
                    <div className="flex items-baseline justify-between font-mono tabular-nums">
                      <span className="text-2xl md:text-3xl font-bold text-white">
                        94.8%
                      </span>
                      <span className="text-xs text-sky-400 font-semibold">
                        2 Sessions
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs text-[#94a3b8] block mb-1">
                      Term 1 Pass Rate
                    </span>
                    <div className="flex items-baseline justify-between font-mono tabular-nums">
                      <span className="text-2xl md:text-3xl font-bold text-white">
                        89.2%
                      </span>
                      <span className="text-xs text-[#a5b4fc] font-semibold">
                        60% Threshold
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 p-5 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white">
                        Monthly Tuition Collection Progress
                      </h3>
                      <span className="text-xs text-[#64748b] font-mono tabular-nums">
                        Academic Cycle 2025/2026
                      </span>
                    </div>
                    <div className="space-y-3.5 font-mono text-xs tabular-nums">
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-white font-sans font-medium">January Billing</span>
                          <span className="text-emerald-400">$17,800 / $19,500 (91%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '91%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-white font-sans font-medium">February Billing</span>
                          <span className="text-emerald-400">$18,900 / $20,200 (93%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '93%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-white font-sans font-medium">March Billing</span>
                          <span className="text-[#a5b4fc]">$18,450 / $20,860 (88%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full bg-[#6366f1] rounded-full" style={{ width: '88%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-[#0d111c] border border-white/[0.06] flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3">
                        Direct Document Exports
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                          <span className="text-white">Student Directory PDF</span>
                          <Download className="w-3.5 h-3.5 text-[#a5b4fc]" />
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                          <span className="text-white">Attendance Roll Statement</span>
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                          <span className="text-white">Monthly Financial Ledger</span>
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-white/[0.06] text-xs text-[#64748b]">
                      Synchronized across all authorized school devices
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Student Enrollment &amp; Directory
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      Search, filter, enroll, and bulk-import student records via standardized Excel templates
                    </p>
                  </div>
                  <div className="text-xs font-mono text-[#a5b4fc] tabular-nums">
                    Showing 3 of 428 Records
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#94a3b8] font-semibold">
                        <th className="py-3 px-3">Student ID</th>
                        <th className="py-3 px-3">Full Name</th>
                        <th className="py-3 px-3">Classroom</th>
                        <th className="py-3 px-3">Guardian Phone</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] font-mono tabular-nums">
                      <tr>
                        <td className="py-3.5 px-3 text-[#64748b]">STD-2026-041</td>
                        <td className="py-3.5 px-3 font-sans font-semibold text-white">Maxamed Cali Jaamac</td>
                        <td className="py-3.5 px-3 font-sans text-[#cbd5e1]">Fasalka 4A</td>
                        <td className="py-3.5 px-3 text-[#94a3b8]">+252 61 5123456</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-semibold">Active</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-3 text-[#64748b]">STD-2026-042</td>
                        <td className="py-3.5 px-3 font-sans font-semibold text-white">Caasho Axmed Nuur</td>
                        <td className="py-3.5 px-3 font-sans text-[#cbd5e1]">Fasalka 3B</td>
                        <td className="py-3.5 px-3 text-[#94a3b8]">+252 61 5654321</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-semibold">Active</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-3 text-[#64748b]">STD-2026-043</td>
                        <td className="py-3.5 px-3 font-sans font-semibold text-white">Cabdiraxmaan Xasan Faarax</td>
                        <td className="py-3.5 px-3 font-sans text-[#cbd5e1]">Fasalka 4A</td>
                        <td className="py-3.5 px-3 text-[#94a3b8]">+252 61 5998877</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-semibold">Active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Multi-Session Attendance Roll Call
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      Morning (Before Break) &amp; Afternoon (After Break) verification with instant summary metrics
                    </p>
                  </div>
                  <div className="text-xs font-mono text-emerald-400">
                    One-Click Mark All Present Enabled
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono tabular-nums">
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs font-sans text-[#94a3b8] block">Present</span>
                    <span className="text-2xl font-bold text-emerald-400 mt-1 block">33</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs font-sans text-[#94a3b8] block">Absent</span>
                    <span className="text-2xl font-bold text-rose-400 mt-1 block">1</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs font-sans text-[#94a3b8] block">Late</span>
                    <span className="text-2xl font-bold text-amber-400 mt-1 block">1</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-xs font-sans text-[#94a3b8] block">Excused</span>
                    <span className="text-2xl font-bold text-sky-400 mt-1 block">1</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Student Tuition Invoicing &amp; Audit Ledger
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      Monthly billing records with full payment receipts, partial balances, and WhatsApp reminders
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 tabular-nums">
                    March Collection: $18,450.00
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#94a3b8] font-sans font-semibold">
                        <th className="py-3 px-3">Student</th>
                        <th className="py-3 px-3">Billing Month</th>
                        <th className="py-3 px-3">Billed</th>
                        <th className="py-3 px-3">Collected</th>
                        <th className="py-3 px-3">Balance</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      <tr>
                        <td className="py-3.5 px-3 font-sans font-semibold text-white">Maxamed Cali Jaamac</td>
                        <td className="py-3.5 px-3 font-sans text-[#94a3b8]">March 2026</td>
                        <td className="py-3.5 px-3 text-white">$50.00</td>
                        <td className="py-3.5 px-3 text-emerald-400">$50.00</td>
                        <td className="py-3.5 px-3 text-[#64748b]">$0.00</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-semibold">PAID</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-3 font-sans font-semibold text-white">Caasho Axmed Nuur</td>
                        <td className="py-3.5 px-3 font-sans text-[#94a3b8]">March 2026</td>
                        <td className="py-3.5 px-3 text-white">$50.00</td>
                        <td className="py-3.5 px-3 text-amber-400">$25.00</td>
                        <td className="py-3.5 px-3 text-amber-400">$25.00</td>
                        <td className="py-3.5 px-3 text-amber-400 font-semibold">PARTIAL</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'exams' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Examinations &amp; Automated Grade Computation
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      Customizable grade boundaries: Grade A (90%+), B (80%+), C (70%+), D (60%+), Fail
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#a5b4fc]">
                    Term 1 Results Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { subj: 'Mathematics', cls: 'Fasalka 4A', marks: '94 / 100', grade: 'Grade A' },
                    { subj: 'English Language', cls: 'Fasalka 4A', marks: '86 / 100', grade: 'Grade B' },
                    { subj: 'Islamic Studies', cls: 'Fasalka 4A', marks: '98 / 100', grade: 'Grade A' },
                  ].map((card) => (
                    <div
                      key={card.subj}
                      className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]"
                    >
                      <div className="text-sm font-semibold text-white">{card.subj}</div>
                      <div className="text-xs text-[#64748b] mb-3">{card.cls} · Term 1</div>
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums pt-2 border-t border-white/[0.05]">
                        <span className="text-[#cbd5e1]">Marks: {card.marks}</span>
                        <span className="text-emerald-400 font-semibold">{card.grade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Official Student Report Cards &amp; Transcripts
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      One-click printable PDF report cards with subject breakdown, rank, and principal remarks
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    PDF Engine Ready
                  </span>
                </div>

                <div className="p-5 rounded-xl bg-[#0d111c] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div>
                      <h4 className="text-sm font-bold text-white">Maxamed Cali Jaamac</h4>
                      <span className="text-xs text-[#94a3b8] font-mono">
                        Student ID: STD-2026-041 · Class: Fasalka 4A
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                      Overall Average: 92.6% (Passed)
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] italic">
                    Principal Remarks: &ldquo;Aad iyo Aad u Fiican (Outstanding Performance). Demonstrates exemplary academic consistency across all core subjects.&rdquo;
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'classes' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Classrooms &amp; Academic Subjects
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      Manage grade rooms, head teachers, student capacities, and standardized subject codes
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">Fasalka 4A</h4>
                      <span className="text-xs font-mono text-emerald-400">Room 104</span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mb-2">
                      Class Master: Macallin Maxamed Cusmaan
                    </p>
                    <span className="text-xs font-mono text-[#64748b] tabular-nums">
                      Enrolled: 36 / 40 Students
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">Fasalka 3B</h4>
                      <span className="text-xs font-mono text-emerald-400">Room 102</span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mb-2">
                      Class Master: Macallimad Maryan Jaamac
                    </p>
                    <span className="text-xs font-mono text-[#64748b] tabular-nums">
                      Enrolled: 32 / 35 Students
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Institutional Settings &amp; Data Governance
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      Configure school identity, billing currency, pass thresholds, and one-click JSON database backup
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-[#94a3b8] block mb-1">Institution Name</span>
                    <span className="font-bold text-white">Al-Nuur Academy</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-[#94a3b8] block mb-1">Primary Billing Currency</span>
                    <span className="font-mono font-bold text-white">USD ($)</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <span className="text-[#94a3b8] block mb-1">Minimum Pass Threshold</span>
                    <span className="font-mono font-bold text-emerald-400 tabular-nums">
                      60% Minimum
                    </span>
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
