import React, { useMemo, useState, useEffect } from 'react';
import {
  UserCheck,
  Download,
  Save,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  ArrowUpRight,
  ListChecks
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolClass } from '../../types';
import { PageContainer, PageHeader, FilterBar, Section } from '../../components/layout/PageLayout';
import { Button, StatCard, StatusBadge, EmptyState } from '../../components/ui/primitives';
import { AttendanceSubSection } from '../../app/navigationConfig';
import { AttendanceWorkspaceNav } from './components/AttendanceWorkspaceNav';

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStatusTone(status: AttendanceRecord['status']): 'success' | 'danger' | 'warning' | 'info' {
  if (status === 'Present') return 'success';
  if (status === 'Absent') return 'danger';
  if (status === 'Late') return 'warning';
  return 'info';
}

function isFullAttendanceManager(role?: string | null): boolean {
  const raw = String(role || '').toLowerCase().trim();
  return raw === 'admin' || raw === 'school admin' || raw === 'super admin' || raw === 'principal' || raw === 'teacher';
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
  subSection: AttendanceSubSection;
  onNavigateSubSection: (section: AttendanceSubSection) => void;
  historyStudentId: string;
  onChangeHistoryStudentId: (id: string) => void;
  onAttendanceChange: (studentId: string, status: AttendanceRecord['status']) => void;
  onMarkAllAttendance: (status: AttendanceRecord['status']) => void;
  onSaveSheet: () => Promise<void>;
  onExportPDF: () => void;
  submitting: boolean;
  userRole?: string | null;
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
  subSection,
  onNavigateSubSection,
  historyStudentId,
  onChangeHistoryStudentId,
  onAttendanceChange,
  onMarkAllAttendance,
  onSaveSheet,
  onExportPDF,
  submitting,
  userRole
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const canManage = isFullAttendanceManager(userRole);

  useEffect(() => {
    if (subSection === 'take') onChangeSubTab('sheet');
    else if (subTab !== 'history') onChangeSubTab('history');
  }, [subSection]);

  const activeStudents = useMemo(
    () => students.filter((student) => student.status === 'active'),
    [students]
  );

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

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students]
  );

  const filteredSheetStudents = useMemo(
    () =>
      activeStudents.filter((student) => {
        if (selectedClass !== 'All' && student.class !== selectedClass) return false;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
          student.fullName.toLowerCase().includes(query) ||
          student.id.toLowerCase().includes(query) ||
          student.class.toLowerCase().includes(query)
        );
      }),
    [activeStudents, selectedClass, searchQuery]
  );

  const sheetSummary = useMemo(() => {
    const target =
      selectedClass === 'All'
        ? activeStudents
        : activeStudents.filter((student) => student.class === selectedClass);

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    target.forEach((student) => {
      const record = currentSessionAttendance.get(student.id);
      const status = record ? record.status : 'Present';
      if (status === 'Present') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'Late') late++;
      else excused++;
    });

    return {
      total: target.length,
      present,
      absent,
      late,
      excused,
      rate: target.length ? Math.round((present / target.length) * 100) : 100
    };
  }, [activeStudents, selectedClass, currentSessionAttendance]);

  const overviewStats = useMemo(() => {
    const today = getLocalDateString();
    const todayRecords = attendance.filter((record) => record.date === today);
    const uniqueStudents = new Set(todayRecords.map((record) => record.studentId));
    const coveredClasses = new Set(
      todayRecords
        .map((record) => studentById.get(record.studentId)?.class)
        .filter(Boolean)
    );

    const present = todayRecords.filter((record) => record.status === 'Present').length;
    const absent = todayRecords.filter((record) => record.status === 'Absent').length;
    const late = todayRecords.filter((record) => record.status === 'Late').length;
    const excused = todayRecords.filter((record) => record.status === 'Excused').length;
    const total = todayRecords.length;

    return {
      totalRecords: attendance.length,
      todayRecords: total,
      uniqueStudents: uniqueStudents.size,
      coveredClasses: coveredClasses.size,
      present,
      absent,
      late,
      excused,
      rate: total ? Math.round((present / total) * 100) : 100
    };
  }, [attendance, studentById]);

  const classSummaries = useMemo(() => {
    return classes.map((schoolClass) => {
      const roster = activeStudents.filter((student) => student.class === schoolClass.className);
      const records = attendance.filter((record) => roster.some((student) => student.id === record.studentId));
      const present = records.filter((record) => record.status === 'Present').length;
      const absent = records.filter((record) => record.status === 'Absent').length;
      const late = records.filter((record) => record.status === 'Late').length;
      const excused = records.filter((record) => record.status === 'Excused').length;
      const rate = records.length ? Math.round((present / records.length) * 100) : 100;

      const todayRosterRecords = roster
        .map((student) => currentSessionAttendance.get(student.id))
        .filter(Boolean) as AttendanceRecord[];
      const todayPresent = todayRosterRecords.filter((record) => record.status === 'Present').length;

      return {
        className: schoolClass.className,
        room: schoolClass.roomNumber || '—',
        teacher: schoolClass.teacherName || 'Unassigned',
        rosterCount: roster.length,
        records: records.length,
        present,
        absent,
        late,
        excused,
        rate,
        todayRecorded: todayRosterRecords.length,
        todayPresent,
        todayRate: roster.length ? Math.round((todayPresent / roster.length) * 100) : 100
      };
    });
  }, [classes, activeStudents, attendance, currentSessionAttendance]);

  const sortedDates = useMemo(
    () =>
      Array.from(new Set(attendance.map((record) => record.date)))
        .sort((a, b) => b.localeCompare(a)),
    [attendance]
  );

  const recentTrend = useMemo(() => {
    return sortedDates.slice(0, 14).reverse().map((date) => {
      const rows = attendance.filter((record) => record.date === date);
      const present = rows.filter((record) => record.status === 'Present').length;
      const absent = rows.filter((record) => record.status === 'Absent').length;
      const late = rows.filter((record) => record.status === 'Late').length;
      const excused = rows.filter((record) => record.status === 'Excused').length;
      return {
        date,
        total: rows.length,
        present,
        absent,
        late,
        excused,
        rate: rows.length ? Math.round((present / rows.length) * 100) : 0
      };
    });
  }, [attendance, sortedDates]);

  const statusOptions: Array<{
    val: AttendanceRecord['status'];
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

  const selectedStudent = students.find((student) => student.id === historyStudentId);
  const selectedStudentRecords = selectedStudent ? attendanceByStudent.get(selectedStudent.id) || [] : [];
  const selectedStudentPresent = selectedStudentRecords.filter((record) => record.status === 'Present').length;
  const selectedStudentAbsent = selectedStudentRecords.filter((record) => record.status === 'Absent').length;
  const selectedStudentLate = selectedStudentRecords.filter((record) => record.status === 'Late').length;
  const selectedStudentExcused = selectedStudentRecords.filter((record) => record.status === 'Excused').length;
  const selectedStudentRate = selectedStudentRecords.length
    ? Math.round((selectedStudentPresent / selectedStudentRecords.length) * 100)
    : 100;

  const selectedClassSummary = classSummaries.find((item) => item.className === selectedClass);
  const selectedClassRoster = useMemo(
    () =>
      selectedClass === 'All'
        ? activeStudents
        : activeStudents.filter((student) => student.class === selectedClass),
    [activeStudents, selectedClass]
  );

  const titleBySection: Record<AttendanceSubSection, { title: string; subtitle: string }> = {
    overview: {
      title: 'Attendance Command Center',
      subtitle: 'Monitor today’s attendance, coverage, and attendance health from one workspace.'
    },
    take: {
      title: 'Take Attendance',
      subtitle: 'Fast, class-aware roll call with session control and protected save workflow.'
    },
    daily: {
      title: 'Daily Register',
      subtitle: 'See attendance coverage class-by-class for the selected date and session.'
    },
    history: {
      title: 'Attendance History',
      subtitle: 'Search and review historical attendance records across the institution.'
    },
    students: {
      title: 'Student Attendance',
      subtitle: 'Open an individual attendance profile with every recorded session.'
    },
    classes: {
      title: 'Class Attendance',
      subtitle: 'Compare attendance coverage and performance by class.'
    },
    analytics: {
      title: 'Attendance Analytics',
      subtitle: 'Explore trends, session patterns, and attendance concentration over time.'
    },
    reports: {
      title: 'Attendance Reports',
      subtitle: 'Prepare operational summaries and export the current attendance report.'
    }
  };

  const page = titleBySection[subSection];

  const goToTake = (className?: string) => {
    if (!canManage) return;
    if (className) onChangeClass(className);
    onNavigateSubSection('take');
  };

  const renderTakeAttendance = () => (
    <div className="space-y-5">
      {!canManage && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-[var(--color-text-secondary)]">
          You have view-only attendance access. Attendance changes and saving are disabled for this role.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard label="Active Roster" value={sheetSummary.total} subtitle={selectedClass === 'All' ? 'All Classes' : `Class ${selectedClass}`} icon={<Users className="w-4 h-4" />} tone="brand" />
        <StatCard label="Present" value={sheetSummary.present} subtitle="Current selection" icon={<CheckCircle2 className="w-4 h-4" />} tone="success" />
        <StatCard label="Absent" value={sheetSummary.absent} subtitle="Current selection" icon={<XCircle className="w-4 h-4" />} tone="danger" />
        <StatCard label="Late / Excused" value={sheetSummary.late + sheetSummary.excused} subtitle={`${sheetSummary.late} late · ${sheetSummary.excused} excused`} icon={<Clock className="w-4 h-4" />} tone="warning" />
        <StatCard label="Session Rate" value={`${sheetSummary.rate}%`} subtitle={`${attendanceDate} · ${attendanceSession === 'after_break' ? 'After Break' : 'Before Break'}`} icon={<UserCheck className="w-4 h-4" />} tone={sheetSummary.rate >= 85 ? 'success' : 'warning'} />
      </div>

      <FilterBar className="flex-col xl:flex-row">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 w-full">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            <input type="date" value={attendanceDate} max={getLocalDateString()} onChange={(event) => onChangeDate(event.target.value)} aria-label="Attendance Date" className="ds-input w-full font-mono" />
          </div>
          <select value={selectedClass} onChange={(event) => onChangeClass(event.target.value)} aria-label="Filter by Class" className="ds-input w-full">
            <option value="All">All Classes ({activeStudents.length})</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.className}>{schoolClass.className}</option>
            ))}
          </select>
          <div className="flex items-center p-1 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
            {(['before_break', 'after_break'] as const).map((session) => (
              <button key={session} type="button" disabled={!canManage} onClick={() => onChangeSession(session)} className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors ${attendanceSession === session ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'} ${!canManage ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                {session === 'before_break' ? 'Before Break' : 'After Break'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
            <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Filter student name or ID..." className="ds-input w-full pl-8" />
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-[var(--color-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Mark All:</span>
            <Button variant="secondary" size="xs" onClick={() => onMarkAllAttendance('Present')}>All Present</Button>
            <Button variant="secondary" size="xs" onClick={() => onMarkAllAttendance('Absent')}>All Absent</Button>
          </div>
        )}
      </FilterBar>

      {filteredSheetStudents.length === 0 ? (
        <EmptyState title="No active students found" description="Adjust your class or search filter, or register active students to take attendance." />
      ) : (
        <>
          <div className="hidden md:block ds-surface overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Roll Call</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">{filteredSheetStudents.length} students in current view</p>
              </div>
              {canManage && (
                <Button variant="primary" size="sm" loading={submitting} icon={<Save className="w-3.5 h-3.5" />} onClick={onSaveSheet}>
                  Save Attendance
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr><th>Student</th><th>Student ID</th><th>Class</th><th>Attendance Status</th></tr></thead>
                <tbody>
                  {filteredSheetStudents.map((student) => {
                    const record = currentSessionAttendance.get(student.id);
                    const currentStatus = record ? record.status : 'Present';
                    return (
                      <tr key={student.id}>
                        <td className="font-semibold text-[var(--color-text-primary)]">{student.fullName}</td>
                        <td className="font-mono text-xs text-[var(--color-text-secondary)]">{student.id}</td>
                        <td><StatusBadge tone="neutral" dot={false}>{student.class}</StatusBadge></td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {statusOptions.map((option) => {
                              const active = currentStatus === option.val;
                              return (
                                <button key={option.val} type="button" disabled={!canManage} onClick={() => onAttendanceChange(student.id, option.val)} aria-pressed={active} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${active ? option.activeClass : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'} ${!canManage ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                  {option.label}
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

          <div className="md:hidden space-y-2.5">
            {filteredSheetStudents.map((student) => {
              const record = currentSessionAttendance.get(student.id);
              const currentStatus = record ? record.status : 'Present';
              return (
                <div key={student.id} className="ds-surface p-3.5 space-y-3 rounded-2xl">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{student.fullName}</p>
                      <p className="text-[11px] font-mono text-[var(--color-text-muted)]">{student.id} · Class {student.class}</p>
                    </div>
                    <StatusBadge tone={getStatusTone(currentStatus)}>{currentStatus}</StatusBadge>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {statusOptions.map((option) => {
                      const active = currentStatus === option.val;
                      return (
                        <button key={option.val} type="button" disabled={!canManage} onClick={() => onAttendanceChange(student.id, option.val)} className={`py-2 px-2 rounded-lg border text-[11px] font-semibold text-center transition-colors ${active ? option.activeClass : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)]'} ${!canManage ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                          {option.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {canManage && (
            <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-lg backdrop-blur">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-primary)]">Ready to save</p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">{selectedClass === 'All' ? 'All classes' : selectedClass} · {attendanceDate} · {attendanceSession === 'after_break' ? 'After Break' : 'Before Break'}</p>
              </div>
              <Button variant="primary" size="sm" loading={submitting} icon={<Save className="w-3.5 h-3.5" />} onClick={onSaveSheet}>Save Attendance</Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard label="Today Records" value={overviewStats.todayRecords} subtitle={getLocalDateString()} icon={<ListChecks className="w-4 h-4" />} tone="brand" />
        <StatCard label="Present" value={overviewStats.present} subtitle="Recorded today" icon={<CheckCircle2 className="w-4 h-4" />} tone="success" />
        <StatCard label="Absent" value={overviewStats.absent} subtitle="Recorded today" icon={<XCircle className="w-4 h-4" />} tone="danger" />
        <StatCard label="Late / Excused" value={overviewStats.late + overviewStats.excused} subtitle={`${overviewStats.late} late · ${overviewStats.excused} excused`} icon={<Clock className="w-4 h-4" />} tone="warning" />
        <StatCard label="Attendance Rate" value={`${overviewStats.rate}%`} subtitle={`${overviewStats.coveredClasses} classes covered`} icon={<TrendingUp className="w-4 h-4" />} tone={overviewStats.rate >= 85 ? 'success' : 'warning'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-5">
        <Section title="Today by Class" subtitle={`${attendanceDate} · ${attendanceSession === 'after_break' ? 'After Break' : 'Before Break'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classSummaries.length === 0 ? (
              <EmptyState title="No classes configured" description="Create classes first to see class-level attendance coverage." />
            ) : (
              classSummaries.map((summary) => (
                <button key={summary.className} type="button" onClick={() => goToTake(summary.className)} className={`text-left rounded-2xl border border-[var(--color-border)] p-4 transition-all ${canManage ? 'hover:border-[var(--color-brand)]/30 hover:shadow-sm cursor-pointer' : 'cursor-default'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{summary.className}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{summary.teacher} · Room {summary.room}</p>
                    </div>
                    <StatusBadge tone={summary.todayRate >= 85 ? 'success' : 'warning'}>{summary.todayRecorded}/{summary.rosterCount}</StatusBadge>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{summary.todayRate}%</p>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Current rate</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                  </div>
                </button>
              ))
            )}
          </div>
        </Section>

        <Section title="Coverage Snapshot" subtitle="Attendance data already recorded in the system">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">Students seen today</span>
                <span className="font-bold text-[var(--color-text-primary)]">{overviewStats.uniqueStudents} / {activeStudents.length}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full rounded-full bg-[var(--color-brand)]" style={{ width: `${activeStudents.length ? Math.min(100, (overviewStats.uniqueStudents / activeStudents.length) * 100) : 0}%` }} />
              </div>
            </div>
            <Button variant="secondary" size="sm" icon={<ListChecks className="w-3.5 h-3.5" />} onClick={() => onNavigateSubSection(canManage ? 'take' : 'daily')}>
              {canManage ? 'Open Today’s Roll Call' : 'Open Daily Register'}
            </Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={onExportPDF}>
              Export Attendance PDF
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );

  const renderDaily = () => (
    <div className="space-y-5">
      <FilterBar>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <input type="date" value={attendanceDate} max={getLocalDateString()} onChange={(event) => onChangeDate(event.target.value)} className="ds-input w-full font-mono" aria-label="Register Date" />
          <select value={selectedClass} onChange={(event) => onChangeClass(event.target.value)} className="ds-input w-full" aria-label="Register Class">
            <option value="All">All Classes</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.className}>{schoolClass.className}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]">
            {(['before_break', 'after_break'] as const).map((session) => (
              <button key={session} type="button" onClick={() => onChangeSession(session)} className={`rounded-lg py-2 text-xs font-semibold ${attendanceSession === session ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)]'} cursor-pointer`}>
                {session === 'before_break' ? 'Before Break' : 'After Break'}
              </button>
            ))}
          </div>
        </div>
      </FilterBar>

      <Section title="Daily Register" subtitle="A read-only class-by-class snapshot for the selected date and session.">
        {classSummaries.length === 0 ? (
          <EmptyState title="No classes configured" description="Add classes to build the daily register." />
        ) : (
          <div className="space-y-2">
            {classSummaries.filter((summary) => selectedClass === 'All' || summary.className === selectedClass).map((summary) => (
              <div key={summary.className} className="rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{summary.className}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{summary.teacher} · {summary.rosterCount} active students · Room {summary.room}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={summary.todayRecorded === summary.rosterCount && summary.rosterCount > 0 ? 'success' : 'warning'}>
                      {summary.todayRecorded}/{summary.rosterCount} recorded
                    </StatusBadge>
                    {canManage && <Button variant="secondary" size="xs" onClick={() => goToTake(summary.className)}>Open Register</Button>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-2.5"><p className="text-lg font-black text-emerald-600">{summary.todayPresent}</p><p className="text-[10px] text-[var(--color-text-muted)]">Present</p></div>
                  <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-2.5"><p className="text-lg font-black text-rose-600">{currentSessionAttendance && summary.rosterCount ? summary.rosterCount - summary.todayRecorded : 0}</p><p className="text-[10px] text-[var(--color-text-muted)]">Unrecorded</p></div>
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-2.5"><p className="text-lg font-black text-amber-600">{summary.late}</p><p className="text-[10px] text-[var(--color-text-muted)]">Late · cumulative</p></div>
                  <div className="rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-2.5"><p className="text-lg font-black text-[var(--color-text-primary)]">{summary.rate}%</p><p className="text-[10px] text-[var(--color-text-muted)]">Historical rate</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-5">
      <FilterBar>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] shrink-0">Select Student:</span>
          <select value={historyStudentId} onChange={(event) => onChangeHistoryStudentId(event.target.value)} className="ds-input flex-1">
            <option value="All">All Students Summary Overview</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} ({student.class})</option>)}
          </select>
        </div>
      </FilterBar>

      {historyStudentId === 'All' ? (
        <Section title="Cumulative Attendance Rate by Student" subtitle="Historical attendance performance across all recorded sessions">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr><th>Student ID</th><th>Student Name</th><th>Class</th><th>Present</th><th>Absent</th><th>Late / Excused</th><th>Attendance Rate</th></tr></thead>
              <tbody>
                {students.map((student) => {
                  const records = attendanceByStudent.get(student.id) || [];
                  const present = records.filter((record) => record.status === 'Present').length;
                  const absent = records.filter((record) => record.status === 'Absent').length;
                  const rate = records.length ? Math.round((present / records.length) * 100) : 100;
                  return (
                    <tr key={student.id} onClick={() => { onChangeHistoryStudentId(student.id); onNavigateSubSection('students'); }} className="cursor-pointer">
                      <td className="font-mono text-xs text-[var(--color-text-secondary)]">{student.id}</td>
                      <td className="font-semibold text-[var(--color-text-primary)]">{student.fullName}</td>
                      <td>{student.class}</td>
                      <td className="font-mono tabular-nums text-[var(--color-success)]">{present}</td>
                      <td className="font-mono tabular-nums text-[var(--color-danger)]">{absent}</td>
                      <td className="font-mono tabular-nums text-[var(--color-text-secondary)]">{records.length - present - absent}</td>
                      <td><StatusBadge tone={rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger'}>{rate}%</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Attendance Rate" value={`${selectedStudentRate}%`} tone="brand" />
          <StatCard label="Present Sessions" value={`${selectedStudentPresent} / ${selectedStudentRecords.length}`} tone="success" />
          <StatCard label="Absences" value={selectedStudentAbsent} tone="danger" />
          <StatCard label="Late & Excused" value={selectedStudentLate + selectedStudentExcused} tone="warning" />
        </div>
      )}
    </div>
  );

  const renderStudentAttendance = () => (
    <div className="space-y-5">
      <FilterBar>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Student:</span>
          <select value={historyStudentId === 'All' ? '' : historyStudentId} onChange={(event) => onChangeHistoryStudentId(event.target.value || 'All')} className="ds-input flex-1">
            <option value="">Choose a student...</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.class}</option>)}
          </select>
          {selectedStudent && <StatusBadge tone={selectedStudentRate >= 90 ? 'success' : selectedStudentRate >= 75 ? 'warning' : 'danger'}>{selectedStudentRate}% rate</StatusBadge>}
        </div>
      </FilterBar>
      {!selectedStudent ? (
        <EmptyState title="Choose a student" description="Select a student to inspect their complete attendance record." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Attendance Rate" value={`${selectedStudentRate}%`} tone="brand" />
            <StatCard label="Recorded Sessions" value={selectedStudentRecords.length} tone="brand" />
            <StatCard label="Present" value={selectedStudentPresent} tone="success" />
            <StatCard label="Absent" value={selectedStudentAbsent} tone="danger" />
            <StatCard label="Late / Excused" value={selectedStudentLate + selectedStudentExcused} tone="warning" />
          </div>
          <Section title={`${selectedStudent.fullName} · Attendance Log`} subtitle={`Student ID ${selectedStudent.id} · Class ${selectedStudent.class}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr><th>Date</th><th>Session</th><th>Status</th><th>Timestamp</th></tr></thead>
                <tbody>
                  {selectedStudentRecords.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-xs text-[var(--color-text-muted)]">No attendance logs recorded for this student yet.</td></tr>
                  ) : (
                    selectedStudentRecords.slice().sort((a, b) => b.date.localeCompare(a.date)).map((record, index) => (
                      <tr key={`${record.date}-${record.sessionType || 'before_break'}-${index}`}>
                        <td className="font-mono font-semibold">{record.date}</td>
                        <td>{record.sessionType === 'after_break' ? 'After Break' : 'Before Break'}</td>
                        <td><StatusBadge tone={getStatusTone(record.status)}>{record.status}</StatusBadge></td>
                        <td className="font-mono text-xs text-[var(--color-text-muted)]">{record.timestamp ? new Date(record.timestamp).toLocaleTimeString() : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );

  const renderClasses = () => (
    <div className="space-y-5">
      <FilterBar>
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] shrink-0">Class:</span>
          <select value={selectedClass} onChange={(event) => onChangeClass(event.target.value)} className="ds-input flex-1">
            <option value="All">All classes</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.className}>{schoolClass.className}</option>)}
          </select>
        </div>
      </FilterBar>
      {selectedClass === 'All' ? (
        <Section title="Class Attendance Overview" subtitle="Historical rate and current roster size across every class">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {classSummaries.map((summary) => (
              <button key={summary.className} type="button" onClick={() => { onChangeClass(summary.className); }} className="rounded-2xl border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-brand)]/30 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-bold text-[var(--color-text-primary)]">{summary.className}</p><p className="text-[11px] text-[var(--color-text-muted)]">{summary.rosterCount} active students</p></div>
                  <StatusBadge tone={summary.rate >= 90 ? 'success' : summary.rate >= 75 ? 'warning' : 'danger'}>{summary.rate}%</StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-black text-emerald-600">{summary.present}</p><p className="text-[10px] text-[var(--color-text-muted)]">Present</p></div>
                  <div><p className="text-lg font-black text-rose-600">{summary.absent}</p><p className="text-[10px] text-[var(--color-text-muted)]">Absent</p></div>
                  <div><p className="text-lg font-black text-amber-600">{summary.late}</p><p className="text-[10px] text-[var(--color-text-muted)]">Late</p></div>
                </div>
              </button>
            ))}
          </div>
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={`${selectedClass} Rate`} value={`${selectedClassSummary?.rate ?? 100}%`} tone="brand" />
            <StatCard label="Present" value={selectedClassSummary?.present ?? 0} tone="success" />
            <StatCard label="Absent" value={selectedClassSummary?.absent ?? 0} tone="danger" />
            <StatCard label="Late / Excused" value={(selectedClassSummary?.late ?? 0) + (selectedClassSummary?.excused ?? 0)} tone="warning" />
          </div>
          <Section title={`${selectedClass} · Student Breakdown`} subtitle="Current active roster with historical attendance rate">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr><th>Student</th><th>ID</th><th>Present</th><th>Absent</th><th>Other</th><th>Rate</th></tr></thead>
                <tbody>
                  {selectedClassRoster.map((student) => {
                    const records = attendanceByStudent.get(student.id) || [];
                    const present = records.filter((record) => record.status === 'Present').length;
                    const absent = records.filter((record) => record.status === 'Absent').length;
                    const other = records.length - present - absent;
                    const rate = records.length ? Math.round((present / records.length) * 100) : 100;
                    return (
                      <tr key={student.id} onClick={() => { onChangeHistoryStudentId(student.id); onNavigateSubSection('students'); }} className="cursor-pointer">
                        <td className="font-semibold text-[var(--color-text-primary)]">{student.fullName}</td>
                        <td className="font-mono text-xs text-[var(--color-text-muted)]">{student.id}</td>
                        <td className="font-mono text-emerald-600">{present}</td>
                        <td className="font-mono text-rose-600">{absent}</td>
                        <td className="font-mono text-[var(--color-text-secondary)]">{other}</td>
                        <td><StatusBadge tone={rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger'}>{rate}%</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );

  const renderAnalytics = () => {
    const maxRecords = Math.max(1, ...recentTrend.map((item) => item.total));
    const mostAbsent = students
      .map((student) => {
        const records = attendanceByStudent.get(student.id) || [];
        const absent = records.filter((record) => record.status === 'Absent').length;
        return { student, absent, records: records.length };
      })
      .filter((item) => item.absent > 0)
      .sort((a, b) => b.absent - a.absent)
      .slice(0, 8);

    const beforeBreak = attendance.filter((record) => (record.sessionType || 'before_break') === 'before_break');
    const afterBreak = attendance.filter((record) => record.sessionType === 'after_break');
    const sessionRate = (rows: AttendanceRecord[]) => {
      const present = rows.filter((record) => record.status === 'Present').length;
      return rows.length ? Math.round((present / rows.length) * 100) : 100;
    };

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Recorded Entries" value={attendance.length} tone="brand" />
          <StatCard label="Tracked Days" value={sortedDates.length} tone="brand" />
          <StatCard label="Before Break Rate" value={`${sessionRate(beforeBreak)}%`} tone="success" />
          <StatCard label="After Break Rate" value={`${sessionRate(afterBreak)}%`} tone="warning" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-5">
          <Section title="Attendance Trend" subtitle="Last 14 recorded attendance dates">
            {recentTrend.length === 0 ? (
              <EmptyState title="Not enough data" description="Attendance history will appear here after records are saved." />
            ) : (
              <div className="space-y-3">
                {recentTrend.map((item) => (
                  <div key={item.date} className="grid grid-cols-[90px_1fr_48px] items-center gap-3">
                    <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{item.date}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                      <div className="h-full rounded-full bg-[var(--color-brand)]" style={{ width: `${Math.max(4, (item.total / maxRecords) * 100)}%` }} />
                    </div>
                    <span className="text-right text-xs font-bold text-[var(--color-text-primary)]">{item.rate}%</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Most Absences" subtitle="Students with the highest recorded absence count">
            {mostAbsent.length === 0 ? (
              <EmptyState title="No absences recorded" description="Great — there are no recorded absent entries yet." />
            ) : (
              <div className="space-y-2">
                {mostAbsent.map((item) => (
                  <button key={item.student.id} type="button" onClick={() => { onChangeHistoryStudentId(item.student.id); onNavigateSubSection('students'); }} className="w-full flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-left hover:bg-[var(--color-surface-muted)] cursor-pointer">
                    <div className="min-w-0"><p className="truncate text-xs font-bold text-[var(--color-text-primary)]">{item.student.fullName}</p><p className="text-[10px] text-[var(--color-text-muted)]">{item.student.class} · {item.records} records</p></div>
                    <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-600">{item.absent} absent</span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]">Attendance Reporting</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--color-text-primary)]">Operational Attendance Report</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Generate the existing PDF export from the attendance dataset currently loaded in this workspace.</p>
          </div>
          <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={onExportPDF}>Export Attendance PDF</Button>
        </div>
      </div>

      <Section title="Current Reporting Snapshot" subtitle="A compact summary before exporting the full report">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr><th>Class</th><th>Active Students</th><th>Records</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
            <tbody>
              {classSummaries.map((summary) => (
                <tr key={summary.className}>
                  <td className="font-semibold text-[var(--color-text-primary)]">{summary.className}</td>
                  <td>{summary.rosterCount}</td>
                  <td className="font-mono">{summary.records}</td>
                  <td className="font-mono text-emerald-600">{summary.present}</td>
                  <td className="font-mono text-rose-600">{summary.absent}</td>
                  <td><StatusBadge tone={summary.rate >= 90 ? 'success' : summary.rate >= 75 ? 'warning' : 'danger'}>{summary.rate}%</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );

  const sectionContent: Record<AttendanceSubSection, React.ReactNode> = {
    overview: renderOverview(),
    take: renderTakeAttendance(),
    daily: renderDaily(),
    history: renderHistory(),
    students: renderStudentAttendance(),
    classes: renderClasses(),
    analytics: renderAnalytics(),
    reports: renderReports()
  };

  return (
    <PageContainer>
      <PageHeader
        title={page.title}
        subtitle={page.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={onExportPDF}>
              Export PDF
            </Button>
            {subSection === 'take' && canManage && (
              <Button variant="primary" size="sm" loading={submitting} icon={<Save className="w-3.5 h-3.5" />} onClick={onSaveSheet}>
                Save Attendance
              </Button>
            )}
          </div>
        }
      />

      <AttendanceWorkspaceNav
        activeSection={subSection}
        onChange={onNavigateSubSection}
        canManage={canManage}
        totalRecords={attendance.length}
      />

      {sectionContent[subSection]}
    </PageContainer>
  );
};
