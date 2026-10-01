import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
} from './types';

import { AppShell } from './app/AppShell';
import { AppTabId, FinanceSubSection, PeopleSubSection } from './app/navigationConfig';
import { parseAppLocation, buildWorkspacePath, PublicRouteId } from './app/routeConfig';

import { ExecutiveDashboard } from './features/dashboard/ExecutiveDashboard';
import { AttendanceModule } from './features/attendance/AttendanceModule';
import { SettingsModule } from './features/settings/SettingsModule';
import { AuthView } from './features/auth/AuthView';

import ClassesView from './components/ClassesView';
import SubjectsView from './components/SubjectsView';
import ExamsView from './components/ExamsView';
import ReportsView from './components/ReportsView';
import LandingPage from './components/LandingPage';
import PeopleView from './components/PeopleView';
import StaffAttendanceView from './components/StaffAttendanceView';
import TimetableScheduleView from './components/TimetableScheduleView';
import AdmissionsView from './components/AdmissionsView';
import LibraryView from './components/LibraryView';
import InventoryView from './components/InventoryView';
import AnnouncementsView from './components/AnnouncementsView';
import StudentProfileModal from './components/StudentProfileModal';
import StudentsView, { StudentSubSection } from './components/StudentsView';
import { FinanceView } from './components/FinanceView';
import { TeacherActivationView } from './components/TeacherActivationView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { ConfirmDialog, LoadingState, ToastContainer, ToastItem } from './components/ui/primitives';
import { enqueueOfflineAction } from './utils/offlineSync';

// Intercept fetch calls to inject X-School-Email and Authorization token from authenticated user
const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const userStr = localStorage.getItem('dugsiga_auth');
  let schoolEmail = '';
  let token = '';
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u && u.email) schoolEmail = u.email;
      if (u && u.token) token = u.token;
    } catch {}
  }

  const headers = new Headers(init?.headers);
  if (schoolEmail) headers.set('X-School-Email', schoolEmail);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return window.fetch(input, {
    ...init,
    headers
  });
};

export default function App() {
  const initialRouteState = useMemo(() => {
    if (typeof window === 'undefined') {
      return parseAppLocation('/', '');
    }
    return parseAppLocation(window.location.pathname, window.location.search);
  }, []);

  const [currentRoute, setCurrentRoute] = useState<PublicRouteId>(initialRouteState.publicRoute);
  const [activeTab, setActiveTab] = useState<AppTabId>(initialRouteState.activeTab);
  const [studentSubSection, setStudentSubSection] = useState<StudentSubSection>(
    initialRouteState.studentSubSection
  );
  const [peopleSubSection, setPeopleSubSection] = useState<PeopleSubSection>(
    initialRouteState.peopleSubSection
  );
  const [financeSubSection, setFinanceSubSection] = useState<FinanceSubSection>(
    initialRouteState.financeSubSection
  );

  // Authentication State
  const [user, setUser] = useState<{
    email: string;
    role?: 'admin' | 'teacher' | 'staff';
    schoolId?: string;
    name?: string;
    teacherId?: string;
    assignedClasses?: string[];
    assignedSubjects?: string[];
    token?: string;
  } | null>(() => {
    const saved = localStorage.getItem('dugsiga_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [authView, setAuthView] = useState<'login' | 'signup'>(() =>
    initialRouteState.publicRoute === 'signup' ? 'signup' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Theme State (Intentional Light + Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('dugsiga_theme');
    return (savedTheme as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dugsiga_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Core Application Datasets
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
  const [attendanceDate, setAttendanceDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [fees, setFees] = useState<FeeRecord[]>([]);

  // Extended Institutional Datasets
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
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

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

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
      const id = Math.random().toString(36).slice(2, 11);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Centralized Navigation Handlers
  const navigatePublic = useCallback(
    (route: PublicRouteId) => {
      setCurrentRoute(route);
      if (typeof window === 'undefined') return;
      if (route === 'login') {
        setAuthView('login');
        window.history.pushState({}, '', '/login');
      } else if (route === 'signup') {
        setAuthView('signup');
        window.history.pushState({}, '', '/signup');
      } else if (route === 'dashboard') {
        window.history.pushState({}, '', buildWorkspacePath(activeTab, {
          studentSubSection,
          peopleSubSection,
          financeSubSection
        }));
      } else if (route === 'landing') {
        window.history.pushState({}, '', '/');
      }
    },
    [activeTab, studentSubSection, peopleSubSection, financeSubSection]
  );

  const navigateWorkspace = useCallback(
    (
      tab: AppTabId,
      options?: {
        studentSubSection?: StudentSubSection;
        peopleSubSection?: PeopleSubSection;
        financeSubSection?: FinanceSubSection;
      }
    ) => {
      setCurrentRoute('dashboard');
      setActiveTab(tab);

      const nextStudentSub = options?.studentSubSection ?? (tab === 'students' ? studentSubSection : 'all');
      const nextPeopleSub = options?.peopleSubSection ?? peopleSubSection;
      const nextFinanceSub = options?.financeSubSection ?? financeSubSection;

      if (options?.studentSubSection) setStudentSubSection(options.studentSubSection);
      if (options?.peopleSubSection) setPeopleSubSection(options.peopleSubSection);
      if (options?.financeSubSection) setFinanceSubSection(options.financeSubSection);

      if (typeof window !== 'undefined') {
        const nextUrl = buildWorkspacePath(tab, {
          studentSubSection: nextStudentSub,
          peopleSubSection: nextPeopleSub,
          financeSubSection: nextFinanceSub
        });
        window.history.pushState({}, '', nextUrl);
      }
    },
    [studentSubSection, peopleSubSection, financeSubSection]
  );

  // Sync state with browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAppLocation(window.location.pathname, window.location.search);
      setCurrentRoute(parsed.publicRoute);
      setActiveTab(parsed.activeTab);
      setStudentSubSection(parsed.studentSubSection);
      setPeopleSubSection(parsed.peopleSubSection);
      setFinanceSubSection(parsed.financeSubSection);
      if (parsed.publicRoute === 'login') setAuthView('login');
      if (parsed.publicRoute === 'signup') setAuthView('signup');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch DB diagnostics & core datasets
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        setDbStatus(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch database status:', e);
    }
  };

  const fetchAllData = async () => {
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
        fetch('/api/students'),
        fetch('/api/fees'),
        fetch('/api/settings'),
        fetch('/api/classes'),
        fetch('/api/subjects'),
        fetch('/api/exams'),
        fetch('/api/teachers'),
        fetch('/api/staff'),
        fetch('/api/guardians'),
        fetch('/api/timetable'),
        fetch('/api/admissions'),
        fetch('/api/library/books'),
        fetch('/api/library/loans'),
        fetch('/api/inventory'),
        fetch('/api/announcements')
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
  };

  const fetchAttendanceForDateAndSession = async (
    date: string,
    session: 'before_break' | 'after_break'
  ) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/attendance?date=${date}&session_type=${session}`);
      if (res.ok) {
        setAttendance(await res.json());
      }
    } catch (e) {
      console.error('Failed to load attendance:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAttendanceForDateAndSession(attendanceDate, attendanceSession);
    }
  }, [user, attendanceDate, attendanceSession]);

  useEffect(() => {
    fetchDbStatus();
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Authentication Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Fadlan geli email sax ah iyo password.');
      return;
    }
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authView === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('dugsiga_auth', JSON.stringify(data.user));
          setUser(data.user);
          setCurrentRoute('dashboard');
          window.history.pushState({}, '', '/dashboard');
          showToast('Ku soo dhowow Dugsiga Pro!', 'success');
        } else {
          setAuthError(data.error || 'Login-ku waa fashilmay.');
        }
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          const userObj = { email };
          localStorage.setItem('dugsiga_auth', JSON.stringify(userObj));
          setUser(userObj);
          setCurrentRoute('dashboard');
          window.history.pushState({}, '', '/dashboard');
          showToast('Diiwaangelintu way guuleysatay! Ku soo dhowow Dugsiga Pro!', 'success');
        } else {
          setAuthError(data.error || 'Signup-ku waa fashilmay.');
        }
      }
    } catch {
      setAuthError("Xiriirka serverka ayaa go'an.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dugsiga_auth');
    setUser(null);
    setAuthView('login');
    setCurrentRoute('landing');
    window.history.pushState({}, '', '/');
    setEmail('');
    setPassword('');
    showToast('Si guul leh ayaad uga baxday (Logged Out)');
  };

  // Student API Operations
  const handleApiAddStudent = async (studentData: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      if (res.ok) {
        fetchAllData();
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Hawshu way fashilantay', 'error');
        return false;
      }
    } catch {
      enqueueOfflineAction('student', '/api/students', 'POST', studentData);
      setStudents((prev) => [studentData, ...prev]);
      showToast('Ardayga waxaa lagu keydiyey Offline Sync Queue', 'info');
      return true;
    }
  };

  const handleApiUpdateStudent = async (id: string, updates: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchAllData();
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Cusbooneysiintu way fashilantay', 'error');
        return false;
      }
    } catch {
      enqueueOfflineAction('student', `/api/students/${id}`, 'PUT', updates);
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      showToast('Isbeddelka ardayga waxaa lagu keydiyey Offline Queue', 'info');
      return true;
    }
  };

  const handleApiDeleteStudent = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAllData();
        return true;
      } else {
        showToast('Tirtiriddu way fashilantay', 'error');
        return false;
      }
    } catch {
      enqueueOfflineAction('student', `/api/students/${id}`, 'DELETE', { id });
      setStudents((prev) => prev.filter((s) => s.id !== id));
      showToast('Tirtiridda waxaa lagu keydiyey Offline Queue', 'info');
      return true;
    }
  };

  const handleApiBulkUpdate = async (
    action: string,
    studentIds: string[],
    targetValue?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          studentIds,
          targetClass: action === 'change_class' ? targetValue : undefined,
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
    const recordsToSave = activeStudents.map((s) => {
      const record = attendance.find(
        (a) =>
          a.date === attendanceDate &&
          a.studentId === s.id &&
          (a.sessionType || 'before_break') === attendanceSession
      );
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
      const res = await fetch('/api/attendance', {
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
        fetchAttendanceForDateAndSession(attendanceDate, attendanceSession);
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

  // Academic & Operations CRUD Handlers
  const handleAddClass = async (classData: Omit<SchoolClass, 'id' | 'createdAt'>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/classes', {
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
      const res = await fetch(`/api/classes/${id}`, {
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
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/subjects', {
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
      const res = await fetch(`/api/subjects/${id}`, {
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
      const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/exams', {
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
      const res = await fetch(`/api/exams/${id}`, {
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
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/teachers', {
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
      const res = await fetch(`/api/teachers/${id}`, {
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
      const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/staff', {
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
      const res = await fetch(`/api/staff/${id}`, {
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
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/guardians', {
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
      const res = await fetch(`/api/guardians/${id}`, {
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
      const res = await fetch(`/api/guardians/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records)
      });
      if (res.ok) {
        showToast('Xaadirinta shaqaalaha waa la kaydiyey!', 'success');
        const fetchStaffAtt = await fetch(
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

  // Operations Handlers (Timetable, Admissions, Library, Inventory, Announcements)
  const handleAddTimetableSlot = async (slotData: Omit<TimetableSlot, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/timetable', {
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
      const res = await fetch(`/api/timetable/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/admissions', {
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
      const res = await fetch(`/api/admissions/${id}`, {
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
      const res = await fetch(`/api/admissions/${id}/enroll`, {
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
      const res = await fetch(`/api/admissions/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/library/books', {
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
      const res = await fetch(`/api/library/books/${id}`, {
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
      const res = await fetch(`/api/library/books/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/library/loans', {
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
      const res = await fetch(`/api/library/loans/${loanId}/return`, {
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
      const res = await fetch('/api/inventory', {
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
      const res = await fetch(`/api/inventory/${id}`, {
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
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/announcements', {
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
      const res = await fetch(`/api/announcements/${id}`, {
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
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        if (settings.systemTheme) setTheme(settings.systemTheme);
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

        setConfirmModal({
          isOpen: true,
          title: 'Restore System Backup?',
          message:
            'Soo gelinta xogtani waxay ku dari doontaa dhammaan diiwaanada ku jira backup-ka. Fadlan hubi in faylkani yahay kii saxda ahaa.',
          onConfirm: async () => {
            setSubmitting(true);
            try {
              if (Array.isArray(backup.students)) {
                for (const s of backup.students) {
                  await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(s)
                  });
                }
              }
              if (Array.isArray(backup.classes)) {
                for (const c of backup.classes) {
                  await fetch('/api/classes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(c)
                  });
                }
              }
              if (Array.isArray(backup.subjects)) {
                for (const sub of backup.subjects) {
                  await fetch('/api/subjects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sub)
                  });
                }
              }
              if (Array.isArray(backup.examScores)) {
                for (const exam of backup.examScores) {
                  await fetch('/api/exams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(exam)
                  });
                }
              }
              if (backup.settings) {
                await fetch('/api/settings', {
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
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
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
    setConfirmModal({
      isOpen: true,
      title: 'DIGNIIN: Factory Reset',
      message:
        'Tani waxay gabi ahaanba tirtiri doontaa dhammaan ardayda, lacagaha, xaadirinta, iyo qaabaynta! Ma hubtaa?',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/reset', { method: 'POST' });
          if (res.ok) {
            showToast('Nidaamka gabi ahaanba waa la nadiifiyey!', 'success');
            handleLogout();
          } else {
            showToast('Nadiifintu waa fashilantay', 'error');
          }
        } catch {
          showToast('Khalad isku xirka', 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Sidebar live badges
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

  /* ============================================================================
     1. TEACHER ACTIVATION ROUTE (/activate-teacher)
     ============================================================================ */
  if (currentRoute === 'activate-teacher') {
    const tokenParam =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token') || ''
        : '';
    return (
      <TeacherActivationView
        token={tokenParam}
        onActivatedSuccess={(activatedEmail) => {
          setEmail(activatedEmail);
          navigatePublic('login');
          showToast(
            'Akoonkaaga si guul leh ayaa loo dhaqaajiyey! Fadlan hadda gal.',
            'success'
          );
        }}
        onGoToLogin={() => navigatePublic('login')}
      />
    );
  }

  /* ============================================================================
     2. PUBLIC LANDING PAGE ROUTE (/)
     ============================================================================ */
  if (currentRoute === 'landing') {
    return (
      <LandingPage
        onNavigate={navigatePublic}
        isAuthenticated={!!user}
        userEmail={user?.email}
      />
    );
  }

  /* ============================================================================
     3. UNAUTHENTICATED GATE (LOGIN / SIGNUP)
     ============================================================================ */
  if (!user) {
    return (
      <AuthView
        authView={authView}
        onSwitchAuthView={(view) => {
          setAuthView(view);
          setAuthError('');
          navigatePublic(view);
        }}
        email={email}
        onChangeEmail={setEmail}
        password={password}
        onChangePassword={setPassword}
        authError={authError}
        authLoading={authLoading}
        onSubmit={handleAuthSubmit}
        onBackToLanding={() => navigatePublic('landing')}
        onForgotPassword={() =>
          showToast('Maamulka kala xiriir dib-u-dejinta password-kaaga.', 'info')
        }
        toasts={toasts}
        onDismissToast={dismissToast}
      />
    );
  }

  /* ============================================================================
     4. AUTHENTICATED APPLICATION SHELL & WORKSPACE
     ============================================================================ */
  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <AppShell
        user={user}
        settings={settings}
        dbStatus={dbStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeTab={activeTab}
        studentSubSection={studentSubSection}
        peopleSubSection={peopleSubSection}
        financeSubSection={financeSubSection}
        badges={shellBadges}
        students={students}
        teachers={teachers}
        onNavigate={navigateWorkspace}
        onOpenStudentProfile={(st) => setSelectedStudentForProfile(st)}
        onLogout={handleLogout}
        onSyncComplete={fetchAllData}
      >
        {loading ? (
          <LoadingState label="Synchronizing institutional records..." rows={6} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${studentSubSection}-${peopleSubSection}-${financeSubSection}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {/* OVERVIEW DASHBOARD */}
              {activeTab === 'overview' &&
                (user.role === 'teacher' ? (
                  <TeacherDashboardView
                    user={user as any}
                    students={students}
                    classes={classes}
                    subjects={subjects}
                    onNavigate={(tab) =>
                      navigateWorkspace(tab === 'dashboard' ? 'overview' : (tab as AppTabId))
                    }
                  />
                ) : (
                  <ExecutiveDashboard
                    students={students}
                    attendance={attendance}
                    fees={fees}
                    classes={classes}
                    subjects={subjects}
                    examScores={examScores}
                    teachers={teachers}
                    admissions={admissions}
                    settings={settings}
                    attendanceDate={attendanceDate}
                    attendanceSession={attendanceSession}
                    theme={theme}
                    onNavigate={navigateWorkspace}
                    onOpenStudentProfile={(st) => setSelectedStudentForProfile(st)}
                  />
                ))}

              {/* STUDENTS WORKSPACE */}
              {activeTab === 'students' && (
                <StudentsView
                  students={students}
                  classes={classes}
                  fees={fees}
                  attendance={attendance}
                  examScores={examScores}
                  subjects={subjects}
                  settings={settings}
                  onAddStudent={handleApiAddStudent}
                  onUpdateStudent={handleApiUpdateStudent}
                  onDeleteStudent={handleApiDeleteStudent}
                  onBulkUpdate={handleApiBulkUpdate}
                  onRefreshData={fetchAllData}
                  showToast={showToast}
                  theme={theme}
                  subSection={studentSubSection}
                  onNavigateSubSection={(sub) =>
                    navigateWorkspace('students', { studentSubSection: sub })
                  }
                />
              )}

              {/* ATTENDANCE WORKSPACE */}
              {activeTab === 'attendance' && (
                <AttendanceModule
                  students={students}
                  classes={classes}
                  attendance={attendance}
                  attendanceDate={attendanceDate}
                  onChangeDate={setAttendanceDate}
                  attendanceSession={attendanceSession}
                  onChangeSession={setAttendanceSession}
                  selectedClass={selectedAttendanceClass}
                  onChangeClass={setSelectedAttendanceClass}
                  subTab={attendanceSubTab}
                  onChangeSubTab={setAttendanceSubTab}
                  historyStudentId={historyStudentId}
                  onChangeHistoryStudentId={setHistoryStudentId}
                  onAttendanceChange={handleAttendanceChange}
                  onMarkAllAttendance={handleMarkAllAttendance}
                  onSaveSheet={handleSaveAttendanceSheet}
                  onExportPDF={exportAttendanceToPDF}
                  submitting={submitting}
                />
              )}

              {/* FINANCE & BILLING SUITE */}
              {activeTab === 'fees' && (
                <FinanceView
                  students={students}
                  classes={classes}
                  teachers={teachers}
                  staff={staff}
                  currency={settings.currency}
                  schoolName={settings.schoolName}
                  subSection={financeSubSection}
                  onNavigateSubSection={(sub) =>
                    navigateWorkspace('fees', { financeSubSection: sub })
                  }
                />
              )}

              {/* REPORTS CENTER */}
              {activeTab === 'reports' && (
                <ReportsView
                  students={students}
                  classes={classes}
                  subjects={subjects}
                  examScores={examScores}
                  attendance={attendance}
                  fees={fees}
                  theme={theme}
                />
              )}

              {/* CLASSES */}
              {activeTab === 'classes' && (
                <ClassesView
                  classes={classes}
                  students={students}
                  onAddClass={handleAddClass}
                  onUpdateClass={handleUpdateClass}
                  onDeleteClass={handleDeleteClass}
                  theme={theme}
                />
              )}

              {/* SUBJECTS */}
              {activeTab === 'subjects' && (
                <SubjectsView
                  subjects={subjects}
                  classes={classes}
                  onAddSubject={handleAddSubject}
                  onUpdateSubject={handleUpdateSubject}
                  onDeleteSubject={handleDeleteSubject}
                  theme={theme}
                />
              )}

              {/* EXAMS */}
              {activeTab === 'exams' && (
                <ExamsView
                  examScores={examScores}
                  students={students}
                  subjects={subjects}
                  classes={classes}
                  onAddExamScore={handleAddExamScore}
                  onUpdateExamScore={handleUpdateExamScore}
                  onDeleteExamScore={handleDeleteExamScore}
                  theme={theme}
                />
              )}

              {/* PEOPLE & HR */}
              {activeTab === 'people' && (
                <PeopleView
                  teachers={teachers}
                  staff={staff}
                  guardians={guardians}
                  classes={classes}
                  subjects={subjects}
                  students={students}
                  onAddTeacher={handleAddTeacher}
                  onUpdateTeacher={handleUpdateTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  onAddStaff={handleAddStaff}
                  onUpdateStaff={handleUpdateStaff}
                  onDeleteStaff={handleDeleteStaff}
                  onAddGuardian={handleAddGuardian}
                  onUpdateGuardian={handleUpdateGuardian}
                  onDeleteGuardian={handleDeleteGuardian}
                  currency={settings.currency}
                  theme={theme}
                  showToast={showToast}
                  subSection={peopleSubSection}
                  onNavigateSubSection={(sub) =>
                    navigateWorkspace('people', { peopleSubSection: sub })
                  }
                />
              )}

              {/* STAFF ATTENDANCE */}
              {activeTab === 'staff_attendance' && (
                <StaffAttendanceView
                  staff={staff}
                  teachers={teachers}
                  records={staffAttendance}
                  onSaveAttendance={handleSaveStaffAttendance}
                  theme={theme}
                />
              )}

              {/* TIMETABLE */}
              {activeTab === 'timetable' && (
                <TimetableScheduleView
                  timetable={timetable}
                  classes={classes}
                  subjects={subjects}
                  teachers={teachers}
                  onAddSlot={handleAddTimetableSlot}
                  onDeleteSlot={handleDeleteTimetableSlot}
                  theme={theme}
                />
              )}

              {/* ADMISSIONS */}
              {activeTab === 'admissions' && (
                <AdmissionsView
                  admissions={admissions}
                  classes={classes}
                  onAddAdmission={handleAddAdmission}
                  onUpdateAdmission={handleUpdateAdmission}
                  onEnrollApplicant={handleEnrollApplicant}
                  onDeleteAdmission={handleDeleteAdmission}
                  theme={theme}
                />
              )}

              {/* LIBRARY */}
              {activeTab === 'library' && (
                <LibraryView
                  books={libraryBooks}
                  loans={libraryLoans}
                  students={students}
                  onAddBook={handleAddBook}
                  onUpdateBook={handleUpdateBook}
                  onDeleteBook={handleDeleteBook}
                  onIssueLoan={handleIssueLoan}
                  onReturnLoan={handleReturnLoan}
                  theme={theme}
                />
              )}

              {/* INVENTORY */}
              {activeTab === 'inventory' && (
                <InventoryView
                  items={inventory}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                  theme={theme}
                />
              )}

              {/* ANNOUNCEMENTS */}
              {activeTab === 'announcements' && (
                <AnnouncementsView
                  announcements={announcements}
                  classes={classes}
                  onAddAnnouncement={handleAddAnnouncement}
                  onUpdateAnnouncement={handleUpdateAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  theme={theme}
                  showToast={showToast}
                />
              )}

              {/* SETTINGS */}
              {activeTab === 'settings' && (
                <SettingsModule
                  settings={settings}
                  onChangeSettings={setSettings}
                  onSaveSettings={handleSaveSettings}
                  students={students}
                  classes={classes}
                  subjects={subjects}
                  examScores={examScores}
                  dbStatus={dbStatus}
                  onExportAllData={handleExportAllData}
                  onImportAllData={handleImportAllData}
                  onFactoryReset={handleFactoryReset}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </AppShell>

      {/* GLOBAL 360° STUDENT PROFILE MODAL (Triggered from Dashboard or Command Search) */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          classes={classes}
          fees={fees}
          attendance={attendance}
          examScores={examScores}
          subjects={subjects}
          currency={settings.currency}
          onClose={() => setSelectedStudentForProfile(null)}
          theme={theme}
        />
      )}

      {/* GLOBAL CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
