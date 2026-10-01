import React, { useState } from 'react';
import {
  ArrowRight,
  Users,
  Calendar,
  DollarSign,
  Award,
  Bell,
  Search,
  CheckCircle2,
  BookOpen,
  FileText,
  LayoutDashboard,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface HeroProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
  onViewDemo?: () => void;
}

export default function Hero({ onNavigate, isAuthenticated, onViewDemo }: HeroProps) {
  const [previewPane, setPreviewPane] = useState<'overview' | 'attendance' | 'finance'>('overview');

  const handleViewDemo = () => {
    if (onViewDemo) {
      onViewDemo();
    } else {
      document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden landing-grid-bg"
    >
      {/* Subtle architectural background glow */}
      <div
        aria-hidden="true"
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[780px] h-[380px] bg-gradient-to-b from-[#4f46e5]/18 via-[#6366f1]/8 to-transparent blur-[130px] rounded-full pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Copy Block */}
        <div className="max-w-4xl mx-auto text-center">
          {/* Small unboxed eyebrow */}
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#94a3b8] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#6366f1]" aria-hidden="true" />
            <span>Modern School Management Platform</span>
            <span aria-hidden="true" className="text-white/25">·</span>
            <span className="text-[#cbd5e1]">Academic &amp; Financial Workspace</span>
          </div>

          {/* Main Headline */}
          <h1 className="landing-display text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold tracking-tight text-white leading-[1.06] text-balance mb-6">
            Manage your entire school operation in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#c7d2fe] to-[#818cf8]">
              one unified platform.
            </span>
          </h1>

          {/* Supporting paragraph */}
          <p className="text-base sm:text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto leading-relaxed mb-9 font-normal">
            Dugsi Pro brings student registries, twice-daily attendance, exam grading, tuition billing, and staff operations into one cohesive institutional workspace.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6">
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'signup')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors duration-150 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
            >
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
            </button>

            <button
              type="button"
              onClick={handleViewDemo}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/[0.12] hover:border-white/[0.24] bg-[#0d111c] hover:bg-[#131929] text-[#f8fafc] font-semibold text-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>View Demo</span>
            </button>
          </div>

          {/* Tertiary trust metadata (clean unboxed text with separators) */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#64748b] mb-14">
            <span>No complicated setup</span>
            <span aria-hidden="true">·</span>
            <span>Built for modern schools</span>
            <span aria-hidden="true">·</span>
            <span>Multi-tenant School ID data isolation</span>
          </div>
        </div>

        {/* Layered Product Preview Workspace */}
        <div className="relative max-w-6xl mx-auto">
          <div className="rounded-2xl border border-white/[0.09] bg-[#0a0d16] shadow-[0_24px_80px_-16px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Application Top Bar Chrome */}
            <div className="px-4 sm:px-6 py-3 bg-[#070a11] border-b border-white/[0.07] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                </div>
                <span className="ml-2 text-xs font-mono text-[#94a3b8] truncate">
                  DUGSI PRO · Al-Nuur Academy Workspace
                </span>
              </div>

              {/* Interactive View Switcher inside Hero Mockup */}
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-[#0d111c] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setPreviewPane('overview')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    previewPane === 'overview'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Executive Overview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPane('attendance')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    previewPane === 'attendance'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Live Roll Call
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPane('finance')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    previewPane === 'finance'
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Tuition &amp; Finance
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[#64748b]">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search students, invoices...</span>
                  <span className="font-mono text-[10px] text-[#94a3b8] ml-2">⌘K</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="hidden sm:inline">Term 1 Active</span>
                </div>
              </div>
            </div>

            {/* Dashboard Shell Layout: Sidebar + Main Operational Canvas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 bg-[#090c14]">
              {/* Left Navigation Sidebar */}
              <div className="hidden lg:flex lg:col-span-3 xl:col-span-2 border-r border-white/[0.06] bg-[#070a11] p-4 flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] font-medium text-[#64748b] px-2.5 mb-2">
                      Core Workspace
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setPreviewPane('overview')}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          previewPane === 'overview'
                            ? 'bg-[#4f46e5]/15 text-white'
                            : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.03]'
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[#818cf8]" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPane('overview')}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Users className="w-3.5 h-3.5 text-[#94a3b8]" />
                          <span>Students</span>
                        </span>
                        <span className="font-mono text-[11px] text-[#64748b] tabular-nums">428</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPane('attendance')}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          previewPane === 'attendance'
                            ? 'bg-[#4f46e5]/15 text-white'
                            : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-400" />
                          <span>Attendance</span>
                        </span>
                        <span className="font-mono text-[11px] text-emerald-400 tabular-nums">94.8%</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPane('finance')}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          previewPane === 'finance'
                            ? 'bg-[#4f46e5]/15 text-white'
                            : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Finance</span>
                        </span>
                      </button>
                      <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#94a3b8]">
                        <BookOpen className="w-3.5 h-3.5 text-[#94a3b8]" />
                        <span>Academics &amp; Exams</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#94a3b8]">
                        <FileText className="w-3.5 h-3.5 text-[#94a3b8]" />
                        <span>Official Reports</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] px-2">
                  <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Tenant Isolated</span>
                  </div>
                </div>
              </div>

              {/* Main Operational Workspace Content */}
              <div className="lg:col-span-9 xl:col-span-10 p-5 sm:p-7 space-y-6">
                {/* Top KPI Stat Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <div className="text-xs text-[#94a3b8] mb-1.5">Enrolled Students</div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-bold text-white font-mono tabular-nums">
                        428
                      </span>
                      <span className="text-xs text-emerald-400 font-medium tabular-nums">
                        +14 this term
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748b] mt-1">
                      12 active classrooms
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <div className="text-xs text-[#94a3b8] mb-1.5">Daily Attendance</div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-bold text-white font-mono tabular-nums">
                        94.8%
                      </span>
                      <span className="text-xs text-sky-400 font-medium">
                        2 sessions logged
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748b] mt-1">
                      406 of 428 present today
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <div className="text-xs text-[#94a3b8] mb-1.5">Tuition Collected</div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-bold text-white font-mono tabular-nums">
                        $18,450
                      </span>
                      <span className="text-xs text-emerald-400 font-medium tabular-nums">
                        88.4% paid
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748b] mt-1">
                      March billing cycle
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d111c] border border-white/[0.06]">
                    <div className="text-xs text-[#94a3b8] mb-1.5">Term 1 Mean Score</div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-bold text-white font-mono tabular-nums">
                        86.2%
                      </span>
                      <span className="text-xs text-[#a5b4fc] font-medium tabular-nums">
                        91% pass rate
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748b] mt-1">
                      Across 9 core subjects
                    </div>
                  </div>
                </div>

                {/* Dynamic Workspace Body Based on Selected Preview Pane */}
                {previewPane === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left 7 Cols: Monthly Tuition & Attendance Analytics Chart */}
                    <div className="lg:col-span-7 p-5 rounded-xl bg-[#0d111c] border border-white/[0.06] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.06]">
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              Institutional Revenue &amp; Attendance Trend
                            </h3>
                            <p className="text-xs text-[#64748b] mt-0.5">
                              Verified monthly fee collections and classroom attendance rates
                            </p>
                          </div>
                          <div className="text-xs text-[#94a3b8] font-mono tabular-nums">
                            Q1 · 2026
                          </div>
                        </div>

                        {/* Clean Visual Bar Chart */}
                        <div className="grid grid-cols-6 gap-3 items-end h-36 pt-4 px-2">
                          {[
                            { month: 'Oct', rev: '78%', att: '92%', amount: '$16.2k' },
                            { month: 'Nov', rev: '82%', att: '94%', amount: '$17.1k' },
                            { month: 'Dec', rev: '85%', att: '93%', amount: '$17.8k' },
                            { month: 'Jan', rev: '89%', att: '95%', amount: '$18.1k' },
                            { month: 'Feb', rev: '92%', att: '96%', amount: '$18.9k' },
                            { month: 'Mar', rev: '88%', att: '95%', amount: '$18.4k' },
                          ].map((bar) => (
                            <div key={bar.month} className="flex flex-col items-center gap-2 h-full justify-end">
                              <span className="text-[10px] font-mono text-[#94a3b8] tabular-nums">
                                {bar.amount}
                              </span>
                              <div className="w-full max-w-[36px] bg-white/[0.04] rounded-t-md h-24 flex items-end overflow-hidden">
                                <div
                                  className="w-full bg-gradient-to-t from-[#4f46e5] to-[#818cf8] rounded-t-md transition-all duration-300"
                                  style={{ height: bar.rev }}
                                />
                              </div>
                              <span className="text-[11px] text-[#64748b] font-medium">
                                {bar.month}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-[#94a3b8]">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs bg-[#6366f1]" />
                            <span>Tuition Collected</span>
                          </span>
                          <span className="text-[#64748b]">·</span>
                          <span>Morning Roll Call: 93.4%</span>
                          <span className="text-[#64748b]">·</span>
                          <span>Afternoon Roll Call: 95.1%</span>
                        </div>
                        <span className="font-mono text-[11px] text-emerald-400">
                          Ledger Reconciled
                        </span>
                      </div>
                    </div>

                    {/* Right 5 Cols: Recent Activity & Notifications */}
                    <div className="lg:col-span-5 p-5 rounded-xl bg-[#0d111c] border border-white/[0.06] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.06]">
                          <h3 className="text-sm font-semibold text-white">
                            Recent Activity &amp; Alerts
                          </h3>
                          <span className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                            <Bell className="w-3.5 h-3.5 text-[#818cf8]" />
                            <span>Live Feed</span>
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                Morning Roll Call Completed · Fasalka 4A
                              </div>
                              <div className="text-[11px] text-[#94a3b8] mt-0.5">
                                35 Present · 1 Excused · Logged by Macallin Maxamed
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-[#64748b] shrink-0 tabular-nums">
                              08:15
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                Tuition Receipt #INV-2026-841 Issued
                              </div>
                              <div className="text-[11px] text-[#94a3b8] mt-0.5">
                                Caasho Axmed Nuur · $50.00 Paid in Full
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-emerald-400 shrink-0 tabular-nums">
                              +$50.00
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                Term 1 Mathematics Marks Published
                              </div>
                              <div className="text-[11px] text-[#94a3b8] mt-0.5">
                                Fasalka 3B · Class Average: 88.4% (Grade B+)
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-[#a5b4fc] shrink-0">
                              Graded
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#64748b]">
                        <span>All modules synchronized in real time</span>
                        <span className="font-mono text-[#94a3b8]">Academic Year 2025/2026</span>
                      </div>
                    </div>
                  </div>
                )}

                {previewPane === 'attendance' && (
                  <div className="p-5 rounded-xl bg-[#0d111c] border border-white/[0.06] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Daily Classroom Roll Call · Fasalka 4A
                        </h3>
                        <p className="text-xs text-[#94a3b8]">
                          Morning Session (Before Break) · 36 Enrolled Students
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#94a3b8] font-mono tabular-nums">
                        <span className="text-emerald-400">34 Present</span>
                        <span>·</span>
                        <span className="text-amber-400">1 Late</span>
                        <span>·</span>
                        <span className="text-rose-400">1 Absent</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {[
                        { name: 'Maxamed Cali Jaamac', id: 'STD-041', status: 'Present', color: 'text-emerald-400' },
                        { name: 'Caasho Axmed Nuur', id: 'STD-042', status: 'Present', color: 'text-emerald-400' },
                        { name: 'Cabdiraxmaan Xasan Faarax', id: 'STD-043', status: 'Late · 08:12', color: 'text-amber-400' },
                        { name: 'Fadumo Cusmaan Geedi', id: 'STD-044', status: 'Present', color: 'text-emerald-400' },
                        { name: 'Yuusuf Ibraahim Warsame', id: 'STD-045', status: 'Present', color: 'text-emerald-400' },
                        { name: 'Khadra Cabdullaahi Mire', id: 'STD-046', status: 'Absent', color: 'text-rose-400' },
                      ].map((row) => (
                        <div
                          key={row.id}
                          className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-white">{row.name}</div>
                            <div className="text-[11px] font-mono text-[#64748b]">{row.id}</div>
                          </div>
                          <span className={`font-mono font-semibold ${row.color}`}>
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewPane === 'finance' && (
                  <div className="p-5 rounded-xl bg-[#0d111c] border border-white/[0.06] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Student Tuition Ledger &amp; Audit Trail
                        </h3>
                        <p className="text-xs text-[#94a3b8]">
                          Real-time fee collection tracking with automated balance calculation
                        </p>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 tabular-nums">
                        Collected: $18,450 / $20,860
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {[
                        { student: 'Maxamed Cali Jaamac', invoice: 'INV-2026-101', billed: '$50.00', paid: '$50.00', state: 'Paid in Full', stateColor: 'text-emerald-400' },
                        { student: 'Caasho Axmed Nuur', invoice: 'INV-2026-102', billed: '$50.00', paid: '$50.00', state: 'Paid in Full', stateColor: 'text-emerald-400' },
                        { student: 'Cabdiraxmaan Xasan', invoice: 'INV-2026-103', billed: '$50.00', paid: '$25.00', state: 'Balance $25.00', stateColor: 'text-amber-400' },
                      ].map((inv) => (
                        <div
                          key={inv.invoice}
                          className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-[#64748b]">{inv.invoice}</span>
                            <span className={`font-semibold ${inv.stateColor}`}>{inv.state}</span>
                          </div>
                          <div className="font-semibold text-white">{inv.student}</div>
                          <div className="flex items-center justify-between text-[11px] text-[#94a3b8] font-mono tabular-nums pt-1 border-t border-white/[0.05]">
                            <span>Billed: {inv.billed}</span>
                            <span>Paid: {inv.paid}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
