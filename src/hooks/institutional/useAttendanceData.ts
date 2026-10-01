import { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, Student, SystemSettings } from '../../types';
import { apiFetch, enqueueOfflineAction } from '../../lib/apiClient';

interface UseAttendanceDataOptions {
  user: any | null;
  students: Student[];
  settings: SystemSettings;
  submitting: boolean;
  setSubmitting: (val: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useAttendanceData({
  user,
  students,
  settings,
  submitting,
  setSubmitting,
  showToast
}: UseAttendanceDataOptions) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSession, setAttendanceSession] = useState<'before_break' | 'after_break'>(
    'before_break'
  );
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string>('All');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'sheet' | 'history'>('sheet');
  const [historyStudentId, setHistoryStudentId] = useState<string>('All');
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (!user) return;
    apiFetch(`/api/attendance?date=${attendanceDate}&session_type=${attendanceSession}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAttendance(data);
      })
      .catch((err) => {
        console.error('Failed to load attendance:', err);
      });
  }, [attendanceDate, attendanceSession, user]);

  const handleAttendanceChange = useCallback(
    (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
      setAttendance((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.date === attendanceDate &&
              a.studentId === studentId &&
              (a.sessionType || 'before_break') === attendanceSession
            )
        );
        return [
          ...filtered,
          {
            date: attendanceDate,
            studentId,
            status,
            sessionType: attendanceSession,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })
          }
        ];
      });
    },
    [attendanceDate, attendanceSession]
  );

  const handleMarkAllAttendance = useCallback(
    (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
      const activeStudents = students.filter((s) => s.status === 'active');
      const targetStudents =
        selectedAttendanceClass === 'All'
          ? activeStudents
          : activeStudents.filter((s) => s.class === selectedAttendanceClass);
      const targetIds = new Set(targetStudents.map((s) => s.id));
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      setAttendance((prev) => {
        const remaining = prev.filter(
          (a) =>
            !(
              a.date === attendanceDate &&
              (a.sessionType || 'before_break') === attendanceSession &&
              targetIds.has(a.studentId)
            )
        );
        const updated = targetStudents.map((s) => ({
          date: attendanceDate,
          studentId: s.id,
          status,
          sessionType: attendanceSession,
          timestamp: now
        }));
        return [...remaining, ...updated];
      });
      showToast(
        `Dhammaan ardayda waxaa loo calaamadeeyay: ${
          status === 'Present'
            ? 'Jooga'
            : status === 'Absent'
            ? 'Maqan'
            : status === 'Late'
            ? 'Daahay'
            : 'Fasahan'
        }`,
        'info'
      );
    },
    [students, selectedAttendanceClass, attendanceDate, attendanceSession, showToast]
  );

  const handleSaveAttendanceSheet = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const activeStudents = students.filter((s) => s.status === 'active');
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      const recordsToSave = activeStudents.map((s) => {
        const existing = attendance.find(
          (a) =>
            a.date === attendanceDate &&
            a.studentId === s.id &&
            (a.sessionType || 'before_break') === attendanceSession
        );
        return (
          existing || {
            date: attendanceDate,
            studentId: s.id,
            status: 'Present' as const,
            sessionType: attendanceSession,
            timestamp: now
          }
        );
      });

      const res = await apiFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: attendanceDate,
          session_type: attendanceSession,
          records: recordsToSave
        })
      });
      if (res.ok) {
        setAttendance(recordsToSave);
        const sessionLabel =
          attendanceSession === 'before_break'
            ? 'Gelin Hore (Before Break)'
            : 'Gelin Dambe (After Break)';
        showToast(
          `Xaadirinta [${sessionLabel}] si guul leh ayaa loo kaydiyey!`,
          'success'
        );
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Kaydinta xaadirinta way fashilantay', 'error');
      }
    } catch {
      const activeStudents = students.filter((s) => s.status === 'active');
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      const recordsToSave = activeStudents.map((s) => {
        const existing = attendance.find(
          (a) =>
            a.date === attendanceDate &&
            a.studentId === s.id &&
            (a.sessionType || 'before_break') === attendanceSession
        );
        return (
          existing || {
            date: attendanceDate,
            studentId: s.id,
            status: 'Present' as const,
            sessionType: attendanceSession,
            timestamp: now
          }
        );
      });
      enqueueOfflineAction('attendance', '/api/attendance', 'POST', {
        date: attendanceDate,
        session_type: attendanceSession,
        records: recordsToSave
      });
      setAttendance(recordsToSave);
      showToast('Xaadirinta waxaa lagu keydiyey Offline Queue', 'info');
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    setSubmitting,
    students,
    attendance,
    attendanceDate,
    attendanceSession,
    showToast
  ]);

  const exportAttendanceToPDF = useCallback(() => {
    try {
      const doc = new jsPDF();
      const schoolTitle = settings.schoolName || 'Dugsiga Pro 2026';

      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229);
      doc.text(schoolTitle, 14, 18);

      const sessionLabel =
        attendanceSession === 'before_break' ? 'Before Break' : 'After Break';
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(
        `Warbixinta Xaadirinta Maalinlaha - Taariikh: ${attendanceDate} (${sessionLabel})`,
        14,
        26
      );

      const activeStudents = students.filter(
        (s) =>
          s.status === 'active' &&
          (selectedAttendanceClass === 'All' || s.class === selectedAttendanceClass)
      );

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      const tableData = activeStudents.map((s, idx) => {
        const record = attendance.find(
          (a) =>
            a.date === attendanceDate &&
            a.studentId === s.id &&
            (a.sessionType || 'before_break') === attendanceSession
        );
        const status = record ? record.status : 'Present';
        if (status === 'Present') presentCount++;
        else if (status === 'Absent') absentCount++;
        else if (status === 'Late') lateCount++;
        else if (status === 'Excused') excusedCount++;

        const statusSomali =
          status === 'Present'
            ? 'Jooga (Present)'
            : status === 'Absent'
            ? 'Maqan (Absent)'
            : status === 'Late'
            ? 'Daahay (Late)'
            : 'Fasahan (Excused)';

        return [
          idx + 1,
          s.id,
          s.fullName,
          s.class,
          statusSomali,
          record?.timestamp || '--:--'
        ];
      });

      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text(
        `Wadarta: ${activeStudents.length}  |  Jooga: ${presentCount}  |  Maqan: ${absentCount}  |  Daahay: ${lateCount}  |  Fasahan: ${excusedCount}`,
        14,
        33
      );

      autoTable(doc, {
        head: [['#', 'ID', 'Magaca Ardayga', 'Fasalka', 'Xaaladda', 'Waqtiga']],
        body: tableData,
        startY: 38,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 }
      });

      doc.save(`Xaadirinta_${attendanceDate}_${attendanceSession}.pdf`);
      showToast('Warbixinta PDF ee xaadirinta waa la soo dejiyey', 'success');
    } catch {
      showToast('Soo dejinta PDF way fashilantay', 'error');
    }
  }, [
    settings.schoolName,
    attendanceSession,
    attendanceDate,
    students,
    selectedAttendanceClass,
    attendance,
    showToast
  ]);

  return {
    attendance,
    setAttendance,
    attendanceSession,
    setAttendanceSession,
    selectedAttendanceClass,
    setSelectedAttendanceClass,
    attendanceSubTab,
    setAttendanceSubTab,
    historyStudentId,
    setHistoryStudentId,
    attendanceDate,
    setAttendanceDate,
    handleAttendanceChange,
    handleMarkAllAttendance,
    handleSaveAttendanceSheet,
    exportAttendanceToPDF
  };
}
