import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  ExternalLink,
  Download,
  ShieldCheck,
  Edit2,
  Camera,
  School
} from 'lucide-react';
import { motion } from 'motion/react';
import { Student, AttendanceRecord, ExamScore, FeeRecord, Guardian } from '../../../types';
import { Badge, Button } from '../../../components/ui/primitives';
import { apiFetch } from '../../../lib/apiClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface StudentProfileModalProps {
  student: Student;
  guardian?: Guardian;
  classes?: any[];
  attendance?: AttendanceRecord[];
  attendanceRecords?: AttendanceRecord[];
  examScores?: ExamScore[];
  fees?: FeeRecord[];
  feeRecords?: FeeRecord[];
  subjects?: any[];
  currency?: string;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onEditStudent?: (student: Student) => void;
  onStatusChange?: (student: Student, newStatus: 'active' | 'inactive' | 'archived') => void;
  canViewFinance?: boolean;
  canViewAudit?: boolean;
}

export default function StudentProfileModal({
  student,
  guardian,
  attendance,
  attendanceRecords,
  examScores = [],
  fees,
  feeRecords,
  currency = '$',
  onClose,
  onEditStudent,
  onStatusChange,
  canViewFinance = true,
  canViewAudit = false
}: StudentProfileModalProps) {
  type ActivityItem = {
    id: string;
    action: string;
    actorEmail: string;
    actorRole: string;
    changedFields: string[];
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    createdAt: string;
  };

  const [activeTab, setActiveTab] = useState<
    'overview' | 'academic' | 'attendance' | 'fees' | 'activity'
  >('overview');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [profileAttendance, setProfileAttendance] = useState<AttendanceRecord[]>([]);
  const [profileAttendanceLoaded, setProfileAttendanceLoaded] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const profileTabs = useMemo(
    () =>
      canViewFinance
        ? (canViewAudit
            ? (['overview', 'academic', 'attendance', 'fees', 'activity'] as const)
            : (['overview', 'academic', 'attendance', 'fees'] as const))
        : (canViewAudit
            ? (['overview', 'academic', 'attendance', 'activity'] as const)
            : (['overview', 'academic', 'attendance'] as const)),
    [canViewFinance, canViewAudit]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    if (activeTab !== 'attendance') return;

    const loadAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const response = await apiFetch(
          `/api/students/${encodeURIComponent(student.id)}/attendance`
        );
        if (!response.ok) return;

        const payload = await response.json();
        if (!cancelled && Array.isArray(payload)) {
          setProfileAttendance(payload);
          setProfileAttendanceLoaded(true);
        }
      } catch {
        // The prop-provided attendance remains available as a fallback.
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    };

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [activeTab, student.id]);

  useEffect(() => {
    let cancelled = false;

    if (activeTab !== 'activity') return;

    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const response = await apiFetch(
          `/api/students/${encodeURIComponent(student.id)}/audit`
        );
        if (!response.ok) return;

        const payload = await response.json();
        if (!cancelled) setActivity(Array.isArray(payload) ? payload : []);
      } catch {
        if (!cancelled) setActivity([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [activeTab, student.id]);

  const resolvedAttendance = profileAttendanceLoaded
    ? profileAttendance
    : (attendance || attendanceRecords || []);
  const resolvedFees = canViewFinance ? (fees || feeRecords || []) : [];

  useEffect(() => {
    if (!canViewFinance && activeTab === 'fees') setActiveTab('overview');
  }, [canViewFinance, activeTab]);

  const studentAttendance = resolvedAttendance.filter((a) => a.studentId === student.id);
  const studentScores = examScores.filter((e) => e.studentId === student.id);
  const studentFees = resolvedFees.filter((f) => f.studentId === student.id);

  // Attendance stats
  const totalMarked = studentAttendance.length;
  const presentDays = studentAttendance.filter(
    (a) => (a.status || '').toLowerCase() === 'present'
  ).length;
  const absentDays = studentAttendance.filter(
    (a) => (a.status || '').toLowerCase() === 'absent'
  ).length;
  const attendanceRate = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : null;

  // Fee stats
  const totalBilled = studentFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  // Academic stats
  const scorePercentages = studentScores
    .map((s) => {
      const maxMarks = Number(s.maxMarks) || 100;
      const marksObtained = Number(s.marksObtained) || 0;
      return maxMarks > 0 ? Math.max(0, Math.min(100, (marksObtained / maxMarks) * 100)) : null;
    })
    .filter((value): value is number => value !== null);

  const avgScore =
    scorePercentages.length > 0
      ? Math.round(scorePercentages.reduce((sum, value) => sum + value, 0) / scorePercentages.length)
      : null;

  const exportReportCardPDF = () => {
    const doc = new jsPDF();
    doc.text(`WARBIXINTA GUUD EE ARDAYGA (STUDENT REPORT CARD)`, 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Magaca: ${student.fullName} | Fasalka: ${student.class} | ID: ${student.id}`,
      14,
      22
    );
    doc.text(
      `Xiriirka Waalidka: ${student.guardianPhone || guardian?.phone || '-'} | Heerka Joogitaanka: ${attendanceRate === null ? 'N/A' : attendanceRate + '%'}`,
      14,
      28
    );

    doc.text(`Natiijooyinka Imtixaanka:`, 14, 38);
    autoTable(doc, {
      startY: 42,
      head: [['Exam Name', 'Subject', 'Score', 'Max', 'Grade']],
      body: studentScores.map((s) => [
        s.examName || 'Term Exam',
        s.subjectName || 'Subject',
        s.marksObtained,
        s.maxMarks || 100,
        s.grade ||
          (() => {
            const maxMarks = Number(s.maxMarks) || 100;
            const percentage =
              maxMarks > 0 ? ((Number(s.marksObtained) || 0) / maxMarks) * 100 : 0;
            return percentage >= 80 ? 'A' : percentage >= 65 ? 'B' : percentage >= 50 ? 'C' : 'F';
          })()
      ])
    });

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 80;
    if (canViewFinance) {
      doc.text(
        `Xaaladda Lacagta: Wadarta: ${currency} ${totalBilled} | La Bixiyey: ${currency} ${totalPaid} | Baaqiga: ${currency} ${balanceDue}`,
        14,
        finalY
      );
    }

    doc.save(`Warbixinta_${student.fullName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Student Profile: ${student.fullName}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-[var(--shadow-lg)] text-[var(--color-text-primary)]"
      >
        {/* Top Header Card */}
        <div className="p-5 sm:p-6 bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              Students · Profile · {student.id}
            </span>
            <div className="flex items-center gap-2">
              {onEditStudent && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  onClick={() => onEditStudent(student)}
                >
                  Tafatir (Edit)
                </Button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close student profile"
                className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {student.photo ? (
              <img
                src={student.photo}
                alt={student.fullName}
                className="w-20 h-20 rounded-lg object-cover border-2 border-[var(--color-brand-border)] shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand)] font-bold text-2xl font-mono shrink-0">
                {student.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] leading-tight truncate">
                  {student.fullName}
                </h2>
                <Badge
                  variant={
                    student.status === 'active'
                      ? 'success'
                      : student.status === 'archived'
                      ? 'neutral'
                      : 'warning'
                  }
                >
                  {(student.status || 'active').toUpperCase()}
                </Badge>
              </div>

              <p className="text-xs text-[var(--color-text-secondary)] font-mono">
                ID: <span className="text-[var(--color-text-primary)] font-semibold">{student.id}</span>
                {' · '}
                Fasal: <span className="text-[var(--color-brand)] font-bold">{student.class}</span>
                {student.section ? ` (${student.section})` : ''}
                {student.rollNumber ? ` · Roll #${student.rollNumber}` : ''}
                {' · '}
                Jinsi: {student.gender || 'Male'}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                  <span className="font-mono">
                    {student.guardianPhone || guardian?.phone || 'Lama helin'}
                  </span>
                </div>
                {(student.guardianPhone || guardian?.phone) && (
                  <>
                    <a
                      href={`tel:${student.guardianPhone || guardian?.phone}`}
                      className="text-[11px] text-[var(--color-brand)] hover:underline font-medium"
                    >
                      Wac Hadda
                    </a>
                    <a
                      href={`https://wa.me/${(student.guardianPhone || guardian?.phone || '').replace(
                        /[^0-9]/g,
                        ''
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-[var(--color-success)] hover:underline font-medium"
                    >
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className={`grid gap-2.5 mt-5 pt-4 border-t border-[var(--color-border)] text-xs ${canViewFinance ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">
                Heerka Joogitaanka
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-[var(--color-success)]">
                {attendanceRate === null ? '—' : `${attendanceRate}%`}
              </span>
            </div>
            <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">
                Celceliska Imtixaanka
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-[var(--color-brand)]">
                {avgScore === null ? '—' : `${avgScore}%`}
              </span>
            </div>
            {canViewFinance && (
              <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">
                  Baaqiga Lacagta
                </span>
                <span
                  className={`text-base font-bold font-mono tabular-nums ${
                    balanceDue > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
                  }`}
                >
                  {currency} {balanceDue}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 sm:px-6 pt-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] overflow-x-auto">
          {profileTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab === 'overview'
                ? 'Guudmar (Overview)'
                : tab === 'academic'
                ? `Natiijada (${studentScores.length})`
                : tab === 'attendance'
                ? `Xaadiriska (${totalMarked})`
                : tab === 'fees'
                ? `Lacagaha (${studentFees.length})`
                : 'Activity'}
            </button>
          ))}

          <div className="ml-auto pl-2 pb-1">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={exportReportCardPDF}
            >
              Warbixin PDF
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                    Student Activity
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Diiwaanka isbeddellada muhiimka ah ee ardaygan.
                  </p>
                </div>
                <ShieldCheck className="w-4 h-4 text-[var(--color-brand)]" />
              </div>

              {activityLoading ? (
                <div className="py-10 text-center text-[var(--color-text-muted)]">
                  Loading activity...
                </div>
              ) : activity.length === 0 ? (
                <div className="py-10 text-center text-[var(--color-text-muted)]">
                  Weli activity audit ah lama hayo.
                </div>
              ) : (
                <div className="space-y-2">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="border border-[var(--color-border)] rounded-lg p-3 bg-[var(--color-surface-muted)]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-primary)] uppercase">
                            {item.action}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            {item.actorEmail || 'System'}
                            {item.actorRole ? ` · ${item.actorRole}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>

                      {item.changedFields.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {item.changedFields.slice(0, 12).map((field) => (
                              <span
                                key={field}
                                className="px-2 py-1 rounded-md border border-[var(--color-border)] text-[10px] text-[var(--color-text-secondary)]"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                          {(item.beforeData || item.afterData) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                  Ka hor (Before)
                                </p>
                                <pre className="text-[9px] whitespace-pre-wrap break-words text-[var(--color-text-secondary)]">
                                  {JSON.stringify(item.beforeData, null, 2)}
                                </pre>
                              </div>
                              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                  Ka dib (After)
                                </p>
                                <pre className="text-[9px] whitespace-pre-wrap break-words text-[var(--color-text-secondary)]">
                                  {JSON.stringify(item.afterData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {(item.beforeData || item.afterData) && (
                            <div className="space-y-1.5">
                              {item.changedFields.slice(0, 8).map((field) => {
                                const beforeValue = item.beforeData?.[field];
                                const afterValue = item.afterData?.[field];

                                if (
                                  beforeValue === undefined &&
                                  afterValue === undefined
                                ) {
                                  return null;
                                }

                                const formatValue = (value: unknown) =>
                                  value === null || value === undefined || value === ''
                                    ? '—'
                                    : String(value);

                                return (
                                  <div
                                    key={`diff-${field}`}
                                    className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-1 sm:gap-3 text-[10px]"
                                  >
                                    <span className="font-semibold text-[var(--color-text-muted)]">
                                      {field}
                                    </span>
                                    <span className="text-[var(--color-text-secondary)] break-words">
                                      {formatValue(beforeValue)} → {formatValue(afterValue)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Personal Information */}
              <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-[var(--color-brand)] border-b border-[var(--color-border)] pb-2">
                  <User className="w-3.5 h-3.5" />
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    01. Xogta Shakhsiga (Personal Info)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Magaca Buuxa
                    </span>
                    <span className="text-[var(--color-text-primary)] font-semibold">
                      {student.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Jinsiga (Gender)
                    </span>
                    <span className="text-[var(--color-text-primary)] font-medium">
                      {student.gender || 'Male'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Taariikhda Dhalashada
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono tabular-nums">
                      {student.dateOfBirth || 'Lama hayo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Dhiigga / National ID
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {[student.bloodGroup, student.nationalId].filter(Boolean).join(' · ') ||
                        'Lama hayo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Enrollment Information */}
              <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-[var(--color-success)] border-b border-[var(--color-border)] pb-2">
                  <School className="w-3.5 h-3.5" />
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    02. Macluumaadka Waxbarashada (Enrollment)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Fasalka Hadda
                    </span>
                    <span className="text-[var(--color-brand)] font-bold">{student.class}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Qeybta / Roll No
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {student.section ? `Sec ${student.section}` : '-'}{' '}
                      {student.rollNumber ? `· #${student.rollNumber}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Taariikhda Qorista
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono tabular-nums">
                      {student.createdAt || 'Lama hayo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Iskuulkii Hore
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      {student.previousSchool || 'Lama hayo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Guardian Information */}
              <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-[var(--color-info)] border-b border-[var(--color-border)] pb-2">
                  <Phone className="w-3.5 h-3.5" />
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    03. Xogta Waalidka (Guardian Info)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Magaca Waalidka
                    </span>
                    <span className="text-[var(--color-text-primary)] font-semibold">
                      {student.guardianName || guardian?.name || 'Lama hayo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Xiriirka
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      {student.guardianRelationship || guardian?.relationship || 'Waalid'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Telefoonka Koowaad
                    </span>
                    <span className="text-[var(--color-brand)] font-mono font-semibold">
                      {student.guardianPhone || guardian?.phone || 'Lama hayo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Cinwaanka Guriga
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      {student.address || guardian?.address || 'Lama hayo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Telefoonka Labaad
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {student.guardianPhoneAlt || 'Lama hayo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Student Photo & Status */}
              <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-[var(--color-brand)] border-b border-[var(--color-border)] pb-2">
                  <Camera className="w-3.5 h-3.5" />
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    04. Sawirka & Xaaladda (Photo & Status)
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  {student.photo ? (
                    <img
                      src={student.photo}
                      alt={student.fullName}
                      className="w-14 h-14 rounded-lg object-cover border border-[var(--color-brand-border)] shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand)] font-bold font-mono text-base shrink-0">
                      {student.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-[var(--color-text-muted)] text-[10px]">
                        Sawirka Aqoonsiga:{' '}
                      </span>
                      <span className="text-[var(--color-text-primary)] font-medium">
                        {student.photo ? 'Waa diiwaangashan yahay' : 'Sawir ma jiro'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)] text-[10px]">
                        Xaaladda Hadda:{' '}
                      </span>
                      <span className="text-[var(--color-brand)] font-mono font-bold uppercase">
                        {student.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>

                {student.medicalNotes && (
                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <span className="text-[var(--color-text-muted)] text-[10px] block mb-1">
                      Xusuusin Caafimaad
                    </span>
                    <p className="text-[11px] text-[var(--color-text-secondary)] whitespace-pre-wrap break-words">
                      {student.medicalNotes}
                    </p>
                  </div>
                )}

                {onStatusChange && (
                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      Beddel Xaaladda:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(['active', 'inactive', 'archived'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => onStatusChange(student, st)}
                          disabled={(student.status || 'active') === st}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase transition-colors border ${
                            (student.status || 'active') === st
                              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand-border)] font-bold cursor-default'
                              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. System Information */}
              <div className="md:col-span-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-[var(--color-warning)] border-b border-[var(--color-border)] pb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    05. Xogta Nidaamka (System Information)
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Student System ID
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono font-semibold">
                      {student.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Registration Date
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono tabular-nums">
                      {student.createdAt || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Last Updated
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono tabular-nums">
                      {student.updatedAt || student.createdAt || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Last Updated
                    </span>
                    <span className="text-[var(--color-text-primary)] font-mono tabular-nums">
                      {(student.updatedAt || student.createdAt || 'N/A').split('T')[0]}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px]">
                      Record Status
                    </span>
                    <span className="text-[var(--color-success)] font-mono uppercase">
                      {student.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              {student.medicalNotes && (
                <div className="md:col-span-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-4 rounded-lg space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--color-warning)] block">
                    Xusuusin Gaar ah / Caafimaad (Notes)
                  </span>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {student.medicalNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-3">
              {studentScores.length === 0 ? (
                <div className="py-8 text-center text-[var(--color-text-muted)]">
                  Weli imtixaanno lama gelin ardaygan
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--color-surface-muted)] text-[10px] uppercase font-mono text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="py-2.5 px-3">Imtixaanka</th>
                        <th className="py-2.5 px-3">Maaddada</th>
                        <th className="py-2.5 px-3">Dhibcaha</th>
                        <th className="py-2.5 px-3">Darajada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-primary)]">
                      {studentScores.map((score) => {
                        const maxMarks = Number(score.maxMarks) || 100;
                        const scorePercent =
                          maxMarks > 0
                            ? ((Number(score.marksObtained) || 0) / maxMarks) * 100
                            : 0;
                        const grade =
                          score.grade ||
                          (scorePercent >= 80
                            ? 'A'
                            : scorePercent >= 65
                            ? 'B'
                            : scorePercent >= 50
                            ? 'C'
                            : 'F');
                        return (
                          <tr key={score.id}>
                            <td className="py-2.5 px-3 font-semibold">
                              {score.examName || 'Midterm'}
                            </td>
                            <td className="py-2.5 px-3">{score.subjectName}</td>
                            <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-[var(--color-brand)]">
                              {score.marksObtained} / {score.maxMarks || 100}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={
                                  grade === 'A'
                                    ? 'success'
                                    : grade === 'F'
                                    ? 'danger'
                                    : 'info'
                                }
                              >
                                {grade}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg">
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">
                    Maalmaha la joogay
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-success)]">
                    {presentDays} maalmood
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">
                    Maalmaha la maqnaa
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-danger)]">
                    {absentDays} maalmood
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">
                    Wadarta Diiwaanka
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                    {totalMarked} xilliyo
                  </span>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {attendanceLoading ? (
                  <div className="py-6 text-center text-[var(--color-text-muted)]">
                    Loading attendance...
                  </div>
                ) : studentAttendance.length === 0 ? (
                  <div className="py-6 text-center text-[var(--color-text-muted)]">
                    Weli diiwaan xaadiris ah lama hayo
                  </div>
                ) : (
                  studentAttendance.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-md text-xs"
                    >
                      <span className="font-mono tabular-nums text-[var(--color-text-secondary)]">
                        {att.date}
                      </span>
                      <Badge
                        variant={
                          att.status.toLowerCase() === 'present' ? 'success' : 'danger'
                        }
                      >
                        {att.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {canViewFinance && activeTab === 'fees' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg">
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">
                    Wadarta Khidmadda
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                    {currency} {totalBilled}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">
                    La Bixiyey
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-success)]">
                    {currency} {totalPaid}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">
                    Baaqiga Hadhey
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      balanceDue > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
                    }`}
                  >
                    {currency} {balanceDue}
                  </span>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {studentFees.length === 0 ? (
                  <div className="py-6 text-center text-[var(--color-text-muted)]">
                    Weli biilal lacageed looma diiwaangelin
                  </div>
                ) : (
                  studentFees.map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-md text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[var(--color-text-primary)]">
                          {fee.month} {fee.year} (Fee)
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                          {fee.createdAt ? new Date(fee.createdAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono tabular-nums font-bold text-[var(--color-brand)]">
                          {currency} {fee.amount}
                        </div>
                        <Badge variant={fee.status === 'paid' ? 'success' : 'warning'}>
                          {fee.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
