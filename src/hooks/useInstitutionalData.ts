import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Student,
  AttendanceRecord,
  FeeRecord,
  SystemSettings,
  DbStatus,
  SchoolClass,
  SchoolSubject,
  ExamScore,
  Teacher,
  StaffMember,
  Guardian,
  StaffAttendance,
  TimetableSlot,
  Admission,
  LibraryBook,
  LibraryLoan,
  InventoryItem,
  Announcement
} from '../types';
import { apiFetch, enqueueOfflineAction } from '../lib/apiClient';

interface UseInstitutionalDataOptions {
  user: any | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
  onRequestConfirm: (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }) => void;
}

export function useInstitutionalData({
  user,
  showToast,
  onSetTheme,
  onLogout,
  onRequestConfirm
}: UseInstitutionalDataOptions) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [examScores, setExamScores] = useState<ExamScore[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSession, setAttendanceSession] = useState<'before_break' | 'after_break'>(
    'before_break'
  );
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string>('All');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'sheet' | 'history'>('sheet');
  const [historyStudentId, setHistoryStudentId] = useState<string>('All');
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [fees, setFees] = useState<FeeRecord[]>([]);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendance[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [libraryLoans, setLibraryLoans] = useState<LibraryLoan[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [settings, setSettings] = useState<SystemSettings>({
    schoolName: 'Dugsiga Pro 2026',
    currency: 'USD',
    feeAmount: 50,
    systemTheme: 'dark',
    academicYear: '2025/2026',
    schoolEmail: 'admin@dugsigapro.edu',
    schoolPhone: '252615000000',
    schoolAddress: 'Mogadishu, Somalia',
    passThreshold: 60,
    gradeAThreshold: 90,
    gradeBThreshold: 80,
    gradeCThreshold: 70,
    gradeDThreshold: 60
  });

  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/db/status');
      if (res.ok) {
        setDbStatus(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch database status:', e);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        resStudents,
        resFees,
        resSettings,
        resClasses,
        resSubjects,
        resExams,
        resTeachers,
        resStaff,
        resGuardians,
        resTimetable,
        resAdmissions,
        resBooks,
        resLoans,
        resInventory,
        resAnnouncements
      ] = await Promise.all([
        apiFetch('/api/students'),
        apiFetch('/api/fees'),
        apiFetch('/api/settings'),
        apiFetch('/api/classes'),
        apiFetch('/api/subjects'),
        apiFetch('/api/exams'),
        apiFetch('/api/teachers'),
        apiFetch('/api/staff'),
        apiFetch('/api/guardians'),
        apiFetch('/api/timetable'),
        apiFetch('/api/admissions'),
        apiFetch('/api/library/books'),
        apiFetch('/api/library/loans'),
        apiFetch('/api/inventory'),
        apiFetch('/api/announcements')
      ]);

      if (resStudents.ok) setStudents(await resStudents.json());
      if (resFees.ok) setFees(await resFees.json());
      if (resClasses.ok) setClasses(await resClasses.json());
      if (resSubjects.ok) setSubjects(await resSubjects.json());
      if (resExams.ok) setExamScores(await resExams.json());
      if (resTeachers?.ok) setTeachers(await resTeachers.json());
      if (resStaff?.ok) setStaff(await resStaff.json());
      if (resGuardians?.ok) setGuardians(await resGuardians.json());
      if (resTimetable?.ok) setTimetable(await resTimetable.json());
      if (resAdmissions?.ok) setAdmissions(await resAdmissions.json());
      if (resBooks?.ok) setLibraryBooks(await resBooks.json());
      if (resLoans?.ok) setLibraryLoans(await resLoans.json());
      if (resInventory?.ok) setInventory(await resInventory.json());
      if (resAnnouncements?.ok) setAnnouncements(await resAnnouncements.json());

      if (resSettings.ok) {
        const s = await resSettings.json();
        setSettings(s);
      }
    } catch {
      showToast('Xogta laguma soo rari karo serverka', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  const fetchAttendanceForDateAndSession = useCallback(
    async (date: string, session: 'before_break' | 'after_break') => {
      if (!user) return;
      try {
        const res = await apiFetch(`/api/attendance?date=${encodeURIComponent(date)}&session_type=${encodeURIComponent(session)}`);
        if (res.ok) {
          setAttendance(await res.json());
        }
      } catch (e) {
        console.error('Failed to load attendance:', e);
      }
    },
    [user]
  );

  const fetchAttendanceHistory = useCallback(async () => {
    if (!user) return;
    try {
      // No date/session filter = cumulative school history. The API still
      // enforces school tenancy and teacher class scope server-side.
      const res = await apiFetch('/api/attendance');
      if (res.ok) {
        setAttendance(await res.json());
      }
    } catch (e) {
      console.error('Failed to load attendance history:', e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (attendanceSubTab === 'history') {
      fetchAttendanceHistory();
    } else {
      fetchAttendanceForDateAndSession(attendanceDate, attendanceSession);
    }
  }, [
    user,
    attendanceSubTab,
    attendanceDate,
    attendanceSession,
    fetchAttendanceForDateAndSession,
    fetchAttendanceHistory
  ]);

  useEffect(() => {
    fetchDbStatus();
    if (user) {
      fetchAllData();
    }
  }, [user, fetchDbStatus, fetchAllData]);

  // Student CRUD Operations
  const handleApiAddStudent = async (studentData: any): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Hawshu way fashilantay', 'error');
        return false;
      }
    } catch {
      const offlineStudent = {
        ...studentData,
        id: studentData.id || 'STD-' + (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8).toUpperCase() : Date.now().toString(36).toUpperCase()),
        updatedAt: new Date().toISOString()
      };
      enqueueOfflineAction('student', '/api/students', 'POST', offlineStudent);
      setStudents((prev) => [offlineStudent, ...prev]);
      showToast('Ardayga waxaa lagu keydiyey Offline Sync Queue. Wuu sugayaa marka internet-ku soo laabto.', 'info');
      return true;
    }
  };

  const handleApiImportStudents = async (
    studentsToImport: any[]
  ): Promise<{ success: boolean; imported: number; failed: number }> => {
    if (!user) return { success: false, imported: 0, failed: studentsToImport.length };

    if (!Array.isArray(studentsToImport) || studentsToImport.length === 0) {
      showToast('Ma jiraan arday la soo gelinayo.', 'warning');
      return { success: false, imported: 0, failed: 0 };
    }

    try {
      const res = await apiFetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsToImport })
      });

      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        await fetchAllData();
        return {
          success: true,
          imported: Number(payload.imported) || studentsToImport.length,
          failed: Number(payload.failed) || 0
        };
      }

      const failed = Number(payload.failed) || studentsToImport.length;
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        const firstError = payload.errors[0]?.error;
        showToast(firstError || payload.error || 'Import-ku wuu fashilmay.', 'error');
      } else {
        showToast(payload.error || 'Import-ku wuu fashilmay.', 'error');
      }

      return { success: false, imported: 0, failed };
    } catch {
      showToast(
        'Import-ka lama samayn karo marka server-ku aanu la heli karin. Fadlan internet-ka hubi kadibna mar kale isku day.',
        'error'
      );
      return { success: false, imported: 0, failed: studentsToImport.length };
    }
  };

  const handleApiUpdateStudent = async (id: string, updates: any): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Cusbooneysiintu way fashilantay', 'error');
        return false;
      }
    } catch {
      enqueueOfflineAction('student', `/api/students/${id}`, 'PUT', updates);
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      showToast('Isbeddelka ardayga waxaa lagu keydiyey Offline Queue. Wuu sync-gareyn doonaa marka internet-ku soo laabto.', 'info');
      return true;
    }
  };

  const handleApiDeleteStudent = async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
        return true;
      }

      const err = await res.json().catch(() => ({}));
      showToast(
        err.error || 'Tirtiriddu way fashilantay. Haddii ardaygu leeyahay xog ku xiran, isticmaal Archive.',
        'error'
      );
      return false;
    } catch {
      showToast(
        'Tirtiridda lama samayn karo marka internet-ku go’an yahay. Fadlan internet-ka soo celi kadib isku day mar kale.',
        'error'
      );
      return false;
    }
  };

  const handleApiBulkUpdate = async (
    action: string,
    studentIds: string[],
    targetValue?: string,
    targetSection?: string
  ): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          studentIds,
          targetClass: action === 'change_class' ? targetValue : undefined,
          targetSection: action === 'change_class' ? targetSection : undefined,
          targetStatus: action === 'change_status' ? targetValue : undefined
        })
      });
      if (res.ok) {
        fetchAllData();
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Hawsha bulk way fashilantay', 'error');
        return false;
      }
    } catch {
      showToast('Khalad ayaa dhacay fulinta hawsha guud', 'error');
      return false;
    }
  };

  // Attendance Operations
  const activeStudents = useMemo(
    () => students.filter((s) => s.status === 'active'),
    [students]
  );

  const handleAttendanceChange = (
    studentId: string,
    status: 'Present' | 'Absent' | 'Late' | 'Excused'
  ) => {
    const existingIdx = attendance.findIndex(
      (a) =>
        a.date === attendanceDate &&
        a.studentId === studentId &&
        (a.sessionType || 'before_break') === attendanceSession
    );
    const updatedAttendance = [...attendance];

    if (existingIdx > -1) {
      updatedAttendance[existingIdx] = {
        ...updatedAttendance[existingIdx],
        status,
        timestamp: new Date().toISOString()
      };
    } else {
      updatedAttendance.push({
        date: attendanceDate,
        studentId,
        status,
        timestamp: new Date().toISOString(),
        sessionType: attendanceSession
      });
    }
    setAttendance(updatedAttendance);
  };

  const handleMarkAllAttendance = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    const updatedAttendance = [...attendance];
    const targetStudents =
      selectedAttendanceClass === 'All'
        ? activeStudents
        : activeStudents.filter((s) => s.class === selectedAttendanceClass);

    targetStudents.forEach((s) => {
      const idx = updatedAttendance.findIndex(
        (a) =>
          a.date === attendanceDate &&
          a.studentId === s.id &&
          (a.sessionType || 'before_break') === attendanceSession
      );
      if (idx > -1) {
        updatedAttendance[idx] = {
          ...updatedAttendance[idx],
          status,
          timestamp: new Date().toISOString()
        };
      } else {
        updatedAttendance.push({
          date: attendanceDate,
          studentId: s.id,
          status,
          timestamp: new Date().toISOString(),
          sessionType: attendanceSession
        });
      }
    });

    setAttendance(updatedAttendance);
    showToast(
      `Dhammaan ardayda ${
        selectedAttendanceClass === 'All' ? 'firfircoon' : 'fasalka ' + selectedAttendanceClass
      } waxaa loo calaamadeeyey: ${status}`,
      'info'
    );
  };

  const handleSaveAttendanceSheet = async () => {
    if (submitting) return;

    const targetStudents =
      selectedAttendanceClass === 'All'
        ? activeStudents
        : activeStudents.filter((s) => s.class === selectedAttendanceClass);

    if (targetStudents.length === 0) {
      showToast('Ma jiraan arday Active ah oo fasalkan ku jira.', 'warning');
      return;
    }

    const attendanceLookup = new Map(
      attendance
        .filter(
          (a) =>
            a.date === attendanceDate &&
            (a.sessionType || 'before_break') === attendanceSession
        )
        .map((a) => [a.studentId, a])
    );

    const recordsToSave = targetStudents.map((s) => {
      const record = attendanceLookup.get(s.id);
      return {
        studentId: s.id,
        status: record ? record.status : 'Present',
        timestamp: record ? record.timestamp : new Date().toISOString(),
        sessionType: attendanceSession
      };
    });

    if (!navigator.onLine) {
      enqueueOfflineAction('attendance', '/api/attendance', 'POST', {
        date: attendanceDate,
        session_type: attendanceSession,
        records: recordsToSave
      });
      showToast(
        'Waxaad ku jirtaa habka Offline-ka! Xaadirinta waxaa lagu keydiyey qalabkaaga.',
        'info'
      );
      return;
    }

    setSubmitting(true);
    try {
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
        showToast(
          `Xaadirinta taariikhda ${attendanceDate} si guul leh ayaa loo kaydiyey!`,
          'success'
        );
        await fetchAttendanceForDateAndSession(attendanceDate, attendanceSession);
      } else {
        showToast('Xaadirinta la kaydin kari waayey', 'error');
      }
    } catch {
      enqueueOfflineAction('attendance', '/api/attendance', 'POST', {
        date: attendanceDate,
        session_type: attendanceSession,
        records: recordsToSave
      });
      showToast('Xaadirinta waxaa lagu keydiyey Offline Sync Queue.', 'info');
    } finally {
      setSubmitting(false);
    }
  };

  const exportAttendanceToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 6, 'F');

      doc.setTextColor(17, 24, 39);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(settings.schoolName || 'Dugsi Pro 2026', 15, 20);

      doc.setTextColor(107, 114, 128);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Attendance Report — Class: ${selectedAttendanceClass} | Date: ${attendanceDate}`,
        15,
        26
      );

      const targetStudents =
        selectedAttendanceClass === 'All'
          ? activeStudents
          : activeStudents.filter((s) => s.class === selectedAttendanceClass);

      const tableBody = targetStudents.map((s, idx) => {
        const r = attendance.find(
          (a) =>
            a.date === attendanceDate &&
            a.studentId === s.id &&
            (a.sessionType || 'before_break') === attendanceSession
        );
        const status = r ? r.status : 'Present';
        return [
          (idx + 1).toString(),
          s.id,
          s.fullName.toUpperCase(),
          s.class.toUpperCase(),
          s.gender.toUpperCase(),
          status.toUpperCase()
        ];
      });

      autoTable(doc, {
        startY: 34,
        head: [['#', 'Student ID', 'Student Name', 'Class', 'Gender', 'Status']],
        body: tableBody.length > 0 ? tableBody : [['-', '-', 'No students found', '-', '-', '-']],
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5, font: 'Helvetica' }
      });

      doc.save(`Attendance_${attendanceDate}_${selectedAttendanceClass.replace(/\s+/g, '_')}.pdf`);
      showToast('Attendance PDF exported!', 'success');
    } catch (err) {
      console.error('Failed to export attendance to PDF:', err);
    }
  };

  // Academics CRUD Handlers
  const handleAddClass = async (classData: Omit<SchoolClass, 'id' | 'createdAt'>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      });
      if (res.ok) {
        showToast('Fasalka si guul leh ayaa loo abuuray!', 'success');
        fetchAllData();
      } else {
        showToast('Abuurista fasalka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClass = async (id: string, classData: Partial<SchoolClass>) => {
    try {
      const res = await apiFetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      });
      if (res.ok) {
        showToast('Fasalka waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta fasalka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      const res = await apiFetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Fasalka waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista fasalka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddSubject = async (subjectData: Omit<SchoolSubject, 'id' | 'createdAt'>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectData)
      });
      if (res.ok) {
        showToast('Maaddada si guul leh ayaa loo abuuray!', 'success');
        fetchAllData();
      } else {
        showToast('Abuurista maaddada way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubject = async (id: string, subjectData: Partial<SchoolSubject>) => {
    try {
      const res = await apiFetch(`/api/subjects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectData)
      });
      if (res.ok) {
        showToast('Maaddada waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta maaddada way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const res = await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Maaddada waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista maaddada way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddExamScore = async (examData: Omit<ExamScore, 'id' | 'createdAt'>) => {
    if (submitting) return;
    setSubmitting(true);

    if (!navigator.onLine) {
      enqueueOfflineAction('exam_score', '/api/exams', 'POST', examData);
      setExamScores((prev) => [
        { id: 'offline-' + Date.now(), ...examData, createdAt: new Date().toISOString() },
        ...prev
      ]);
      showToast('Offline: Natiijada imtixaanka waxaa lagu kaydiyey qalabkaaga', 'info');
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData)
      });
      if (res.ok) {
        showToast('Natiijada imtixaanka waa la kaydiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Kaydinta natiijada way fashilantay', 'error');
      }
    } catch {
      enqueueOfflineAction('exam_score', '/api/exams', 'POST', examData);
      setExamScores((prev) => [
        { id: 'offline-' + Date.now(), ...examData, createdAt: new Date().toISOString() },
        ...prev
      ]);
      showToast('Offline: Natiijada imtixaanka waxaa lagu kaydiyey qalabkaaga', 'info');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExamScore = async (id: string, examData: Partial<ExamScore>) => {
    if (!navigator.onLine) {
      enqueueOfflineAction('exam_score', `/api/exams/${id}`, 'PUT', examData);
      setExamScores((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...examData } : ex)));
      showToast('Offline: Natiijada waa la cusbooneysiiyey qalabkaaga', 'info');
      return;
    }

    try {
      const res = await apiFetch(`/api/exams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData)
      });
      if (res.ok) {
        showToast('Natiijada waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta natiijada way fashilantay', 'error');
      }
    } catch {
      enqueueOfflineAction('exam_score', `/api/exams/${id}`, 'PUT', examData);
      setExamScores((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...examData } : ex)));
      showToast('Offline: Natiijada waa la cusbooneysiiyey qalabkaaga', 'info');
    }
  };

  const handleDeleteExamScore = async (id: string) => {
    try {
      const res = await apiFetch(`/api/exams/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Natiijada waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista natiijada way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  // People & HR Handlers
  const handleAddTeacher = async (teacherData: Omit<Teacher, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData)
      });
      if (res.ok) {
        showToast('Macallinka si guul leh ayaa loo diiwaangeliyey!', 'success');
        fetchAllData();
      } else {
        showToast('Diiwaangelinta macallinka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleUpdateTeacher = async (id: string, teacherData: Partial<Teacher>) => {
    try {
      const res = await apiFetch(`/api/teachers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData)
      });
      if (res.ok) {
        showToast('Xogta macallinka waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta macallinka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      const res = await apiFetch(`/api/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Macallinka waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista macallinka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddStaff = async (staffData: Omit<StaffMember, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      if (res.ok) {
        showToast('Shaqaalaha si guul leh ayaa loo qoray!', 'success');
        fetchAllData();
      } else {
        showToast('Diiwaangelinta shaqaalaha way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleUpdateStaff = async (id: string, staffData: Partial<StaffMember>) => {
    try {
      const res = await apiFetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      if (res.ok) {
        showToast('Xogta shaqaalaha waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      const res = await apiFetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Shaqaalaha waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddGuardian = async (guardianData: Omit<Guardian, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guardianData)
      });
      if (res.ok) {
        showToast('Waalidka waa la diiwaangeliyey!', 'success');
        fetchAllData();
      } else {
        showToast('Diiwaangelinta waalidka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleUpdateGuardian = async (id: string, guardianData: Partial<Guardian>) => {
    try {
      const res = await apiFetch(`/api/guardians/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guardianData)
      });
      if (res.ok) {
        showToast('Xogta waalidka waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteGuardian = async (id: string) => {
    try {
      const res = await apiFetch(`/api/guardians/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Waalidka waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleSaveStaffAttendance = async (recordsOrDate: any, maybeRecords?: any) => {
    const records = Array.isArray(recordsOrDate) ? recordsOrDate : maybeRecords || [];
    try {
      const res = await apiFetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records)
      });
      if (res.ok) {
        showToast('Xaadirinta shaqaalaha waa la kaydiyey!', 'success');
        const fetchStaffAtt = await apiFetch(
          `/api/staff-attendance?date=${new Date().toISOString().split('T')[0]}`
        );
        if (fetchStaffAtt.ok) {
          setStaffAttendance(await fetchStaffAtt.json());
        }
      } else {
        showToast('Kaydinta xaadiriska shaqaalaha way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  // Operations Handlers
  const handleAddTimetableSlot = async (slotData: Omit<TimetableSlot, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slotData)
      });
      if (res.ok) {
        showToast('Jadwalka xiisadda si guul leh ayaa loo daray!', 'success');
        fetchAllData();
      } else {
        showToast('Ku darista jadwalka way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteTimetableSlot = async (id: string) => {
    try {
      const res = await apiFetch(`/api/timetable/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Xiisadda jadwalka waa la tiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirista way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddAdmission = async (admissionData: Omit<Admission, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admissionData)
      });
      if (res.ok) {
        showToast('Codsiga ardayga cusub waa la diiwaangeliyey!', 'success');
        fetchAllData();
      } else {
        showToast('Diiwaangelinta codsiga way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleUpdateAdmission = async (id: string, admissionData: Partial<Admission>) => {
    try {
      const res = await apiFetch(`/api/admissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admissionData)
      });
      if (res.ok) {
        showToast('Codsiga waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleEnrollApplicant = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admissions/${id}/enroll`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        showToast('Ardayga waxaa si toos ah loogu gudbiyey Diiwaanka Guud!', 'success');
        fetchAllData();
      } else {
        showToast('Gudbinta ardaygu way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteAdmission = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Codsiga waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddBook = async (bookData: Omit<LibraryBook, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/library/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      if (res.ok) {
        showToast('Buugga cusub waa la kaydiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Kaydinta buugga way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleUpdateBook = async (id: string, bookData: Partial<LibraryBook>) => {
    try {
      const res = await apiFetch(`/api/library/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      if (res.ok) {
        showToast('Xogta buugga waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      const res = await apiFetch(`/api/library/books/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Buugga waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleIssueLoan = async (loanData: Omit<LibraryLoan, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/library/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanData)
      });
      if (res.ok) {
        showToast('Buugga waxaa loo dhiibay ardayga!', 'success');
        fetchAllData();
      } else {
        showToast('Dhiibista buugga way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    try {
      const res = await apiFetch(`/api/library/loans/${loanId}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        showToast('Buugga dib ayaa loogu celiyey maktabadda!', 'success');
        fetchAllData();
      } else {
        showToast('Celinta buugga way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddItem = async (itemData: Omit<InventoryItem, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (res.ok) {
        showToast('Qalabka/hantida waa la diiwaangeliyey!', 'success');
        fetchAllData();
      } else {
        showToast('Diiwaangelintu way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleUpdateItem = async (id: string, itemData: Partial<InventoryItem>) => {
    try {
      const res = await apiFetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (res.ok) {
        showToast('Qalabka waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Qalabka waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleAddAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData)
      });
      if (res.ok) {
        showToast('Ogeysiiska waa la daabacay!', 'success');
        fetchAllData();
      } else {
        showToast('Daabacaadda ogeysiiska way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleUpdateAnnouncement = async (id: string, announcementData: Partial<Announcement>) => {
    try {
      const res = await apiFetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData)
      });
      if (res.ok) {
        showToast('Ogeysiiska waa la cusbooneysiiyey!', 'success');
        fetchAllData();
      } else {
        showToast('Cusbooneysiinta way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Ogeysiiska waa la tirtiray!', 'info');
        fetchAllData();
      } else {
        showToast('Tirtirista way fashilantay', 'error');
      }
    } catch {
      showToast('Khalad isku xirka ah', 'error');
    }
  };

  // System Configuration & Backup Handlers
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        if (settings.systemTheme) onSetTheme(settings.systemTheme);
        showToast('Nidaamka iyo qaabaynta si guul leh ayaa loo kaydiyey', 'success');
        fetchDbStatus();
      } else {
        showToast('Qaabaynta waa la kaydin kari waayey', 'error');
      }
    } catch {
      showToast('Khalad isku xirka', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportAllData = () => {
    const backupData = {
      students,
      classes,
      subjects,
      examScores,
      attendance,
      fees,
      settings,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.schoolName.replace(/\s+/g, '_')}_Backup_${
      new Date().toISOString().split('T')[0]
    }.json`;
    a.click();
    showToast('Dhammaan macluumaadka si guul leh ayaa loo dhoofiyey!', 'success');
  };

  const handleImportAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const backup = JSON.parse(content);

        onRequestConfirm({
          title: 'Restore System Backup?',
          message:
            'Soo gelinta xogtani waxay ku dari doontaa dhammaan diiwaanada ku jira backup-ka. Fadlan hubi in faylkani yahay kii saxda ahaa.',
          onConfirm: async () => {
            setSubmitting(true);
            try {
              if (Array.isArray(backup.students)) {
                for (const s of backup.students) {
                  await apiFetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(s)
                  });
                }
              }
              if (Array.isArray(backup.classes)) {
                for (const c of backup.classes) {
                  await apiFetch('/api/classes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(c)
                  });
                }
              }
              if (Array.isArray(backup.subjects)) {
                for (const sub of backup.subjects) {
                  await apiFetch('/api/subjects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sub)
                  });
                }
              }
              if (Array.isArray(backup.examScores)) {
                for (const exam of backup.examScores) {
                  await apiFetch('/api/exams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(exam)
                  });
                }
              }
              if (backup.settings) {
                await apiFetch('/api/settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(backup.settings)
                });
              }

              showToast('Xogtii si guul leh ayaa loo soo celiyey!', 'success');
              fetchAllData();
            } catch {
              showToast('Khalad ayaa ka dhacay soo celinta', 'error');
            } finally {
              setSubmitting(false);
            }
          }
        });
      } catch {
        showToast('Faylka backup-ka ah ma ahan mid sax ah', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    onRequestConfirm({
      title: 'DIGNIIN: Factory Reset',
      message:
        'Tani waxay gabi ahaanba tirtiri doontaa dhammaan ardayda, lacagaha, xaadirinta, iyo qaabaynta! Ma hubtaa?',
      onConfirm: async () => {
        try {
          const res = await apiFetch('/api/reset', { method: 'POST' });
          if (res.ok) {
            showToast('Nidaamka gabi ahaanba waa la nadiifiyey!', 'success');
            onLogout();
          } else {
            showToast('Nadiifintu waa fashilantay', 'error');
          }
        } catch {
          showToast('Khalad isku xirka', 'error');
        }
      }
    });
  };

  const shellBadges = useMemo(
    () => ({
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === 'active').length,
      inactiveStudents: students.filter((s) => s.status === 'inactive').length,
      archivedStudents: students.filter((s) => s.status === 'archived').length,
      unpaidInvoices: fees.filter(
        (f) => f.status === 'unpaid' || f.status === 'partial' || f.amount > f.paidAmount
      ).length,
      pendingAdmissions: admissions.filter((a) => a.status === 'Pending').length
    }),
    [students, fees, admissions]
  );

  return {
    students,
    classes,
    subjects,
    examScores,
    attendance,
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
    fees,
    teachers,
    staff,
    guardians,
    staffAttendance,
    timetable,
    admissions,
    libraryBooks,
    libraryLoans,
    inventory,
    announcements,
    settings,
    setSettings,
    dbStatus,
    loading,
    submitting,
    shellBadges,
    fetchAllData,
    handleApiAddStudent,
    handleApiImportStudents,
    handleApiUpdateStudent,
    handleApiDeleteStudent,
    handleApiBulkUpdate,
    handleAttendanceChange,
    handleMarkAllAttendance,
    handleSaveAttendanceSheet,
    exportAttendanceToPDF,
    handleAddClass,
    handleUpdateClass,
    handleDeleteClass,
    handleAddSubject,
    handleUpdateSubject,
    handleDeleteSubject,
    handleAddExamScore,
    handleUpdateExamScore,
    handleDeleteExamScore,
    handleAddTeacher,
    handleUpdateTeacher,
    handleDeleteTeacher,
    handleAddStaff,
    handleUpdateStaff,
    handleDeleteStaff,
    handleAddGuardian,
    handleUpdateGuardian,
    handleDeleteGuardian,
    handleSaveStaffAttendance,
    handleAddTimetableSlot,
    handleDeleteTimetableSlot,
    handleAddAdmission,
    handleUpdateAdmission,
    handleEnrollApplicant,
    handleDeleteAdmission,
    handleAddBook,
    handleUpdateBook,
    handleDeleteBook,
    handleIssueLoan,
    handleReturnLoan,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
    handleAddAnnouncement,
    handleUpdateAnnouncement,
    handleDeleteAnnouncement,
    handleSaveSettings,
    handleExportAllData,
    handleImportAllData,
    handleFactoryReset
  };
}
