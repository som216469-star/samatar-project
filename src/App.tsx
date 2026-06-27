import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit2, 
  Clock, 
  Save, 
  CheckCircle, 
  Info, 
  Search, 
  X, 
  Download, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  Database, 
  Sun, 
  Moon, 
  FileText, 
  Calendar, 
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Mail,
  Lock,
  Copy,
  Terminal,
  Activity,
  BookOpen,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

import { Student, AttendanceRecord, FeeRecord, SystemSettings, DbStatus, SchoolClass, SchoolSubject, ExamScore } from './types';
import ClassesView from './components/ClassesView';
import SubjectsView from './components/SubjectsView';
import ExamsView from './components/ExamsView';
import ReportsView from './components/ReportsView';

export default function App() {
  // Authentication State
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const saved = localStorage.getItem('dugsiga_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [authView, setAuthView] = useState<'login' | 'signup' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // App Layout & Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'attendance' | 'fees' | 'reports' | 'settings' | 'classes' | 'subjects' | 'exams'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('dugsiga_theme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  // Core App Data
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [examScores, setExamScores] = useState<ExamScore[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSession, setAttendanceSession] = useState<'before_break' | 'after_break'>('before_break');
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    schoolName: "Dugsiga Pro 2026",
    currency: "USD",
    feeAmount: 50,
    systemTheme: "light"
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

  // Search and Filters
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modals & Forms State
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    class: '',
    gender: 'Male',
    guardianPhone: '',
    status: 'active' as 'active' | 'inactive'
  });

  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [feeForm, setFeeForm] = useState({
    studentId: '',
    month: 'January',
    year: new Date().getFullYear(),
    amount: 50,
    paidAmount: 0
  });

  const [showHistoryModal, setShowHistoryModal] = useState<FeeRecord | null>(null);

  // Toast Notifications
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Setup Theme class on document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dugsiga_theme', theme);
  }, [theme]);

  // Refresh DB diagnostics and fetch system configurations
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch database status:", e);
    }
  };

  // Fetch all core datasets from server
  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [resStudents, resFees, resSettings, resClasses, resSubjects, resExams] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/fees'),
        fetch('/api/settings'),
        fetch('/api/classes'),
        fetch('/api/subjects'),
        fetch('/api/exams')
      ]);

      if (resStudents.ok) setStudents(await resStudents.json());
      if (resFees.ok) setFees(await resFees.json());
      if (resClasses.ok) setClasses(await resClasses.json());
      if (resSubjects.ok) setSubjects(await resSubjects.json());
      if (resExams.ok) setExamScores(await resExams.json());
      if (resSettings.ok) {
        const s = await resSettings.json();
        setSettings(s);
        // Sync layout theme with saved settings if configured
        if (s.systemTheme) setTheme(s.systemTheme);
      }
    } catch (e) {
      showToast("Xogta laguma soo rari karo serverka", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDateAndSession = async (date: string, session: 'before_break' | 'after_break') => {
    if (!user) return;
    try {
      const res = await fetch(`/api/attendance?date=${date}&session_type=${session}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
      }
    } catch (e) {
      console.error("Failing to load attendance:", e);
    }
  };

  // Reactively load attendance when date or session type changes
  useEffect(() => {
    if (user) {
      fetchAttendanceForDateAndSession(attendanceDate, attendanceSession);
    }
  }, [user, attendanceDate, attendanceSession]);

  // Fetch data on authentication or refresh
  useEffect(() => {
    fetchDbStatus();
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Auth Operations
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
          showToast("Ku soo dhowow Dugsiga Pro!", "success");
        } else {
          setAuthError(data.error || "Login-ku waa fashilmay.");
          if (data.unverified) {
            setAuthView('verify');
          }
        }
      } else if (authView === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          setAuthView('verify');
          showToast("Koodhka xaqiijinta ayaa loo soo diray emailkaaga!", "info");
        } else {
          setAuthError(data.error || "Signup-ku waa fashilmay.");
        }
      }
    } catch (err) {
      setAuthError("Xiriirka serverka ayaa go'an.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setAuthError('Fadlan qor koodhka 6-da god ah.');
      return;
    }
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Xaqiijinta way guuleysatay! Hadda waad geli kartaa.", "success");
        setAuthView('login');
        setPassword('');
        setVerificationCode('');
      } else {
        setAuthError(data.error || "Verification code waa qalad.");
      }
    } catch (err) {
      setAuthError("Xiriirka fashilmay.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dugsiga_auth');
    setUser(null);
    setAuthView('login');
    setEmail('');
    setPassword('');
    showToast("Si guul leh ayaad uga baxday (Logged Out)");
  };

  // Student Operations
  const handleStudentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!studentForm.fullName || !studentForm.class) {
      showToast("Fadlan qor Magaca iyo Class-ka", "warning");
      return;
    }

    setSubmitting(true);
    const payload = editingStudent 
      ? { ...studentForm, id: editingStudent.id, createdAt: editingStudent.createdAt }
      : { 
          ...studentForm, 
          id: 'std-' + Math.random().toString(36).substr(2, 9), 
          createdAt: new Date().toISOString().split('T')[0] 
        };

    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingStudent ? "Xogta ardayga waa la cusbooneysiiyey" : "Arday cusub ayaa lagu daray", "success");
        setShowStudentModal(false);
        setEditingStudent(null);
        setStudentForm({ fullName: '', class: '', gender: 'Male', guardianPhone: '', status: 'active' });
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.error || "Hawshu way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad ayaa dhacay inta hawshu socotay", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Tirtir Ardayga",
      message: "Ma hubtaa inaad tirtirto ardaygan iyo dhammaan macluumaadkiisa (lacagaha, xaadirinta)? Tani dib looma soo celin karo.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast("Ardaygii si guul leh ayaa loo tirtiray", "success");
            fetchAllData();
          } else {
            showToast("Tirtiriddu way fashilantay", "error");
          }
        } catch (e) {
          showToast("Khalad ayaa ka dhacay isku xirka", "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Attendance Operations
  const handleAttendanceChange = (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    const existingIdx = attendance.findIndex(a => a.date === attendanceDate && a.studentId === studentId);
    let updatedAttendance = [...attendance];

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
        timestamp: new Date().toISOString()
      });
    }
    setAttendance(updatedAttendance);
  };

  const handleMarkAllAttendance = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    const activeStudents = students.filter(s => s.status === 'active');
    let updatedAttendance = [...attendance];

    activeStudents.forEach(s => {
      const idx = updatedAttendance.findIndex(a => a.date === attendanceDate && a.studentId === s.id);
      if (idx > -1) {
        updatedAttendance[idx] = { ...updatedAttendance[idx], status, timestamp: new Date().toISOString() };
      } else {
        updatedAttendance.push({ date: attendanceDate, studentId: s.id, status, timestamp: new Date().toISOString() });
      }
    });

    setAttendance(updatedAttendance);
    showToast(`Dhammaan ardayda waxaa loo calaamadeeyey: ${status}`, "info");
  };

  const handleSaveAttendanceSheet = async () => {
    if (submitting) return;
    const activeStudents = students.filter(s => s.status === 'active');
    const recordsToSave = activeStudents.map(s => {
      const record = attendance.find(a => a.date === attendanceDate && a.studentId === s.id);
      return {
        studentId: s.id,
        status: record ? record.status : 'Present',
        timestamp: record ? record.timestamp : new Date().toISOString()
      };
    });

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
        showToast(`Xaadirinta taariikhda ${attendanceDate} (${attendanceSession === 'before_break' ? 'Break-ka ka Hor' : 'Break-ka ka Dib'}) si guul leh ayaa loo kaydiyey!`, "success");
        fetchAttendanceForDateAndSession(attendanceDate, attendanceSession);
      } else {
        showToast("Xaadirinta la kaydin kari waayey", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Classes Operations
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
        showToast("Fasalka si guul leh ayaa loo abuuray!", "success");
        fetchAllData();
      } else {
        showToast("Abuurista fasalka way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
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
        showToast("Fasalka waa la cusbooneysiiyey!", "success");
        fetchAllData();
      } else {
        showToast("Cusbooneysiinta fasalka way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Fasalka waa la tirtiray!", "info");
        fetchAllData();
      } else {
        showToast("Tirtirista fasalka way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    }
  };

  // Subjects Operations
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
        showToast("Maaddada si guul leh ayaa loo abuuray!", "success");
        fetchAllData();
      } else {
        showToast("Abuurista maaddada way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
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
        showToast("Maaddada waa la cusbooneysiiyey!", "success");
        fetchAllData();
      } else {
        showToast("Cusbooneysiinta maaddada way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const res = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Maaddada waa la tirtiray!", "info");
        fetchAllData();
      } else {
        showToast("Tirtirista maaddada way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    }
  };

  // Exam Scores Operations
  const handleAddExamScore = async (examData: Omit<ExamScore, 'id' | 'createdAt'>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData)
      });
      if (res.ok) {
        showToast("Natiijada imtixaanka waa la kaydiyey!", "success");
        fetchAllData();
      } else {
        showToast("Kaydinta natiijada way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExamScore = async (id: string, examData: Partial<ExamScore>) => {
    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData)
      });
      if (res.ok) {
        showToast("Natiijada waa la cusbooneysiiyey!", "success");
        fetchAllData();
      } else {
        showToast("Cusbooneysiinta natiijada way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    }
  };

  const handleDeleteExamScore = async (id: string) => {
    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Natiijada waa la tirtiray!", "info");
        fetchAllData();
      } else {
        showToast("Tirtirista natiijada way fashilantay", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka ah", "error");
    }
  };

  // Fee Invoice Operations
  const handleFeeFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!feeForm.studentId) {
      showToast("Fadlan dooro ardayga", "warning");
      return;
    }

    setSubmitting(true);
    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (feeForm.paidAmount >= feeForm.amount) status = 'paid';
    else if (feeForm.paidAmount > 0) status = 'partial';

    const timestamp = new Date().toISOString();
    const payload = editingFee 
      ? {
          ...editingFee,
          month: feeForm.month,
          year: Number(feeForm.year),
          amount: Number(feeForm.amount),
          paidAmount: Number(feeForm.paidAmount),
          status,
          updatedAt: timestamp,
          history: [
            ...editingFee.history,
            { action: `Cusbooneysiin / Lacag bixin: ${settings.currency} ${feeForm.paidAmount}`, amount: Number(feeForm.paidAmount), date: timestamp }
          ]
        }
      : {
          id: 'fee-' + Math.random().toString(36).substr(2, 9),
          studentId: feeForm.studentId,
          month: feeForm.month,
          year: Number(feeForm.year),
          amount: Number(feeForm.amount),
          paidAmount: Number(feeForm.paidAmount),
          status,
          createdAt: timestamp,
          updatedAt: timestamp,
          history: [{ action: "Invoice la abuuray", amount: Number(feeForm.amount), date: timestamp }]
        };

    try {
      const url = editingFee ? `/api/fees/${editingFee.id}` : '/api/fees';
      const method = editingFee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingFee ? "Invoice-ka waa la cusbooneysiiyey" : "Invoice lacageed cusub ayaa la abuuray", "success");
        setShowFeeModal(false);
        setEditingFee(null);
        setFeeForm({ studentId: '', month: 'January', year: new Date().getFullYear(), amount: settings.feeAmount, paidAmount: 0 });
        fetchAllData();
      } else {
        showToast("Invoice la abuurikari waayey", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFee = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Tirtir Biilka",
      message: "Ma hubtaa inaad tirtirto biilkan lacageed? Tani dib looma soo celin karo.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/fees/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast("Biilkii si guul leh ayaa loo tirtiray", "success");
            fetchAllData();
          } else {
            showToast("Biilka tirtiridiisa waa fashilantay", "error");
          }
        } catch (e) {
          showToast("Isku xirka waa fashilmay", "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Settings & Reset
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
        showToast("Nidaamka iyo qaabaynta si guul leh ayaa loo kaydiyey", "success");
        fetchDbStatus();
      } else {
        showToast("Qaabaynta waa la kaydin kari waayey", "error");
      }
    } catch (e) {
      showToast("Khalad isku xirka", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFactoryReset = () => {
    setConfirmModal({
      isOpen: true,
      title: "DIGNIIN: Factory Reset",
      message: "Tani waxay gabi ahaanba tirtiri doontaa dhammaan ardayda, lacagaha, xaadirinta, iyo qaabaynta! Ma hubtaa?",
      onConfirm: async () => {
        try {
          const res = await fetch('/api/reset', { method: 'POST' });
          if (res.ok) {
            showToast("Nidaamka gabi ahaanba waa la nadiifiyey!", "success");
            handleLogout();
          } else {
            showToast("Nadiifintu waa fashilantay", "error");
          }
        } catch (e) {
          showToast("Khalad isku xirka", "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("SQL script si guul leh ayaa loo koobiyeeyay!", "info");
  };

  // Local Helpers for Analytics
  const activeStudents = students.filter(s => s.status === 'active');
  const totalStudentsCount = students.length;
  const activeStudentsCount = activeStudents.length;

  let totalCollectedFees = 0;
  let totalPendingFees = 0;
  fees.forEach(f => {
    totalCollectedFees += Number(f.paidAmount || 0);
    totalPendingFees += Math.max(0, Number(f.amount || 0) - Number(f.paidAmount || 0));
  });

  // Prepare chart datasets
  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const barChartData = monthsList.slice(0, 6).map(monthName => {
    const monthFees = fees.filter(f => f.month === monthName);
    let collected = 0;
    let pending = 0;
    monthFees.forEach(f => {
      collected += Number(f.paidAmount || 0);
      pending += Math.max(0, Number(f.amount || 0) - Number(f.paidAmount || 0));
    });
    return {
      name: monthName.substring(0, 3),
      Collected: collected,
      Pending: pending
    };
  });

  const getTodayAttendanceStats = () => {
    const todayRecords = attendance.filter(a => a.date === attendanceDate);
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    todayRecords.forEach(r => {
      if (r.status === 'Present') present++;
      else if (r.status === 'Absent') absent++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'Excused') excused++;
    });

    const unrecorded = Math.max(0, activeStudentsCount - todayRecords.length);

    return [
      { name: 'Present', value: present, color: '#10b981' },
      { name: 'Absent', value: absent, color: '#ef4444' },
      { name: 'Late', value: late, color: '#f59e0b' },
      { name: 'Excused', value: excused, color: '#3b82f6' },
      { name: 'Unrecorded', value: unrecorded, color: '#94a3b8' }
    ].filter(v => v.value > 0);
  };

  const attendanceChartData = getTodayAttendanceStats();

  // Export File Generators
  const downloadJSON = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${filename} si guul leh ayaa loo soo degsaday!`, "success");
  };

  /* ==============================================
     UNAUTHENTICATED GATE (LOGIN / SIGNUP / VERIFY)
     ============================================== */
  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] text-[#e5e5e5] flex flex-col font-sans overflow-x-hidden relative">
        {/* Background glow violet blur */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7c3aed] blur-[120px] rounded-full"></div>
        </div>

        {/* Toast List */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map(t => (
            <div key={t.id} className={`p-4 rounded-sm shadow-2xl flex items-center gap-3 border text-xs font-medium bg-[#0f0f0f] border-[#ffffff10] ${
              t.type === 'success' ? 'text-emerald-400' :
              t.type === 'error' ? 'text-rose-400' :
              t.type === 'warning' ? 'text-amber-400' :
              'text-[#c4b5fd]'
            }`}>
              {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {t.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-[#c4b5fd] shrink-0" />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>

        {/* Header/Nav */}
        <nav className="flex justify-between items-center px-6 md:px-12 py-8 border-b border-[#ffffff10] z-10 bg-[#0a0a0a]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#c4b5fd] to-[#7c3aed] rounded-sm flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0a0a0a]" />
            </div>
            <span className="text-xl tracking-[0.2em] font-light uppercase">Atlas Auth</span>
          </div>
          <div className="flex items-center gap-4 md:gap-8">
            <span className="text-[10px] uppercase tracking-widest text-[#737373] hidden sm:inline">
              Supabase Instance: mdvfc...
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[11px] uppercase tracking-wider">System Active</span>
            </div>
          </div>
        </nav>

        {/* Main Content split column layout */}
        <main className="flex-1 flex flex-col lg:flex-row z-10">
          {/* Left Column (7/12 width equivalent) */}
          <div className="w-full lg:w-7/12 p-8 md:p-16 lg:p-20 flex flex-col justify-center relative border-b lg:border-b-0 lg:border-r border-[#ffffff10]">
            <h1 className="text-[52px] md:text-[72px] lg:text-[80px] leading-[0.9] font-serif italic mb-6 text-[#f5f5f5]">
              Modern<br />Security.
            </h1>
            <p className="text-sm md:text-lg text-[#a3a3a3] leading-relaxed max-w-md">
              Connected to live Supabase backend. Secure your application with real-time authentication and cloud-hosted data management.
            </p>
            
            <div className="mt-12 md:mt-16 grid grid-cols-2 gap-6 md:gap-8">
              <div className="border-l border-[#ffffff20] pl-6">
                <span className="block text-[11px] uppercase tracking-widest text-[#737373] mb-1">Database Status</span>
                <span className="text-base md:text-lg font-mono text-[#e5e5e5]">
                  {dbStatus ? (dbStatus.fallbackMode ? 'Online Backup' : 'Online (v2.4.0)') : 'Checking...'}
                </span>
              </div>
              <div className="border-l border-[#ffffff20] pl-6">
                <span className="block text-[11px] uppercase tracking-widest text-[#737373] mb-1">SMTP Server</span>
                <span className="text-base md:text-lg font-mono text-[#e5e5e5] truncate max-w-[140px] md:max-w-xs block">
                  {email ? (email.length > 20 ? email.substring(0, 18) + '...' : email) : 'Som... @gmail.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (5/12 width equivalent) */}
          <div className="w-full lg:w-5/12 bg-[#0f0f0f] flex flex-col justify-center px-6 md:px-16 py-12 md:py-16">
            <div className="w-full max-w-sm mx-auto">
              {authView !== 'verify' ? (
                <>
                  <div className="flex gap-8 mb-12 border-b border-[#ffffff10]">
                    <button 
                      onClick={() => { setAuthView('login'); setAuthError(''); }}
                      className={`text-sm uppercase tracking-widest font-semibold pb-2 transition-all ${
                        authView === 'login' 
                          ? 'border-b-2 border-[#7c3aed] text-[#e5e5e5]' 
                          : 'text-[#737373] hover:text-[#e5e5e5]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => { setAuthView('signup'); setAuthError(''); }}
                      className={`text-sm uppercase tracking-widest font-semibold pb-2 transition-all ${
                        authView === 'signup' 
                          ? 'border-b-2 border-[#7c3aed] text-[#e5e5e5]' 
                          : 'text-[#737373] hover:text-[#e5e5e5]'
                      }`}
                    >
                      Register
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-6">
                    {authError && (
                      <div className="p-3 rounded-sm bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-[#737373]">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@atlas.com" 
                        className="w-full bg-transparent border-b border-[#ffffff20] py-3 text-lg text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed] transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-[#737373]">Security Password</label>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-transparent border-b border-[#ffffff20] py-3 text-lg text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed] transition-colors"
                      />
                    </div>

                    <div className="mt-12 flex items-center justify-between">
                      <a href="#" onClick={(e) => { e.preventDefault(); showToast("Maamulka kala xiriir password-kaaga.", "info"); }} className="text-xs text-[#737373] hover:text-[#e5e5e5] underline underline-offset-4 transition-colors">
                        Forgot Key?
                      </a>
                      <button 
                        type="submit"
                        disabled={authLoading}
                        className="bg-[#e5e5e5] text-[#0a0a0a] px-8 py-3 rounded-sm font-semibold uppercase text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-50"
                      >
                        {authLoading ? 'Authenticating...' : 'Authenticate'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-10">
                    <span className="text-[11px] uppercase tracking-wider text-[#7c3aed] font-semibold">Verification</span>
                    <h2 className="text-xl font-bold text-[#f5f5f5] mt-1">Geli Koodhka Xaqiijinta</h2>
                    <p className="text-xs text-[#737373] mt-2 leading-relaxed">
                      Koodhka xaqiijinta (OTP) waxaa loo soo diray emailkaaga. Fadlan ku qor 6-da god hoose si loo hubiyo akoonkaaga.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyCodeSubmit} className="space-y-6">
                    {authError && (
                      <div className="p-3 rounded-sm bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-[#737373] block text-center">Koodhka OTP (6-digit)</label>
                      <input 
                        type="text" 
                        maxLength={6}
                        required
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456" 
                        className="w-full bg-transparent border-b border-[#ffffff20] py-3 text-center text-2xl font-mono tracking-[0.5em] text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed] transition-colors"
                      />
                    </div>

                    <div className="mt-12 flex items-center justify-between">
                      <button 
                        type="button"
                        onClick={() => { setAuthView('signup'); setAuthError(''); }}
                        className="text-xs text-[#737373] hover:text-[#e5e5e5] underline underline-offset-4 transition-colors"
                      >
                        Back to Signup
                      </button>
                      <button 
                        type="submit"
                        disabled={authLoading}
                        className="bg-[#e5e5e5] text-[#0a0a0a] px-8 py-3 rounded-sm font-semibold uppercase text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-50"
                      >
                        {authLoading ? 'Verifying...' : 'Verify Key'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Backend Metadata details matching design */}
              <div className="mt-20 p-4 border border-[#ffffff10] rounded-sm bg-[#ffffff05]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] uppercase tracking-widest text-[#a3a3a3]">Backend Metadata</span>
                </div>
                <p className="text-[9px] font-mono text-[#525252] break-all leading-normal">
                  SUPABASE_URL: {dbStatus?.supabaseUrl || 'mdvfcqujqjnvfpzowayo.supabase.co'}<br />
                  SMTP_HOST: smtp.gmail.com:587
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-6 border-t border-[#ffffff10] flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-[#525252] uppercase tracking-[0.2em] bg-[#0a0a0a]">
          <div>&copy; 2026 Atlas Infrastructure</div>
          <div className="flex gap-4 md:gap-8 flex-wrap justify-center">
            <span>Global Scale</span>
            <span>Encrypted Handshake</span>
            <span>Cloud Sync Active</span>
          </div>
        </footer>
      </div>
    );
  }

  /* ==============================================
     AUTHENTICATED APPLICATION LAYOUT
     ============================================== */
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0a0a] text-[#e5e5e5]">
      
      {/* Toast List */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`p-4 rounded-sm shadow-2xl flex items-center gap-3 border text-xs font-medium animate-slide-in bg-[#0f0f0f] border-[#ffffff10] ${
            t.type === 'success' ? 'text-emerald-400' :
            t.type === 'error' ? 'text-rose-400' :
            t.type === 'warning' ? 'text-amber-400' :
            'text-[#c4b5fd]'
          }`}>
            {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {t.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-[#c4b5fd] shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar - Desktop & Mobile styled with Sophisticated Dark */}
      <aside className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-[#ffffff10] bg-[#0a0a0a] flex flex-col transition-transform duration-300 shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#ffffff10] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#c4b5fd] to-[#7c3aed] rounded-sm flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0a0a0a]" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-widest uppercase font-display text-[#f5f5f5] truncate max-w-[140px]">
                {settings.schoolName}
              </h2>
              <span className="text-[10px] text-[#737373] font-medium tracking-wider uppercase font-mono">Dugsiga Portal</span>
            </div>
          </div>
          <button className="md:hidden p-1 rounded-sm hover:bg-[#ffffff05]" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-[#737373]" />
          </button>
        </div>

        {/* Sidebar Navigation with sleek indicators */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'classes', label: 'Fasallada / Classes', icon: ShieldCheck },
            { id: 'subjects', label: 'Maddooyinka / Subjects', icon: BookOpen },
            { id: 'students', label: 'Ardayda / Students', icon: Users },
            { id: 'attendance', label: 'Xaadirinta / Attendance', icon: Calendar },
            { id: 'exams', label: 'Natiijooyinka / Exams', icon: Award },
            { id: 'fees', label: 'Lacagaha / Finance', icon: DollarSign },
            { id: 'reports', label: 'Warbixino / Reports', icon: FileText },
            { id: 'settings', label: 'Qaabaynta / Settings', icon: SettingsIcon },
          ].map(tab => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all duration-150 ${
                  isSelected 
                    ? 'bg-[#ffffff05] border-l-2 border-[#7c3aed] text-[#e5e5e5]' 
                    : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff02]'
                }`}
              >
                <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#c4b5fd]' : 'text-[#737373]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#ffffff10] bg-[#0f0f0f]">
          <div className="flex items-center gap-3 mb-4 truncate">
            <div className="w-9 h-9 rounded-sm bg-[#ffffff05] border border-[#ffffff10] flex items-center justify-center text-[#e5e5e5] font-bold text-xs font-mono uppercase">
              {user.email.substring(0, 2)}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-[#e5e5e5] truncate">{user.email}</p>
              <p className="text-[10px] text-[#737373] font-medium uppercase font-mono">Admin</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm border border-[#ffffff10] text-[10px] uppercase tracking-wider font-bold text-rose-400 hover:bg-[#ef444410] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ka Bax (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#ffffff10] px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 rounded-sm border border-[#ffffff10] text-[#e5e5e5] hover:bg-[#ffffff05]" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#737373]">Database:</span>
              {dbStatus ? (
                dbStatus.fallbackMode ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-semibold tracking-wider uppercase bg-[#ffffff05] border border-[#ffffff10] text-[#a3a3a3]">
                    <Database className="w-3 h-3 text-amber-500" /> Supabase Backup Fallback
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-semibold tracking-wider uppercase bg-[#ffffff05] border border-[#ffffff10] text-[#e5e5e5]">
                    <Database className="w-3 h-3 text-[#c4b5fd]" /> Supabase Connected
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-semibold tracking-wider uppercase bg-[#ffffff05] border border-[#ffffff10] text-[#737373]">
                  <Database className="w-3 h-3 animate-spin" /> Checking...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono tracking-widest uppercase text-[#737373] bg-[#ffffff02] px-3 py-1.5 rounded-sm border border-[#ffffff05]">
              UTC: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Dashboard Pages */}
        <main className="p-6 md:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* Warning Banner for Local Fallback Setup */}
          {dbStatus && dbStatus.fallbackMode && (
            <div className="mb-6 p-4 rounded-sm bg-amber-500/5 border border-amber-500/15 text-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Online database setup recommended</h4>
                  <p className="text-[11px] text-[#a3a3a3] mt-0.5 leading-relaxed">
                    We detected that your Supabase tables have not been fully created yet. Create your tables online in 5 seconds to run securely.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2 bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] font-semibold text-[10px] uppercase tracking-widest rounded-sm shadow-md transition-colors shrink-0"
              >
                View SQL Script
              </button>
            </div>
          )}

          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
              <Database className="w-10 h-10 text-[#7c3aed] animate-bounce" />
              <p className="text-xs text-[#737373] uppercase tracking-wider font-medium">Soo raraya xogta iskuulka...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {/* Greeting Head */}
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold font-serif italic tracking-tight text-[#f5f5f5]">Dashboard Overview</h1>
                    <p className="text-[11px] uppercase tracking-widest text-[#737373] mt-1">Nidaamka falanqaynta iyo macluumaadka guud ee {settings.schoolName}</p>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: "Total Students", val: totalStudentsCount, icon: Users, colorClass: "text-[#c4b5fd]" },
                      { label: "Active Students", val: activeStudentsCount, icon: UserCheck, colorClass: "text-[#7c3aed]" },
                      { label: "Collected Fees", val: `${settings.currency} ${totalCollectedFees.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: DollarSign, colorClass: "text-[#c4b5fd]" },
                      { label: "Pending Invoices", val: `${settings.currency} ${totalPendingFees.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: AlertCircle, colorClass: "text-[#ef4444]" },
                    ].map((m, i) => {
                      const Icon = m.icon;
                      return (
                        <div key={i} className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-widest text-[#737373] font-semibold">{m.label}</span>
                            <div className="text-2xl font-bold text-[#f5f5f5] font-mono">
                              {m.val}
                            </div>
                          </div>
                          <div className={`p-3 rounded-sm bg-[#ffffff05] border border-[#ffffff10] ${m.colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Bar Chart Financial */}
                    <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 lg:col-span-2">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-serif italic text-lg text-[#f5f5f5]">Revenue & Invoicing Trend</h3>
                          <p className="text-[10px] uppercase tracking-widest text-[#737373] mt-0.5">Barbardhiga dakhliga la ururiyey iyo kan dhiman (6 Month)</p>
                        </div>
                      </div>
                      <div className="h-72 w-full text-xs font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                            <XAxis dataKey="name" stroke="#525252" />
                            <YAxis stroke="#525252" />
                            <Tooltip contentStyle={{ backgroundColor: '#0f0f0f', borderColor: '#ffffff10', color: '#e5e5e5' }} />
                            <Legend />
                            <Bar dataKey="Collected" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="Pending" fill="#c4b5fd" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Attendance Pie Chart */}
                    <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6">
                      <div>
                        <h3 className="font-serif italic text-lg text-[#f5f5f5]">Xaadirinta Maanta (Attendance)</h3>
                        <p className="text-[10px] uppercase tracking-widest text-[#737373] mt-0.5">Xaaraanta ardayda firfircoon ee maanta ({attendanceDate})</p>
                      </div>
                      <div className="h-56 relative mt-4">
                        {attendanceChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={attendanceChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {attendanceChartData.map((entry, index) => {
                                  // Map colors to Sophisticated Dark Palette
                                  let color = entry.color;
                                  if (entry.name === 'Present') color = '#7c3aed';
                                  else if (entry.name === 'Absent') color = '#ef4444';
                                  else if (entry.name === 'Late') color = '#c4b5fd';
                                  else if (entry.name === 'Excused') color = '#3b82f6';
                                  else color = '#262626';
                                  return (
                                    <Cell key={`cell-${index}`} fill={color} />
                                  );
                                })}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f0f0f', borderColor: '#ffffff10' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                            <Calendar className="w-10 h-10 text-[#525252] mb-2" />
                            <span className="text-[10px] uppercase tracking-widest text-[#737373]">Weligaa xaadirin maanta ma kaydin</span>
                          </div>
                        )}
                        {attendanceChartData.length > 0 && (
                          <div className="absolute top-[41%] left-0 right-0 text-center pointer-events-none">
                            <span className="text-2xl font-bold font-mono tracking-tight text-[#f5f5f5]">
                              {attendance.filter(a => a.date === attendanceDate && a.status === 'Present').length}
                            </span>
                            <p className="text-[9px] uppercase font-semibold text-[#737373]">Present Today</p>
                          </div>
                        )}
                      </div>

                      {/* Legend detail list */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'Present', color: 'bg-[#7c3aed]' },
                          { key: 'Absent', color: 'bg-[#ef4444]' },
                          { key: 'Late', color: 'bg-[#c4b5fd]' },
                          { key: 'Excused', color: 'bg-[#3b82f6]' },
                          { key: 'Unrecorded', color: 'bg-[#262626]' }
                        ].map((stat, i) => {
                          const records = attendance.filter(a => a.date === attendanceDate);
                          let count = 0;
                          if (stat.key === 'Unrecorded') {
                            count = Math.max(0, activeStudentsCount - records.length);
                          } else {
                            count = records.filter(r => r.status === stat.key).length;
                          }
                          return (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-[#ffffff02] border border-[#ffffff05]">
                              <span className={`w-2 h-2 rounded-full ${stat.color} shrink-0`}></span>
                              <span className="text-[10px] text-[#737373] truncate flex-1 uppercase font-semibold">{stat.key}</span>
                              <span className="font-mono font-bold text-[#e5e5e5]">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Latest Invoices */}
                    <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6">
                      <h3 className="font-serif italic text-lg text-[#f5f5f5]">Latest Fee Payments</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#737373] mt-0.5">Biilasha ugu dambeeyey ee la cusbooneysiiyey</p>
                      <div className="mt-4 divide-y divide-[#ffffff10] max-h-80 overflow-y-auto pr-1">
                        {fees.length === 0 ? (
                          <div className="py-8 text-center text-xs text-[#737373]">Wax biilal ah oo diiwaangashan ma jiraan</div>
                        ) : (
                          fees.slice(0, 5).map(f => {
                            const sName = students.find(s => s.id === f.studentId)?.fullName || 'Unknown Student';
                            return (
                              <div key={f.id} className="py-3 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-bold text-[#e5e5e5]">{sName}</p>
                                  <p className="text-[#737373] mt-0.5 font-mono">{f.month} {f.year}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold font-mono text-[#f5f5f5]">{settings.currency} {f.paidAmount}</p>
                                  <span className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider mt-1 ${
                                    f.status === 'paid' ? 'bg-[#7c3aed]/10 text-[#c4b5fd] border border-[#7c3aed]/20' :
                                    f.status === 'partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>{f.status}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Active Inactive Student roster counts */}
                    <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6">
                      <h3 className="font-serif italic text-lg text-[#f5f5f5]">Ardayda dhawaan la diiwaangeliyey</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#737373] mt-0.5">Ardaydii u dambaysay ee lagu daray nidaamka</p>
                      <div className="mt-4 divide-y divide-[#ffffff10] max-h-80 overflow-y-auto pr-1">
                        {students.length === 0 ? (
                          <div className="py-8 text-center text-xs text-[#737373]">Wax arday ah oo diiwaangashan ma jiraan</div>
                        ) : (
                          students.slice(0, 5).map(s => (
                            <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-[#e5e5e5]">{s.fullName}</p>
                                <p className="text-[#737373] mt-0.5 uppercase tracking-wider text-[9px]">Class: {s.class} | Guardian: {s.guardianPhone || '-'}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                                s.status === 'active' ? 'bg-[#7c3aed]/10 text-[#c4b5fd] border border-[#7c3aed]/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>{s.status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Students Directory */}
              {activeTab === 'students' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-bold font-serif italic tracking-tight text-[#f5f5f5]">Ardayda / Students</h1>
                      <p className="text-[11px] uppercase tracking-widest text-[#737373] mt-1">Diiwaangelinta, tafatika, iyo tirtirida ardayda Dugsiga</p>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingStudent(null);
                        setStudentForm({ fullName: '', class: '', gender: 'Male', guardianPhone: '', status: 'active' });
                        setShowStudentModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] uppercase tracking-widest text-[10px] font-bold transition-colors shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ku dar Arday (Add Student)</span>
                    </button>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 flex items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#737373]" />
                      <input 
                        type="text" 
                        value={searchStudentQuery}
                        onChange={(e) => setSearchStudentQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                        placeholder="Ku raadi magac, class ama taleefan..."
                      />
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0a0a0a] border-b border-[#ffffff10] text-[10px] uppercase font-bold tracking-widest text-[#737373]">
                            <th className="px-6 py-4">Magaca / Full Name</th>
                            <th className="px-6 py-4">Falka / Class</th>
                            <th className="px-6 py-4">Lab/Dhedig (Gender)</th>
                            <th className="px-6 py-4">Taleefanka Labka (Guardian)</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Settings / Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffffff10] text-xs">
                          {students.filter(s => 
                            s.fullName.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
                            s.class.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
                            (s.guardianPhone && s.guardianPhone.includes(searchStudentQuery))
                          ).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-[#737373] uppercase tracking-wider text-[10px]">
                                Wax arday ah oo buuxiyey shuruudaha lama helin.
                              </td>
                            </tr>
                          ) : (
                            students.filter(s => 
                              s.fullName.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
                              s.class.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
                              (s.guardianPhone && s.guardianPhone.includes(searchStudentQuery))
                            ).map(student => (
                              <tr key={student.id} className="hover:bg-[#ffffff02] transition-colors">
                                <td className="px-6 py-4 font-bold text-[#e5e5e5]">{student.fullName}</td>
                                <td className="px-6 py-4 font-medium text-[#a3a3a3]">{student.class}</td>
                                <td className="px-6 py-4 text-[#737373]">{student.gender}</td>
                                <td className="px-6 py-4 font-mono text-[#737373]">{student.guardianPhone || '-'}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                                    student.status === 'active' ? 'bg-[#7c3aed]/10 text-[#c4b5fd] border border-[#7c3aed]/20' :
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>{student.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-1">
                                  <button 
                                    onClick={() => {
                                      setEditingStudent(student);
                                      setStudentForm({
                                        fullName: student.fullName,
                                        class: student.class,
                                        gender: student.gender,
                                        guardianPhone: student.guardianPhone || '',
                                        status: student.status
                                      });
                                      setShowStudentModal(true);
                                    }}
                                    className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff05]"
                                    title="Tafatir (Edit)"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteStudent(student.id)}
                                    className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-rose-400 hover:bg-[#ef444410]"
                                    title="Tirtir (Delete)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Attendance Tracker */}
              {activeTab === 'attendance' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-bold font-serif italic tracking-tight text-[#f5f5f5]">Xaadirinta / Attendance</h1>
                      <p className="text-[11px] uppercase tracking-widest text-[#737373] mt-1">Calaamadee ardayda maalin walba (Present, Absent, Late, Excused)</p>
                    </div>
                    <button 
                      onClick={handleSaveAttendanceSheet}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] uppercase tracking-widest text-[10px] font-bold transition-colors shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>Kaydi Xaadirinta (Save Sheet)</span>
                    </button>
                  </div>

                  {/* Calendar Selector & Batch Options */}
                  <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] uppercase tracking-widest text-[#737373] font-semibold">Dooro Taariikhda:</span>
                          <input 
                            type="date" 
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="px-3 py-1.5 rounded-sm bg-[#0a0a0a] text-xs font-bold font-mono border border-[#ffffff10] text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#ffffff10] p-1 rounded-sm">
                          <button
                            type="button"
                            onClick={() => setAttendanceSession('before_break')}
                            className={`px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all ${
                              attendanceSession === 'before_break' 
                                ? 'bg-[#7c3aed] text-white' 
                                : 'text-[#737373] hover:text-[#e5e5e5]'
                            }`}
                          >
                            Break-ka ka Hor (Before Break)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttendanceSession('after_break')}
                            className={`px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all ${
                              attendanceSession === 'after_break' 
                                ? 'bg-[#7c3aed] text-white' 
                                : 'text-[#737373] hover:text-[#e5e5e5]'
                            }`}
                          >
                            Break-ka ka Dib (After Break)
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button 
                          onClick={() => handleMarkAllAttendance('Present')}
                          className="px-3 py-1.5 rounded-sm border border-[#ffffff10] text-xs uppercase tracking-wider text-[#e5e5e5] bg-[#ffffff02] hover:bg-[#ffffff05] transition-colors font-medium"
                        >
                          Mark All Present
                        </button>
                        <button 
                          onClick={() => handleMarkAllAttendance('Absent')}
                          className="px-3 py-1.5 rounded-sm border border-[#ffffff10] text-xs uppercase tracking-wider text-[#e5e5e5] bg-[#ffffff02] hover:bg-[#ffffff05] transition-colors font-medium"
                        >
                          Mark All Absent
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Roster Board */}
                  <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0a0a0a] border-b border-[#ffffff10] text-[10px] uppercase font-bold tracking-widest text-[#737373]">
                            <th className="px-6 py-4">Ardayga / Student</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4">Dooro Status-ka (Attendance Status)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffffff10] text-xs">
                          {activeStudents.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-6 py-12 text-center text-[#737373]">
                                Ma jiraan arday firfircoon oo xaadiris loo sameeyo.
                              </td>
                            </tr>
                          ) : (
                            activeStudents.map(student => {
                              const record = attendance.find(a => a.date === attendanceDate && a.studentId === student.id);
                              const currentStatus = record ? record.status : 'Present';
                              return (
                                <tr key={student.id} className="hover:bg-[#ffffff02] transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-[#e5e5e5]">{student.fullName}</div>
                                  </td>
                                  <td className="px-6 py-4 text-[#a3a3a3] font-medium">{student.class}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {[
                                        { label: 'Present', val: 'Present' as const, color: 'peer-checked:bg-[#7c3aed] peer-checked:text-white border-[#ffffff10] text-[#737373] hover:bg-[#ffffff05]' },
                                        { label: 'Absent', val: 'Absent' as const, color: 'peer-checked:bg-[#ef4444] peer-checked:text-white border-[#ffffff10] text-[#737373] hover:bg-[#ffffff05]' },
                                        { label: 'Late', val: 'Late' as const, color: 'peer-checked:bg-[#c4b5fd] peer-checked:text-[#0a0a0a] border-[#ffffff10] text-[#737373] hover:bg-[#ffffff05]' },
                                        { label: 'Excused', val: 'Excused' as const, color: 'peer-checked:bg-[#3b82f6] peer-checked:text-white border-[#ffffff10] text-[#737373] hover:bg-[#ffffff05]' },
                                      ].map(opt => (
                                        <label key={opt.val} className="relative cursor-pointer">
                                          <input 
                                            type="radio" 
                                            name={`att_${student.id}`} 
                                            className="peer sr-only"
                                            checked={currentStatus === opt.val}
                                            onChange={() => handleAttendanceChange(student.id, opt.val)}
                                          />
                                          <div className={`px-3 py-1.5 rounded-sm border text-[9px] uppercase tracking-widest font-semibold transition-all ${opt.color}`}>
                                            {opt.label}
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Fees & Finance Portal */}
              {activeTab === 'fees' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-bold font-serif italic tracking-tight text-[#f5f5f5]">Fees & Finance</h1>
                      <p className="text-[11px] uppercase tracking-widest text-[#737373] mt-1">Abuur biilacha, diiwaangeli lacag bixinta, iyo dabagalka dakhliga</p>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingFee(null);
                        setFeeForm({
                          studentId: students[0]?.id || '',
                          month: 'January',
                          year: new Date().getFullYear(),
                          amount: settings.feeAmount,
                          paidAmount: 0
                        });
                        setShowFeeModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] uppercase tracking-widest text-[10px] font-bold transition-colors shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Abuur Biil (Create Invoice)</span>
                    </button>
                  </div>

                  {/* Invoices List Card */}
                  <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0a0a0a] border-b border-[#ffffff10] text-[10px] uppercase font-bold tracking-widest text-[#737373]">
                            <th className="px-6 py-4">Ardayga / Student</th>
                            <th className="px-6 py-4">Month / Year</th>
                            <th className="px-6 py-4">Biilka Total (Invoice)</th>
                            <th className="px-6 py-4">Bixiyay (Paid)</th>
                            <th className="px-6 py-4">Baaqi (Balance)</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffffff10] text-xs">
                          {fees.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-[#737373] uppercase tracking-wider text-[10px]">
                                Wax biilal ama dakhli ah oo diiwaangashan ma jiraan.
                              </td>
                            </tr>
                          ) : (
                            fees.map(fee => {
                              const studentName = students.find(s => s.id === fee.studentId)?.fullName || 'Unknown Student';
                              const balance = Math.max(0, fee.amount - fee.paidAmount);
                              return (
                                <tr key={fee.id} className="hover:bg-[#ffffff02] transition-colors">
                                  <td className="px-6 py-4 font-bold text-[#e5e5e5]">{studentName}</td>
                                  <td className="px-6 py-4 font-medium text-[#a3a3a3] font-mono">{fee.month} {fee.year}</td>
                                  <td className="px-6 py-4 font-mono font-bold text-[#e5e5e5]">{settings.currency} {fee.amount}</td>
                                  <td className="px-6 py-4 font-mono font-bold text-emerald-400">{settings.currency} {fee.paidAmount}</td>
                                  <td className="px-6 py-4 font-mono font-bold text-[#737373]">{settings.currency} {balance}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                                      fee.status === 'paid' ? 'bg-[#7c3aed]/10 text-[#c4b5fd] border border-[#7c3aed]/20' :
                                      fee.status === 'partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>{fee.status}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-1">
                                    <button 
                                      onClick={() => {
                                        setEditingFee(fee);
                                        setFeeForm({
                                          studentId: fee.studentId,
                                          month: fee.month,
                                          year: fee.year,
                                          amount: fee.amount,
                                          paidAmount: fee.paidAmount
                                        });
                                        setShowFeeModal(true);
                                      }}
                                      className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff05]"
                                      title="Recording Pay / Edit"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setShowHistoryModal(fee)}
                                      className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff05]"
                                      title="Transaction Audit Logs"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteFee(fee.id)}
                                      className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-rose-400 hover:bg-[#ef444410]"
                                      title="Delete Invoice"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Reports Center */}
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

              {/* Classes Management */}
              {activeTab === 'classes' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ClassesView
                    classes={classes}
                    students={students}
                    onAddClass={handleAddClass}
                    onUpdateClass={handleUpdateClass}
                    onDeleteClass={handleDeleteClass}
                    theme={theme}
                  />
                </motion.div>
              )}

              {/* Subjects Management */}
              {activeTab === 'subjects' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <SubjectsView
                    subjects={subjects}
                    classes={classes}
                    onAddSubject={handleAddSubject}
                    onUpdateSubject={handleUpdateSubject}
                    onDeleteSubject={handleDeleteSubject}
                    theme={theme}
                  />
                </motion.div>
              )}

              {/* Exams tracking */}
              {activeTab === 'exams' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
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
                </motion.div>
              )}

              {/* Settings Configuration Panel */}
              {activeTab === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold font-serif italic tracking-tight text-[#f5f5f5]">Qaabaynta / Configuration</h1>
                    <p className="text-[11px] uppercase tracking-widest text-[#737373] mt-1">Habee nidaamka iskuulkaaga, lacagaha aasaasiga ah iyo dashboard-ka</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Settings Form */}
                    <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 lg:col-span-2 space-y-6">
                      <h3 className="font-serif italic text-lg text-[#f5f5f5] flex items-center gap-2">
                        <SettingsIcon className="w-4 h-4 text-[#c4b5fd]" /> System Settings
                      </h3>
                      <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-[#737373] font-semibold">School Name</label>
                          <input 
                            type="text"
                            value={settings.schoolName}
                            onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-[#737373] font-semibold">Currency Symbol</label>
                            <input 
                              type="text"
                              value={settings.currency}
                              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-[#737373] font-semibold">Default Monthly Fee Amount</label>
                            <input 
                              type="number"
                              value={settings.feeAmount}
                              onChange={(e) => setSettings({ ...settings, feeAmount: Number(e.target.value) })}
                              className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-[#737373] font-semibold">System Visual Theme</label>
                          <select 
                            value={settings.systemTheme}
                            onChange={(e) => setSettings({ ...settings, systemTheme: e.target.value as any })}
                            className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                          >
                            <option value="light">Light Theme Mode</option>
                            <option value="dark">Dark Theme Mode</option>
                          </select>
                        </div>

                        <button 
                          type="submit"
                          className="px-5 py-2.5 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] uppercase tracking-widest text-[10px] font-bold transition-colors shadow-md"
                        >
                          Kaydi Qaabaynta (Save Settings)
                        </button>
                      </form>
                    </div>

                    {/* Danger zone panel */}
                    <div className="bg-[#0f0f0f] border border-rose-500/20 rounded-sm p-6 space-y-4">
                      <h3 className="font-serif italic text-lg text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Danger Zone
                      </h3>
                      <p className="text-xs text-[#a3a3a3] leading-relaxed">
                        Tirtir dhammaan macluumaadka iskuulka ee online-ka iyo backup-ka labadaba. Tani dib uma noqonayso!
                      </p>
                      <button 
                        onClick={handleFactoryReset}
                        className="w-full py-2.5 px-4 rounded-sm bg-rose-500 hover:bg-rose-600 text-white uppercase tracking-widest text-[10px] font-bold transition-colors shadow-md focus:outline-none"
                      >
                        Factory Reset System
                      </button>
                    </div>
                  </div>

                  {/* Supabase SQL setup panel */}
                  {dbStatus && (
                    <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif italic text-lg text-[#f5f5f5] flex items-center gap-2">
                          <Database className="w-4 h-4 text-[#c4b5fd]" /> Supabase Connection Diagnostics
                        </h3>
                        <span className={`inline-flex px-2.5 py-1 rounded-sm text-[9px] font-bold tracking-wider uppercase ${
                          dbStatus.customSupabaseActive ? 'bg-[#10b981]/10 text-[#34d399] border border-[#10b981]/20' :
                          dbStatus.customSupabaseConfigured ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          dbStatus.fallbackMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-[#7c3aed]/10 text-[#c4b5fd] border border-[#7c3aed]/20'
                        }`}>
                          {dbStatus.customSupabaseActive ? 'enforced online mode' :
                           dbStatus.customSupabaseConfigured ? 'custom db: tables missing' :
                           dbStatus.fallbackMode ? 'fallback mode active' : 'fully online connected'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] space-y-1">
                          <span className="text-[#737373] font-semibold block">Supabase Client Project URL:</span>
                          <span className="font-mono text-[#e5e5e5] font-bold truncate block">{dbStatus.supabaseUrl}</span>
                        </div>
                        <div className="p-4 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] space-y-1">
                          <span className="text-[#737373] font-semibold block">Active Storage Engine:</span>
                          <span className="font-mono text-[#e5e5e5] font-bold block">
                            {dbStatus.customSupabaseActive ? 'PostgreSQL on Supabase (Strict Online Mode)' :
                             dbStatus.customSupabaseConfigured ? 'Local Fallback (Custom Supabase Setup Pending)' :
                             dbStatus.fallbackMode ? 'Local JSON File System fallback' : 'PostgreSQL on Supabase'}
                          </span>
                        </div>
                      </div>

                      {dbStatus.fallbackMode && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-sm bg-[#ffffff02] border border-[#ffffff10] text-xs text-[#a3a3a3] space-y-1 leading-relaxed">
                            <strong className="block font-bold text-[#e5e5e5]">
                              {dbStatus.customSupabaseConfigured 
                                ? 'Cusbooneysiin: Supabase Key & URL waa sax, laakiin fadlan samee Jadwalka (Tables)!' 
                                : 'Sidee loo shidaa Online Database-ka Supabase?'}
                            </strong>
                            {dbStatus.customSupabaseConfigured ? (
                              <span>Waxaa la ogaaday in aad habaysay URL iyo Key gaarka ah ee Supabase-kaaga, laakiin jadwalka loo baahnaa lagama helin database-kaaga. Si uu ugu xirmo online mode, fadlan koobiyeey script-ka SQL-ka hoose, gal Dashboard-ka Supabase-kaaga dhanka bidix guji <strong>"SQL Editor" → "New Query"</strong>, ku dhex dheji (paste) oo guji <strong>"Run"</strong>. Markaad run garayso, dib u cusbooneysii boggan!</span>
                            ) : (
                              <span>Fadlan koobiyeey script-ka SQL-ka hoose, kadibna gal Dashboard-ka Supabase-kaaga, dhanka bidix guji <strong>"SQL Editor" → "New Query"</strong>, ku dhex dheji (paste) oo guji <strong>"Run"</strong>. Markaad run garayso, dib u cusbooneysii boggan, wuxuu ku xirnandoonaa Supabase Online!</span>
                            )}
                          </div>
                          
                          <div className="relative group">
                            <div className="absolute right-3 top-3 z-10">
                              <button 
                                onClick={() => handleCopyToClipboard(dbStatus.sqlScript)}
                                className="p-2 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] shadow transition-all duration-200 flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold"
                                title="Copy Script"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Code</span>
                              </button>
                            </div>
                            <pre className="p-4 rounded-sm bg-black text-[#a3a3a3] text-xs font-mono overflow-x-auto max-h-60 border border-[#ffffff10]">
                              <code>{dbStatus.sqlScript}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* ==============================================
         MODALS (STUDENT / FEE INVOICE / AUDIT TRAILS)
         ============================================== */}

      {/* 1. STUDENT MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm w-full max-w-md shadow-2xl p-6 relative">
            <button className="absolute right-4 top-4 p-1.5 rounded-sm text-[#737373] hover:bg-[#ffffff05]" onClick={() => setShowStudentModal(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-serif italic text-[#f5f5f5] mb-6">
              {editingStudent ? 'Tafatir Ardayga (Edit Student)' : 'Arday Cusub (Add New Student)'}
            </h2>
            <form onSubmit={handleStudentFormSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Magaca oo Buuxa (Full Name) *</label>
                <input 
                  type="text"
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Class / Grade *</label>
                  <select 
                    value={studentForm.class}
                    onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
                    className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                    required
                  >
                    <option value="">-- Dooro Fasal --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                    {classes.length === 0 && (
                      <>
                        <option value="1A">1A</option>
                        <option value="2A">2A</option>
                        <option value="3A">3A</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Lab/Dhedig (Gender)</label>
                  <select 
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                    className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Taleefanka Waalidka (Guardian Phone)</label>
                <input 
                  type="text"
                  value={studentForm.guardianPhone}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianPhone: e.target.value })}
                  className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                  placeholder="+25261xxxxxx"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Dooro Status-ka</label>
                <select 
                  value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value as any })}
                  className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="active">Active (Firfircoon)</option>
                  <option value="inactive">Inactive (Aan firfircoonayn)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff05] text-[10px] uppercase tracking-widest font-bold"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Kaydinaya...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. FEE MODAL */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm w-full max-w-md shadow-2xl p-6 relative">
            <button className="absolute right-4 top-4 p-1.5 rounded-sm text-[#737373] hover:bg-[#ffffff05]" onClick={() => setShowFeeModal(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-serif italic text-[#f5f5f5] mb-6">
              {editingFee ? 'Qaab Lacag bixin / Tafatir Invoice' : 'Abuur Biil Cusub (New Fee Invoice)'}
            </h2>
            <form onSubmit={handleFeeFormSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Dooro Ardayga (Select Student) *</label>
                <select 
                  value={feeForm.studentId}
                  onChange={(e) => setFeeForm({ ...feeForm, studentId: e.target.value })}
                  className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed] disabled:opacity-50"
                  required
                  disabled={!!editingFee}
                >
                  <option value="">-- Dooro Ardayga --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.class})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Month *</label>
                  <select 
                    value={feeForm.month}
                    onChange={(e) => setFeeForm({ ...feeForm, month: e.target.value })}
                    className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                    required
                  >
                    {monthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Year *</label>
                  <input 
                    type="number"
                    value={feeForm.year}
                    onChange={(e) => setFeeForm({ ...feeForm, year: Number(e.target.value) })}
                    className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Biilka oo dhan ({settings.currency}) *</label>
                  <input 
                    type="number"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: Number(e.target.value) })}
                    className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">Lacagta La Bixiyey ({settings.currency}) *</label>
                  <input 
                    type="number"
                    value={feeForm.paidAmount}
                    onChange={(e) => setFeeForm({ ...feeForm, paidAmount: Number(e.target.value) })}
                    className="w-full px-4.5 py-2.5 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-wider text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowFeeModal(false)}
                  className="px-4 py-2 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff05] text-[10px] uppercase tracking-widest font-bold"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Kaydinaya...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. TRANSACTION AUDIT trail HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm w-full max-w-lg shadow-2xl p-6 relative">
            <button className="absolute right-4 top-4 p-1.5 rounded-sm text-[#737373] hover:bg-[#ffffff05]" onClick={() => setShowHistoryModal(null)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-serif italic text-[#f5f5f5] mb-2">
              Audit Logs & Payments
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-[#737373] mb-6">Taariikhda lacag bixinta iyo dhaqdhaqaaqa biilka: #{showHistoryModal.id.substring(0,8)}</p>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {showHistoryModal.history && showHistoryModal.history.length > 0 ? (
                <div className="relative border-l border-[#ffffff10] pl-4 space-y-4 text-xs font-mono ml-2">
                  {showHistoryModal.history.map((hist, index) => (
                    <div key={index} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#7c3aed] border-2 border-[#0a0a0a]"></span>
                      <div className="p-3.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] space-y-1">
                        <div className="flex items-center justify-between font-bold text-[#e5e5e5]">
                          <span>{hist.action}</span>
                        </div>
                        <span className="text-[10px] text-[#737373] block">{new Date(hist.date).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#737373]">Wax dhaqdhaqaaq ah laguma qorin biilkan</div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t border-[#ffffff10]">
              <button 
                type="button" 
                onClick={() => setShowHistoryModal(null)}
                className="px-5 py-2 rounded-sm bg-[#ffffff05] border border-[#ffffff10] text-[#e5e5e5] text-[10px] uppercase tracking-widest font-bold hover:bg-[#ffffff10] transition-colors"
              >
                Xir (Close Logs)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL REUSABLE CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e111a] border border-[#ffffff10] rounded-xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-red-600"></div>
              
              <h3 className="text-xl font-serif italic text-white mb-2 flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-rose-400" />
                {confirmModal.title || 'Ma hubtaa?'}
              </h3>
              
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-6">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-3 font-bold text-[10px] uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff05] uppercase tracking-widest font-bold"
                >
                  No (Huri)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                  }}
                  className="px-5 py-2 rounded-sm bg-rose-500 hover:bg-rose-600 text-white uppercase tracking-widest font-bold shadow-lg shadow-rose-950/20"
                >
                  Yes (Hubaal)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
