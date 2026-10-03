import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Download,
  Save,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Users
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolClass } from '../../types';
import { PageContainer, PageHeader, FilterBar, Section } from '../../components/layout/PageLayout';
import { Button, StatCard, StatusBadge, EmptyState } from '../../components/ui/primitives';

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface AttendanceModuleProps {
  students: Student[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  attendanceDate: string;
  onChangeDate: (date: string) => void;
  attendanceSession: 'before_break' | 'after_break';
  onChangeSession: (session: 'before_break' | 'after_break') => void;
  selectedClass: string;
  onChangeClass: (cls: string) => void;
  subTab: 'sheet' | 'history';
  onChangeSubTab: (tab: 'sheet' | 'history') => void;
  historyStudentId: string;
  onChangeHistoryStudentId: (id: string) => void;
  onAttendanceChange: (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Excused') => void;
  onMarkAllAttendance: (status: 'Present' | 'Absent' | 'Late' | 'Excused') => void;
  onSaveSheet: () => Promise<void>;
  onExportPDF: () => void;
  submitting: boolean;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  students,
  classes,
  attendance,
  attendanceDate,
  onChangeDate,
  attendanceSession,
  onChangeSession,
  selectedClass,
  onChangeClass,
  subTab,
  onChangeSubTab,
  historyStudentId,
  onChangeHistoryStudentId,
  onAttendanceChange,
  onMarkAllAttendance,
  onSaveSheet,
  onExportPDF,
  submitting
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const activeStudents = useMemo(
    () => students.filter((s) => s.status === 'active'),
    [students]
  );

  const filteredSheetStudents = useMemo(() => {
    return activeStudents.filter((s) => {
      if (selectedClass !== 'All' && s.class !== selectedClass) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.class.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeStudents, selectedClass, searchQuery]);

  const currentSessionAttendance = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach((record) => {
      if (
        record.date === attendanceDate &&
        (record.sessionType || 'before_break') === attendanceSession
      ) {
        map.set(record.studentId, record);
      }
    });
    return map;
  }, [attendance, attendanceDate, attendanceSession]);

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    attendance.forEach((record) => {
      const list = map.get(record.studentId);
      if (list) list.push(record);
      else map.set(record.studentId, [record]);
    });
    return map;
  }, [attendance]);

  const sheetSummary = useMemo(() => {
    const target =
      selectedClass === 'All'
        ? activeStudents
        : activeStudents.filter((s) => s.class === selectedClass);

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    target.forEach((s) => {
      const r = currentSessionAttendance.get(s.id);
      const st = r ? r.status : 'Present';
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
      else if (st === 'Excused') excused++;
    });

    const rate = target.length > 0 ? Math.round((present / target.length) * 100) : 100;
    return {
      total: target.length,
      present,
      absent,
      late,
      excused,
      rate
    };
  }, [activeStudents, selectedClass, currentSessionAttendance]);

  const statusOptions: Array<{
    val: 'Present' | 'Absent' | 'Late' | 'Excused';
    label: string;
    shortLabel: string;
    activeClass: string;
  }> = [
    {
      val: 'Present',
      label: 'Present (Jooga)',
      shortLabel: 'Present',
      activeClass: 'bg-emerald-600 text-white border-emerald-600'
    },
    {
      val: 'Absent',
      label: 'Absent (Ma Joogo)',
      shortLabel: 'Absent',
      activeClass: 'bg-rose-600 text-white border-rose-600'
    },
    {
      val: 'Late',
      label: 'Late (Daahay)',
      shortLabel: 'Late',
      activeClass: 'bg-amber-500 text-white border-amber-500'
    },
    {
      val: 'Excused',
      label: 'Excused (Idan)',
      shortLabel: 'Excused',
      activeClass: 'bg-blue-600 text-white border-blue-600'
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Attendance Management"
        subtitle="High-speed daily class roll call, session tracking, and historical student attendance analytics"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={onExportPDF}
            >
              Export PDF
            </Button>
            {subTab === 'sheet' && (
              <Button
                variant="primary"
                size="sm"
                loading={submitting}
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={onSaveSheet}
              >
                Save Attendance Sheet
              </Button>
            )}
          </>
        }
      />

      {/* Mode Switch Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => onChangeSubTab('sheet')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            subTab === 'sheet'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Daily Roll Call (Mark Attendance)
        </button>
        <button
          type="button"
          onClick={() => onChangeSubTab('history')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            subTab === 'history'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Attendance History & Analytics
        </button>
      </div>

      {subTab === 'sheet' ? (
        <>
          {/* Summary KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <StatCard
              label="Active Roster"
              value={sheetSummary.total}
              subtitle={selectedClass === 'All' ? 'All Classes' : `Class ${selectedClass}`}
              icon={<Users className="w-4 h-4" />}
              tone="brand"
            />
            <StatCard
              label="Present"
              value={sheetSummary.present}
              subtitle="Marked present"
              icon={<CheckCircle2 className="w-4 h-4" />}
              tone="success"
            />
            <StatCard
              label="Absent"
              value={sheetSummary.absent}
              subtitle="Unexcused absence"
              icon={<XCircle className="w-4 h-4" />}
              tone="danger"
            />
            <StatCard
              label="Late / Excused"
              value={sheetSummary.late + sheetSummary.excused}
              subtitle={`${sheetSummary.late} late · ${sheetSummary.excused} excused`}
              icon={<Clock className="w-4 h-4" />}
              tone="warning"
            />
            <StatCard
              label="Session Rate"
              value={`${sheetSummary.rate}%`}
              subtitle={attendanceDate}
              icon={<UserCheck className="w-4 h-4" />}
              tone={sheetSummary.rate >= 85 ? 'success' : 'warning'}
            />
          </div>

          {/* Fast Filter & Session Control Bar */}
          <FilterBar className="flex-col xl:flex-row">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 w-full">
              {/* Date Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                <input
                  type="date"
                  value={attendanceDate}
                  max={getLocalDateString()}
                  onChange={(e) => onChangeDate(e.target.value)}
                  aria-label="Attendance Date"
                  className="ds-input w-full font-mono"
                />
              </div>

              {/* Class Selector */}
              <select
                value={selectedClass}
                onChange={(e) => onChangeClass(e.target.value)}
                aria-label="Filter by Class"
                className="ds-input w-full"
              >
                <option value="All">All Classes ({activeStudents.length})</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>

              {/* Session Switcher */}
              <div className="flex items-center p-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => onChangeSession('before_break')}
                  className={`flex-1 py-1.5 px-2.5 rounded-[var(--radius-xs)] text-xs font-semibold transition-colors cursor-pointer ${
                    attendanceSession === 'before_break'
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Before Break
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSession('after_break')}
                  className={`flex-1 py-1.5 px-2.5 rounded-[var(--radius-xs)] text-xs font-semibold transition-colors cursor-pointer ${
                    attendanceSession === 'after_break'
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  After Break
                </button>
              </div>

              {/* Student Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter student name or ID..."
                  className="ds-input w-full pl-8"
                />
              </div>
            </div>

            {/* Quick Bulk Mark Actions */}
            <div className="flex items-center gap-2 flex-wrap shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-[var(--color-border)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Mark All:
              </span>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => onMarkAllAttendance('Present')}
              >
                All Present
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => onMarkAllAttendance('Absent')}
              >
                All Absent
              </Button>
            </div>
          </FilterBar>

          {/* Responsive Roster Table (Desktop) + Cards (Mobile) */}
          {filteredSheetStudents.length === 0 ? (
            <EmptyState
              title="No active students found"
              description="Adjust your class or search filter, or register active students to take attendance."
            />
          ) : (
            <>
              {/* Desktop Dense Table */}
              <div className="hidden md:block ds-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Student ID</th>
                        <th>Class</th>
                        <th>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSheetStudents.map((student) => {
                        const record = currentSessionAttendance.get(student.id);
                        const currentStatus = record ? record.status : 'Present';

                        return (
                          <tr key={student.id}>
                            <td className="font-semibold text-[var(--color-text-primary)]">
                              {student.fullName}
                            </td>
                            <td className="font-mono text-xs text-[var(--color-text-secondary)]">
                              {student.id}
                            </td>
                            <td>
                              <StatusBadge tone="neutral" dot={false}>
                                {student.class}
                              </StatusBadge>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {statusOptions.map((opt) => {
                                  const isSelected = currentStatus === opt.val;
                                  return (
                                    <button
                                      key={opt.val}
                                      type="button"
                                      onClick={() => onAttendanceChange(student.id, opt.val)}
                                      aria-pressed={isSelected}
                                      className={`px-3 py-1.5 rounded-[var(--radius-xs)] border text-xs font-semibold transition-all cursor-pointer ${
                                        isSelected
                                          ? opt.activeClass
                                          : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Stacked Attendance Cards */}
              <div className="md:hidden space-y-2.5">
                {filteredSheetStudents.map((student) => {
                  const record = currentSessionAttendance.get(student.id);
                  const currentStatus = record ? record.status : 'Present';

                  return (
                    <div key={student.id} className="ds-surface p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">
                            {student.fullName}
                          </p>
                          <p className="text-[11px] font-mono text-[var(--color-text-muted)]">
                            {student.id} · Class {student.class}
                          </p>
                        </div>
                        <StatusBadge
                          tone={
                            currentStatus === 'Present'
                              ? 'success'
                              : currentStatus === 'Absent'
                              ? 'danger'
                              : currentStatus === 'Late'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {currentStatus}
                        </StatusBadge>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {statusOptions.map((opt) => {
                          const isSelected = currentStatus === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => onAttendanceChange(student.id, opt.val)}
                              className={`py-2 px-2 rounded-[var(--radius-xs)] border text-[11px] font-semibold text-center transition-colors cursor-pointer ${
                                isSelected
                                  ? opt.activeClass
                                  : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
                              }`}
                            >
                              {opt.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        /* Attendance History & Student Analytics */
        <div className="space-y-6">
          <FilterBar>
            <div className="flex items-center gap-3 w-full">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] shrink-0">
                Select Student:
              </span>
              <select
                value={historyStudentId}
                onChange={(e) => onChangeHistoryStudentId(e.target.value)}
                className="ds-input flex-1"
              >
                <option value="All">All Students Summary Overview</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.class})
                  </option>
                ))}
              </select>
            </div>
          </FilterBar>

          {historyStudentId === 'All' ? (
            <Section
              title="Cumulative Attendance Rate by Student"
              subtitle="Historical attendance performance across all recorded sessions"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late / Excused</th>
                      <th>Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const sRecords = attendanceByStudent.get(s.id) || [];
                      const total = sRecords.length;
                      const present = sRecords.filter((a) => a.status === 'Present').length;
                      const absent = sRecords.filter((a) => a.status === 'Absent').length;
                      const other = total - present - absent;
                      const rate = total > 0 ? Math.round((present / total) * 100) : 100;

                      return (
                        <tr
                          key={s.id}
                          onClick={() => onChangeHistoryStudentId(s.id)}
                          className="cursor-pointer"
                        >
                          <td className="font-mono text-xs text-[var(--color-text-secondary)]">
                            {s.id}
                          </td>
                          <td className="font-semibold text-[var(--color-text-primary)]">
                            {s.fullName}
                          </td>
                          <td>{s.class}</td>
                          <td className="font-mono tabular-nums text-[var(--color-success)]">
                            {present}
                          </td>
                          <td className="font-mono tabular-nums text-[var(--color-danger)]">
                            {absent}
                          </td>
                          <td className="font-mono tabular-nums text-[var(--color-text-secondary)]">
                            {other}
                          </td>
                          <td>
                            <StatusBadge
                              tone={rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger'}
                            >
                              {rate}%
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : (
            (() => {
              const s = students.find((x) => x.id === historyStudentId);
              if (!s) return null;
              const sRecords = attendanceByStudent.get(s.id) || [];
              const total = sRecords.length;
              const present = sRecords.filter((a) => a.status === 'Present').length;
              const absent = sRecords.filter((a) => a.status === 'Absent').length;
              const late = sRecords.filter((a) => a.status === 'Late').length;
              const excused = sRecords.filter((a) => a.status === 'Excused').length;
              const rate = total > 0 ? Math.round((present / total) * 100) : 100;

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Attendance Rate" value={`${rate}%`} tone="brand" />
                    <StatCard label="Present Sessions" value={`${present} / ${total}`} tone="success" />
                    <StatCard label="Absences" value={absent} tone="danger" />
                    <StatCard label="Late & Excused" value={late + excused} tone="warning" />
                  </div>

                  <Section title={`Attendance Log — ${s.fullName} (${s.class})`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Session</th>
                            <th>Status</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sRecords.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                                No attendance logs recorded for this student yet.
                              </td>
                            </tr>
                          ) : (
                            sRecords.map((r, idx) => (
                              <tr key={idx}>
                                <td className="font-mono font-semibold">{r.date}</td>
                                <td>
                                  {r.sessionType === 'after_break' ? 'After Break' : 'Before Break'}
                                </td>
                                <td>
                                  <StatusBadge
                                    tone={
                                      r.status === 'Present'
                                        ? 'success'
                                        : r.status === 'Absent'
                                        ? 'danger'
                                        : r.status === 'Late'
                                        ? 'warning'
                                        : 'info'
                                    }
                                  >
                                    {r.status}
                                  </StatusBadge>
                                </td>
                                <td className="font-mono text-xs text-[var(--color-text-muted)]">
                                  {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                </div>
              );
            })()
          )}
        </div>
      )}
    </PageContainer>
  );
};
