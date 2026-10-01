import React, { useMemo } from 'react';
import {
  Users,
  UserCheck,
  DollarSign,
  AlertCircle,
  UserPlus,
  FileText,
  Calendar,
  Award,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  ClipboardList
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Student,
  AttendanceRecord,
  FeeRecord,
  SchoolClass,
  SchoolSubject,
  ExamScore,
  Teacher,
  Admission,
  SystemSettings
} from '../../types';
import { AppTabId, FinanceSubSection, PeopleSubSection } from '../../app/navigationConfig';
import { StudentSubSection } from '../../components/StudentsView';
import { PageContainer, PageHeader, Section } from '../../components/layout/PageLayout';
import { Button, StatCard, StatusBadge } from '../../components/ui/primitives';

export interface ExecutiveDashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  fees: FeeRecord[];
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  examScores: ExamScore[];
  teachers: Teacher[];
  admissions: Admission[];
  settings: SystemSettings;
  attendanceDate: string;
  attendanceSession: 'before_break' | 'after_break';
  theme: 'light' | 'dark';
  onNavigate: (
    tab: AppTabId,
    options?: {
      studentSubSection?: StudentSubSection;
      peopleSubSection?: PeopleSubSection;
      financeSubSection?: FinanceSubSection;
    }
  ) => void;
  onOpenStudentProfile: (student: Student) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  students,
  attendance,
  fees,
  classes,
  subjects,
  examScores,
  teachers,
  admissions,
  settings,
  attendanceDate,
  attendanceSession,
  theme,
  onNavigate,
  onOpenStudentProfile
}) => {
  const metrics = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === 'active');
    const inactiveStudents = students.filter((s) => s.status === 'inactive');
    const archivedStudents = students.filter((s) => s.status === 'archived');

    // Today's attendance metrics
    const todayRecords = attendance.filter(
      (a) =>
        a.date === attendanceDate &&
        (a.sessionType || 'before_break') === attendanceSession
    );
    const presentToday = activeStudents.filter((s) => {
      const rec = todayRecords.find((r) => r.studentId === s.id);
      return !rec || rec.status === 'Present';
    }).length;
    const absentToday = todayRecords.filter((r) => r.status === 'Absent').length;
    const lateToday = todayRecords.filter((r) => r.status === 'Late').length;
    const excusedToday = todayRecords.filter((r) => r.status === 'Excused').length;

    const attendanceRate =
      activeStudents.length > 0
        ? Math.round((presentToday / activeStudents.length) * 100)
        : 100;

    // Financial metrics
    const totalInvoiced = fees.reduce((acc, f) => acc + Number(f.amount || 0), 0);
    const totalCollected = fees.reduce((acc, f) => acc + Number(f.paidAmount || 0), 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);
    const collectionRate =
      totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    const unpaidInvoicesCount = fees.filter(
      (f) => f.status === 'unpaid' || f.status === 'partial' || f.amount > f.paidAmount
    ).length;

    const studentsMissingGuardianPhone = activeStudents.filter(
      (s) => !s.guardianPhone || s.guardianPhone.trim().length < 6
    ).length;

    const pendingAdmissionsCount = admissions.filter(
      (a) => a.status === 'Pending' || a.status === 'Approved'
    ).length;

    // Class distribution for bar chart
    const classMap: Record<string, { name: string; active: number; total: number }> = {};
    classes.forEach((c) => {
      classMap[c.className] = { name: c.className, active: 0, total: 0 };
    });
    students.forEach((s) => {
      if (s.status === 'archived') return;
      const cls = s.class || 'Unassigned';
      if (!classMap[cls]) classMap[cls] = { name: cls, active: 0, total: 0 };
      classMap[cls].total += 1;
      if (s.status === 'active') classMap[cls].active += 1;
    });
    const classChartData = Object.values(classMap).sort((a, b) => b.total - a.total).slice(0, 8);

    // Recent students
    const recentStudents = [...students]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 6);

    return {
      totalStudents: students.length,
      activeStudentsCount: activeStudents.length,
      inactiveStudentsCount: inactiveStudents.length,
      archivedStudentsCount: archivedStudents.length,
      presentToday,
      absentToday,
      lateToday,
      excusedToday,
      attendanceRate,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      collectionRate,
      unpaidInvoicesCount,
      studentsMissingGuardianPhone,
      pendingAdmissionsCount,
      classChartData,
      recentStudents
    };
  }, [students, attendance, fees, classes, admissions, attendanceDate, attendanceSession]);

  const financePieData = [
    { name: 'Collected', value: metrics.totalCollected || 0, color: '#10b981' },
    { name: 'Outstanding', value: metrics.totalOutstanding || 0, color: '#f59e0b' }
  ];

  const isDark = theme === 'dark';

  return (
    <PageContainer>
      {/* 1. WELCOME & SCHOOL CONTEXT HEADER */}
      <PageHeader
        title="Executive Overview"
        subtitle={`${settings.schoolName || 'Dugsi Pro'} · Academic Year ${
          settings.academicYear || '2025/2026'
        } · Real-time institutional operations & financial telemetry`}
        badge={
          <StatusBadge tone="success">
            Live Operations
          </StatusBadge>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<UserCheck className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('attendance')}
            >
              Take Attendance
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<DollarSign className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('fees', { financeSubSection: 'invoices' })}
            >
              Manage Billing
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('students', { studentSubSection: 'add' })}
            >
              Register Student
            </Button>
          </>
        }
      />

      {/* 2. CORE EXECUTIVE KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Enrollment"
          value={metrics.totalStudents.toLocaleString()}
          subtitle={`${metrics.activeStudentsCount} active · ${metrics.inactiveStudentsCount} inactive`}
          trend={{
            label: `${classes.length} Classes`,
            tone: 'brand'
          }}
          icon={<Users className="w-4 h-4" />}
          tone="brand"
          onClick={() => onNavigate('students', { studentSubSection: 'all' })}
        />

        <StatCard
          label="Today's Attendance"
          value={`${metrics.attendanceRate}%`}
          subtitle={`${metrics.presentToday} present · ${metrics.absentToday} absent today`}
          trend={{
            label: attendanceSession === 'before_break' ? 'Session 1' : 'Session 2',
            tone: metrics.attendanceRate >= 85 ? 'success' : 'warning'
          }}
          icon={<UserCheck className="w-4 h-4" />}
          tone="success"
          onClick={() => onNavigate('attendance')}
        />

        <StatCard
          label="Fee Collection"
          value={`${settings.currency} ${metrics.totalCollected.toLocaleString()}`}
          subtitle={`of ${settings.currency} ${metrics.totalInvoiced.toLocaleString()} invoiced`}
          trend={{
            label: `${metrics.collectionRate}% Collected`,
            tone: metrics.collectionRate >= 75 ? 'success' : 'info'
          }}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="info"
          onClick={() => onNavigate('fees', { financeSubSection: 'overview' })}
        />

        <StatCard
          label="Outstanding Balance"
          value={`${settings.currency} ${metrics.totalOutstanding.toLocaleString()}`}
          subtitle={`${metrics.unpaidInvoicesCount} open / partial invoices`}
          trend={{
            label: metrics.totalOutstanding > 0 ? 'Action Required' : 'Cleared',
            tone: metrics.totalOutstanding > 0 ? 'warning' : 'success'
          }}
          icon={<AlertCircle className="w-4 h-4" />}
          tone={metrics.totalOutstanding > 0 ? 'warning' : 'success'}
          onClick={() => onNavigate('fees', { financeSubSection: 'invoices' })}
        />
      </div>

      {/* 3. OPERATIONAL ALERTS & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational Alerts Requiring Attention */}
        <Section
          title="Operational Attention & Exceptions"
          subtitle="Items across student records, attendance, and billing requiring review"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('fees', { financeSubSection: 'invoices' })}
              className="ds-surface-muted p-3.5 text-left flex items-start justify-between gap-3 hover:border-[var(--color-brand-border)] transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={metrics.unpaidInvoicesCount > 0 ? 'warning' : 'success'}>
                    {metrics.unpaidInvoicesCount} Unpaid Invoices
                  </StatusBadge>
                </div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)] pt-1">
                  Outstanding Fee Balances
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {settings.currency} {metrics.totalOutstanding.toLocaleString()} pending collection
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="ds-surface-muted p-3.5 text-left flex items-start justify-between gap-3 hover:border-[var(--color-brand-border)] transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={metrics.absentToday > 0 ? 'danger' : 'success'}>
                    {metrics.absentToday} Absent Today
                  </StatusBadge>
                </div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)] pt-1">
                  Daily Attendance Follow-up
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {metrics.lateToday} late · {metrics.excusedToday} excused on {attendanceDate}
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('students', { studentSubSection: 'all' })}
              className="ds-surface-muted p-3.5 text-left flex items-start justify-between gap-3 hover:border-[var(--color-brand-border)] transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={metrics.studentsMissingGuardianPhone > 0 ? 'info' : 'success'}>
                    {metrics.studentsMissingGuardianPhone} Incomplete Contacts
                  </StatusBadge>
                </div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)] pt-1">
                  Guardian Emergency Contacts
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Active students missing verified guardian phone number
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('admissions')}
              className="ds-surface-muted p-3.5 text-left flex items-start justify-between gap-3 hover:border-[var(--color-brand-border)] transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge tone="brand">
                    {metrics.pendingAdmissionsCount} Applications
                  </StatusBadge>
                </div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)] pt-1">
                  Admissions Pipeline
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Review new applicants & enroll into classes
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>
          </div>
        </Section>

        {/* Institutional Snapshot & Quick Workflows */}
        <Section
          title="Institutional Capacity"
          subtitle="Academic & HR summary across departments"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="ds-surface-muted p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Teachers
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-text-primary)] mt-0.5">
                  {teachers.length}
                </p>
              </div>
              <div className="ds-surface-muted p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Classes
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-text-primary)] mt-0.5">
                  {classes.length}
                </p>
              </div>
              <div className="ds-surface-muted p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Subjects
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-text-primary)] mt-0.5">
                  {subjects.length}
                </p>
              </div>
              <div className="ds-surface-muted p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Exam Records
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-text-primary)] mt-0.5">
                  {examScores.length}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Award className="w-3.5 h-3.5" />}
                onClick={() => onNavigate('exams')}
              >
                Enter Grades
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => onNavigate('reports')}
              >
                Print Reports
              </Button>
            </div>
          </div>
        </Section>
      </div>

      {/* 4. VISUAL ANALYTICS: ENROLLMENT BY CLASS & FINANCIAL COLLECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section
          title="Enrollment Distribution by Class"
          subtitle="Active vs. total registered students per class"
          className="lg:col-span-2"
          actions={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigate('classes')}
            >
              Manage Classes →
            </Button>
          }
        >
          {metrics.classChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
              No classes or student enrollment data available yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.classChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f131d' : '#ffffff',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="active" name="Active Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section
          title="Revenue Collection Ratio"
          subtitle="Collected vs. outstanding tuition fees"
          actions={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigate('fees', { financeSubSection: 'profit_loss' })}
            >
              P&L Statement →
            </Button>
          }
        >
          <div className="h-48 w-full flex items-center justify-center">
            {metrics.totalInvoiced === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] text-center">
                No fee invoices generated yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {financePieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `${settings.currency} ${Number(val).toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)] text-xs">
            <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)]">
              <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Collected</span>
              </div>
              <p className="font-mono font-bold tabular-nums text-[var(--color-text-primary)] mt-1">
                {settings.currency} {metrics.totalCollected.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)]">
              <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Outstanding</span>
              </div>
              <p className="font-mono font-bold tabular-nums text-[var(--color-text-primary)] mt-1">
                {settings.currency} {metrics.totalOutstanding.toLocaleString()}
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* 5. RECENTLY REGISTERED STUDENTS DIRECTORY SNAPSHOT */}
      <Section
        title="Recent Student Registrations"
        subtitle="Click any student record to open their 360° Academic & Financial Profile"
        actions={
          <Button
            variant="secondary"
            size="xs"
            onClick={() => onNavigate('students', { studentSubSection: 'all' })}
          >
            View All Students ({students.length})
          </Button>
        }
      >
        {metrics.recentStudents.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            No students registered yet. Click &ldquo;Register Student&rdquo; to add your first student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Class</th>
                  <th>Guardian Contact</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentStudents.map((st) => (
                  <tr
                    key={st.id}
                    onClick={() => onOpenStudentProfile(st)}
                    className="cursor-pointer"
                  >
                    <td className="font-semibold text-[var(--color-text-primary)]">
                      {st.fullName}
                    </td>
                    <td className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {st.id}
                    </td>
                    <td>{st.class}</td>
                    <td className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {st.guardianPhone || '—'}
                    </td>
                    <td>
                      <StatusBadge
                        tone={
                          st.status === 'active'
                            ? 'success'
                            : st.status === 'archived'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {st.status}
                      </StatusBadge>
                    </td>
                    <td className="font-mono text-xs text-[var(--color-text-muted)]">
                      {st.createdAt || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </PageContainer>
  );
};
