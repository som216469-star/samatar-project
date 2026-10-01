import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit2, 
  Trash2, 
  Archive, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  Phone, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Camera, 
  FileSpreadsheet, 
  FileText, 
  Layers, 
  ArrowUpDown, 
  MoreVertical, 
  DollarSign, 
  Sparkles, 
  Calendar, 
  Home, 
  IdCard, 
  Check, 
  AlertTriangle,
  RotateCcw,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, SchoolClass, FeeRecord, AttendanceRecord, ExamScore } from '../../types';
import { StudentSubSection } from '../../app/navigationConfig';
import StudentProfileModal from './components/StudentProfileModal';
import StudentAddView from './components/StudentAddView';
import StudentImportView from './components/StudentImportView';
import StudentExportView from './components/StudentExportView';
import { StudentsRosterTable } from './components/StudentsRosterTable';
import { StudentFormModal } from './components/StudentFormModal';
import { StudentsActionModals } from './components/StudentsActionModals';
import { StudentsStatsOverview } from './components/StudentsStatsOverview';
import { StudentsFilterToolbar } from './components/StudentsFilterToolbar';
import {
  compressImage,
  exportStudentsToExcel,
  exportStudentsToCSV,
  exportStudentsToPDF,
  downloadStudentsExcelTemplate
} from './components/studentsExportUtils';

export type { StudentSubSection };

interface StudentsViewProps {
  students: Student[];
  classes: SchoolClass[];
  fees: FeeRecord[];
  attendance: AttendanceRecord[];
  examScores: ExamScore[];
  subjects?: any[];
  settings: {
    schoolName: string;
    currency: string;
    academicYear?: string;
    schoolPhone?: string;
    schoolAddress?: string;
    [key: string]: any;
  };
  onAddStudent: (student: any) => Promise<boolean>;
  onUpdateStudent: (id: string, updates: any) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onBulkUpdate?: (action: string, studentIds: string[], targetValue?: string) => Promise<boolean>;
  onRefreshData?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
  subSection?: StudentSubSection;
  onNavigateSubSection?: (sub: StudentSubSection) => void;
}

export default function StudentsView({
  students,
  classes,
  fees,
  attendance,
  examScores,
  subjects = [],
  settings,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkUpdate,
  onRefreshData,
  showToast,
  theme = 'dark',
  subSection = 'all',
  onNavigateSubSection
}: StudentsViewProps) {
  // --- View & Layout States ---
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [showDashboardDetails, setShowDashboardDetails] = useState(false);

  // --- Search, Filter & Sort States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedFeeFilter, setSelectedFeeFilter] = useState<string>('all');
  const [selectedRegDateFilter, setSelectedRegDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc' | 'class' | 'id_asc' | 'updated_desc'>('name_asc');

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // --- Column Visibility (with localStorage persistence) ---
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaults = {
      id: true,
      class: true,
      gender: true,
      guardian: true,
      status: true,
      fees: true,
      regDate: true,
      updated: true,
      actions: true
    };
    try {
      const saved = localStorage.getItem('dugsi_student_cols');
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('dugsi_student_cols', JSON.stringify(visibleColumns));
    } catch {}
  }, [visibleColumns]);

  // --- Selection & Bulk Actions ---
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkActionModal, setBulkActionModal] = useState<{
    isOpen: boolean;
    action: 'change_class' | 'change_status' | 'archive' | 'delete' | null;
    targetValue?: string;
  }>({ isOpen: false, action: null });
  const [bulkTargetClass, setBulkTargetClass] = useState<string>('');
  const [bulkTargetStatus, setBulkTargetStatus] = useState<'active' | 'inactive' | 'archived'>('active');
  const [bulkOperating, setBulkOperating] = useState(false);

  // --- Modals ---
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<Student | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // --- Student Form State ---
  const [formStep, setFormStep] = useState<'identity' | 'enrollment' | 'guardian'>('identity');
  const [formData, setFormData] = useState({
    id: '',
    fullName: '',
    class: '',
    gender: 'Male',
    guardianPhone: '',
    guardianName: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
    photo: '',
    dateOfBirth: '',
    address: '',
    section: '',
    rollNumber: '',
    createdAt: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    found: boolean;
    reason?: string;
    existingStudent?: any;
  }>({ found: false });

  // --- Excel Import State ---
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importValidCount, setImportValidCount] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);
  const [importFilterTab, setImportFilterTab] = useState<'all' | 'valid' | 'invalid'>('all');
  const [importProgress, setImportProgress] = useState(0);

  // --- Date & Months Helpers for Fees ---
  const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = monthsList[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  // Helper to get fee status for a student
  const getStudentFeeStatus = (studentId: string) => {
    const studentFee = fees.find(f => f.studentId === studentId && f.month === currentMonth && f.year === currentYear);
    if (!studentFee) return { status: 'unpaid', amount: settings.feeAmount || 0, paid: 0, balance: settings.feeAmount || 0 };
    return {
      status: studentFee.status,
      amount: studentFee.amount,
      paid: studentFee.paidAmount,
      balance: Math.max(0, studentFee.amount - studentFee.paidAmount)
    };
  };

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const inactive = students.filter(s => s.status === 'inactive').length;
    const archived = students.filter(s => s.status === 'archived').length;
    const male = students.filter(s => s.gender === 'Male').length;
    const female = students.filter(s => s.gender === 'Female').length;

    // Students with unpaid fees this month
    const unpaidFeesCount = students.filter(s => {
      const f = fees.find(fee => fee.studentId === s.id && fee.month === currentMonth && fee.year === currentYear);
      return !f || f.status === 'unpaid' || f.status === 'partial';
    }).length;

    // Newly registered this month
    const monthPrefix = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const newlyRegistered = students.filter(s => (s.createdAt || '').startsWith(monthPrefix)).length;

    // Students requiring attention (missing guardian phone or unpaid fees)
    const needsAttention = students.filter(s => {
      if (s.status === 'archived') return false;
      const missingPhone = !s.guardianPhone || s.guardianPhone.trim().length < 6;
      const f = fees.find(fee => fee.studentId === s.id && fee.month === currentMonth && fee.year === currentYear);
      const hasUnpaid = !f || f.status === 'unpaid';
      return missingPhone || hasUnpaid;
    }).length;

    // Class distribution
    const classCounts: Record<string, number> = {};
    students.forEach(s => {
      if (s.status !== 'archived') {
        const cls = s.class || 'Unassigned';
        classCounts[cls] = (classCounts[cls] || 0) + 1;
      }
    });
    const byClass = Object.entries(classCounts)
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count);

    // Recently Added & Updated
    const recentlyAdded = [...students]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5);

    const recentlyUpdated = [...students]
      .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
      .slice(0, 5);

    return {
      total,
      active,
      inactive,
      archived,
      male,
      female,
      malePercent: total > 0 ? Math.round((male / total) * 100) : 0,
      femalePercent: total > 0 ? Math.round((female / total) * 100) : 0,
      unpaidFeesCount,
      newlyRegistered,
      needsAttention,
      byClass,
      recentlyAdded,
      recentlyUpdated
    };
  }, [students, fees, currentMonth, currentYear]);

  // --- Real-time Duplicate Check in Form ---
  useEffect(() => {
    if (!showFormModal || !formData.fullName.trim() || !formData.class) {
      setDuplicateWarning({ found: false });
      return;
    }

    const cleanName = formData.fullName.trim().toLowerCase();
    const cleanClass = formData.class;
    const cleanPhone = formData.guardianPhone.trim();
    const cleanId = formData.id.trim().toLowerCase();

    const timer = setTimeout(() => {
      const match = students.find(s => {
        if (editingStudent && s.id === editingStudent.id) return false;
        const sameId = cleanId && s.id && s.id.toLowerCase() === cleanId;
        const sameNameClass = s.fullName.trim().toLowerCase() === cleanName && s.class === cleanClass;
        const samePhone = cleanPhone && cleanPhone.length > 6 && s.guardianPhone && s.guardianPhone === cleanPhone;
        return sameId || sameNameClass || samePhone;
      });

      if (match) {
        let reason = '';
        if (cleanId && match.id.toLowerCase() === cleanId) reason = 'Student ID-gan horey ayaa loo isticmaalay';
        else if (match.fullName.trim().toLowerCase() === cleanName && match.class === cleanClass) reason = 'Magacan iyo fasalkan arday hore ayaa loogu diiwaangeliyey';
        else if (cleanPhone && match.guardianPhone === cleanPhone) reason = 'Taleefankan waalidka waxaa u diiwaangashan arday kale';

        setDuplicateWarning({
          found: true,
          reason,
          existingStudent: match
        });
      } else {
        setDuplicateWarning({ found: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.fullName, formData.class, formData.guardianPhone, formData.id, showFormModal, editingStudent, students]);

  // --- Effective Status based on SubSection ---
  const effectiveStatusFilter = useMemo(() => {
    if (subSection === 'active') return 'active';
    if (subSection === 'inactive') return 'inactive';
    if (subSection === 'archived') return 'archived';
    return selectedStatusFilter;
  }, [subSection, selectedStatusFilter]);

  // --- Filtered and Sorted Students ---
  const filteredStudents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthPrefix = todayStr.substring(0, 7);
    const yearPrefix = todayStr.substring(0, 4);

    let result = students.filter(student => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = student.fullName.toLowerCase().includes(query);
        const matchesId = student.id.toLowerCase().includes(query);
        const matchesClass = student.class.toLowerCase().includes(query);
        const matchesPhone = student.guardianPhone ? student.guardianPhone.includes(query) : false;
        const matchesGuardian = student.guardianName ? student.guardianName.toLowerCase().includes(query) : false;
        const matchesRoll = student.rollNumber ? student.rollNumber.toLowerCase().includes(query) : false;

        if (!matchesName && !matchesId && !matchesClass && !matchesPhone && !matchesGuardian && !matchesRoll) {
          return false;
        }
      }

      // 2. Class Filter
      if (selectedClassFilter !== 'all' && student.class !== selectedClassFilter) {
        return false;
      }

      // 3. Gender Filter
      if (selectedGenderFilter !== 'all' && student.gender !== selectedGenderFilter) {
        return false;
      }

      // 4. Status Filter (or Subsection Locked Status)
      const studentStatus = student.status || 'active';
      if (effectiveStatusFilter !== 'all') {
        if (studentStatus !== effectiveStatusFilter) {
          return false;
        }
      }

      // 5. Fee Filter
      if (selectedFeeFilter !== 'all') {
        const feeInfo = getStudentFeeStatus(student.id);
        if (selectedFeeFilter === 'paid' && feeInfo.status !== 'paid') return false;
        if (selectedFeeFilter === 'unpaid' && feeInfo.status !== 'unpaid') return false;
        if (selectedFeeFilter === 'partial' && feeInfo.status !== 'partial') return false;
        if (selectedFeeFilter === 'attention') {
          const missingPhone = !student.guardianPhone || student.guardianPhone.trim().length < 6;
          if (!missingPhone && feeInfo.status === 'paid') return false;
        }
      }

      // 6. Registration Date Filter
      if (selectedRegDateFilter !== 'all') {
        const reg = student.createdAt || '';
        if (selectedRegDateFilter === 'today' && reg !== todayStr) return false;
        if (selectedRegDateFilter === 'this_month' && !reg.startsWith(monthPrefix)) return false;
        if (selectedRegDateFilter === 'this_year' && !reg.startsWith(yearPrefix)) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'name_desc') {
        return b.fullName.localeCompare(a.fullName);
      } else if (sortBy === 'id_asc') {
        return a.id.localeCompare(b.id);
      } else if (sortBy === 'date_desc') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      } else if (sortBy === 'date_asc') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      } else if (sortBy === 'updated_desc') {
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      } else if (sortBy === 'class') {
        return a.class.localeCompare(b.class);
      }
      return 0;
    });

    return result;
  }, [students, searchQuery, selectedClassFilter, selectedGenderFilter, effectiveStatusFilter, selectedFeeFilter, selectedRegDateFilter, sortBy, fees]);

  // --- Pagination Slice ---
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassFilter, selectedGenderFilter, effectiveStatusFilter, selectedFeeFilter, selectedRegDateFilter, pageSize]);

  // --- Selection Handlers ---
  const isAllSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !paginatedStudents.some(s => s.id === id)));
    } else {
      const pageIds = paginatedStudents.map(s => s.id);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // --- Open Add/Edit Modal ---
  const handleOpenAddModal = () => {
    if (classes.length === 0) {
      showToast("Fadlan marka hore samee fasal inta aadan arday ku darin! (Please create a class first!)", "error");
      return;
    }
    setEditingStudent(null);
    setFormData({
      id: 'STD-' + Math.floor(1000 + Math.random() * 9000),
      fullName: '',
      class: classes[0]?.className || '',
      gender: 'Male',
      guardianPhone: '',
      guardianName: '',
      status: 'active',
      photo: '',
      dateOfBirth: '',
      address: '',
      section: 'A',
      rollNumber: '',
      createdAt: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
    setFormStep('identity');
    setShowFormModal(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      id: student.id,
      fullName: student.fullName,
      class: student.class,
      gender: student.gender || 'Male',
      guardianPhone: student.guardianPhone || '',
      guardianName: student.guardianName || '',
      status: (student.status as any) || 'active',
      photo: student.photo || '',
      dateOfBirth: student.dateOfBirth || '',
      address: student.address || '',
      section: student.section || '',
      rollNumber: student.rollNumber || '',
      createdAt: student.createdAt || ''
    });
    setFormErrors({});
    setFormStep('identity');
    setShowFormModal(true);
  };

  // --- Validate & Submit Student Form ---
  const handleSubmitStudentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Magaca ardayga waa qasab (Full name is required)';
    } else if (formData.fullName.trim().split(' ').length < 2) {
      errors.fullName = 'Fadlan qor ugu yaraan 2 magac (At least two names)';
    }

    if (!formData.class) {
      errors.class = 'Fasalka waa qasab (Class is required)';
    }

    if (formData.guardianPhone && !/^[0-9+\s-]{7,15}$/.test(formData.guardianPhone.trim())) {
      errors.guardianPhone = 'Lambarka telefoonka ma saxna (Invalid phone format)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("Fadlan sax khaladaadka foomka ku jira", "warning");
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingStudent) {
        const success = await onUpdateStudent(editingStudent.id, formData);
        if (success) {
          showToast("Xogta ardayga si guul leh ayaa loo cusbooneysiiyey", "success");
          setShowFormModal(false);
        }
      } else {
        const success = await onAddStudent(formData);
        if (success) {
          showToast("Arday cusub si guul leh ayaa loo diiwaangeliyey", "success");
          setShowFormModal(false);
        }
      }
    } catch (err: any) {
      showToast(err.message || "Khalad ayaa dhacay inta hawshu socotay", "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // --- Photo Upload with Compression ---
  const handlePhotoFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast("Fadlan soo geli sawir sax ah (PNG, JPG, JPEG)", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Xajmiga sawirku kama badnaan karo 5MB", "warning");
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 400, 0.85);
      setFormData(prev => ({ ...prev, photo: compressedDataUrl }));
      showToast("Sawirka si habsami leh ayaa loo habeeyey", "success");
    } catch (err) {
      showToast("Lama farsamayn karo sawirka", "error");
    }
  };

  // --- Quick Status Toggle ---
  const handleQuickStatusChange = async (student: Student, newStatus: 'active' | 'inactive' | 'archived') => {
    try {
      const success = await onUpdateStudent(student.id, { ...student, status: newStatus });
      if (success) {
        showToast(`Xaaladda ardayga waxaa laga dhigay: ${newStatus}`, "success");
      }
    } catch (e) {
      showToast("Khalad ayaa dhacay beddelka xaaladda", "error");
    }
  };

  // --- Bulk Action Execution ---
  const handleExecuteBulkAction = async () => {
    if (selectedStudentIds.length === 0 || !bulkActionModal.action) return;
    setBulkOperating(true);

    try {
      if (onBulkUpdate) {
        let targetValue = '';
        if (bulkActionModal.action === 'change_class') targetValue = bulkTargetClass;
        if (bulkActionModal.action === 'change_status') targetValue = bulkTargetStatus;

        const success = await onBulkUpdate(bulkActionModal.action, selectedStudentIds, targetValue);
        if (success) {
          showToast(`Hawsha guud ee ${selectedStudentIds.length} arday si guul leh ayaa loo fuliyey!`, "success");
          setSelectedStudentIds([]);
          setBulkActionModal({ isOpen: false, action: null });
          if (onRefreshData) onRefreshData();
        }
      } else {
        // Fallback: sequential updates
        let count = 0;
        for (const id of selectedStudentIds) {
          const st = students.find(s => s.id === id);
          if (!st) continue;

          if (bulkActionModal.action === 'change_class' && bulkTargetClass) {
            await onUpdateStudent(id, { ...st, class: bulkTargetClass });
            count++;
          } else if (bulkActionModal.action === 'change_status') {
            await onUpdateStudent(id, { ...st, status: bulkTargetStatus });
            count++;
          } else if (bulkActionModal.action === 'archive') {
            await onUpdateStudent(id, { ...st, status: 'archived' });
            count++;
          } else if (bulkActionModal.action === 'delete') {
            await onDeleteStudent(id);
            count++;
          }
        }
        showToast(`Waxaa la cusbooneysiiyey ${count} arday!`, "success");
        setSelectedStudentIds([]);
        setBulkActionModal({ isOpen: false, action: null });
        if (onRefreshData) onRefreshData();
      }
    } catch (e: any) {
      showToast("Khalad ayaa dhacay fulinta hawsha guud", "error");
    } finally {
      setBulkOperating(false);
    }
  };

  // --- Export Functions ---
  const exportToExcel = (
    targetStudents = filteredStudents,
    filename = 'DugsiPro_Students_Roster.xlsx'
  ) => {
    exportStudentsToExcel(
      targetStudents,
      getStudentFeeStatus,
      settings.currency,
      showToast,
      filename
    );
  };

  const exportToCSV = (targetStudents = filteredStudents) => {
    exportStudentsToCSV(targetStudents, showToast);
  };

  const exportToPDF = (targetStudents = filteredStudents) => {
    exportStudentsToPDF(targetStudents, settings.schoolName, showToast);
  };

  const downloadTemplate = () => {
    downloadStudentsExcelTemplate(classes, showToast);
  };

  // --- Excel Import Parsing & Validation ---
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          showToast("Faylka Excel waa faaruq (File is empty)", "warning");
          return;
        }

        const classNamesSet = new Set(classes.map(c => c.className.toLowerCase().trim()));
        const existingNamesSet = new Set(students.map(s => `${s.fullName.toLowerCase().trim()}|${s.class.toLowerCase().trim()}`));
        const parsedRows: any[] = [];
        let valid = 0;
        let errors = 0;

        rawData.forEach((row: any, index: number) => {
          const rowNum = index + 2; // header is row 1
          const fullName = String(row["Magaca Ardayga (Full Name) *"] || row["Magaca Ardayga (Full Name)"] || row["fullName"] || row["Full Name"] || "").trim();
          const className = String(row["Fasalka (Class) *"] || row["Fasalka (Class)"] || row["class"] || row["Class"] || "").trim();
          const studentId = String(row["Student ID (Optional)"] || row["Student ID"] || row["id"] || "").trim();
          const section = String(row["Section"] || "").trim();
          const rollNumber = String(row["Roll Number"] || "").trim();
          const genderRaw = String(row["Lab/Dhedig (Gender - Male/Female)"] || row["gender"] || "Male").trim();
          const gender = genderRaw.toLowerCase().startsWith('f') || genderRaw.toLowerCase().startsWith('d') ? 'Female' : 'Male';
          const guardianPhone = String(row["Telefoonka Waalidka (Guardian Phone)"] || row["guardianPhone"] || "").trim();
          const guardianName = String(row["Magaca Waalidka (Guardian Name)"] || row["guardianName"] || "").trim();
          const statusRaw = String(row["Status (active/inactive/archived)"] || row["status"] || "active").toLowerCase().trim();
          const status = statusRaw === 'archived' ? 'archived' : statusRaw === 'inactive' ? 'inactive' : 'active';

          const rowErrors: string[] = [];

          if (!fullName) {
            rowErrors.push("Magaca ardayga waa maqan yahay");
          }
          if (!className) {
            rowErrors.push("Fasalka waa maqan yahay");
          } else if (classes.length > 0 && !classNamesSet.has(className.toLowerCase().trim())) {
            rowErrors.push(`Fasalka '${className}' kama jiro nidaamka`);
          }

          const dupKey = `${fullName.toLowerCase()}|${className.toLowerCase()}`;
          if (existingNamesSet.has(dupKey)) {
            rowErrors.push("Ardaygan horey ayaa loogu diiwaangeliyey fasalkan");
          }

          const isValid = rowErrors.length === 0;
          if (isValid) valid++;
          else errors++;

          parsedRows.push({
            rowNum,
            isValid,
            errors: rowErrors,
            data: {
              id: studentId || 'std-' + Math.random().toString(36).substr(2, 9),
              fullName,
              class: className,
              section,
              rollNumber,
              gender,
              guardianPhone,
              guardianName,
              status,
              createdAt: new Date().toISOString().split('T')[0]
            }
          });
        });

        setImportRows(parsedRows);
        setImportValidCount(valid);
        setImportErrorCount(errors);
        setImportStep('preview');
      } catch (err) {
        console.error(err);
        showToast("Faylka Excel lama akhrin karo", "error");
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleCommitImport = async () => {
    const validRows = importRows.filter(r => r.isValid).map(r => r.data);
    if (validRows.length === 0) {
      showToast("Wax arday ah oo sax ah oo la soo gelin karo ma jiraan", "warning");
      return;
    }

    setImportStep('importing');
    setImportProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const student = validRows[i];
      try {
        const ok = await onAddStudent(student);
        if (ok) successCount++;
        else failCount++;
      } catch (e) {
        failCount++;
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    showToast(`Soo gelintu way dhammaatay: ${successCount} arday ayaa lagu daray. ${failCount} cilado.`, "success");
    setShowImportModal(false);
    setImportStep('upload');
    setImportRows([]);
    if (onRefreshData) onRefreshData();
  };

  // --- Sync /students/:id URL for Student Profile ---
  const handleOpenProfile = (student: Student) => {
    setSelectedProfileStudent(student);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/students/${encodeURIComponent(student.id)}`);
    }
  };

  const handleCloseProfile = () => {
    setSelectedProfileStudent(null);
    if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/students/')) {
      const targetPath = subSection && subSection !== 'all' ? `/students/${subSection}` : '/students';
      window.history.pushState({}, '', targetPath);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || students.length === 0) return;

    const syncProfileFromUrl = () => {
      const path = window.location.pathname;
      if (path.toLowerCase().startsWith('/students/')) {
        const segment = decodeURIComponent(path.slice('/students/'.length).split('/')[0]);
        const reserved = ['add', 'active', 'inactive', 'archived', 'import', 'export', 'all'];
        if (segment && !reserved.includes(segment.toLowerCase())) {
          const matched = students.find(s => s.id.toLowerCase() === segment.toLowerCase());
          if (matched) {
            setSelectedProfileStudent(matched);
            return;
          }
        }
      }
      setSelectedProfileStudent(null);
    };

    syncProfileFromUrl();
    window.addEventListener('popstate', syncProfileFromUrl);
    return () => window.removeEventListener('popstate', syncProfileFromUrl);
  }, [students]);

  const activeFilterCount = [
    searchQuery.trim() !== '',
    selectedClassFilter !== 'all',
    selectedGenderFilter !== 'all',
    selectedStatusFilter !== 'all',
    selectedFeeFilter !== 'all',
    selectedRegDateFilter !== 'all'
  ].filter(Boolean).length;

  // =========================================================================
  // DEDICATED SUBSECTION PAGES: ADD, IMPORT, EXPORT
  // =========================================================================
  if (subSection === 'add') {
    return (
      <StudentAddView
        classes={classes}
        existingStudents={students}
        onAddStudent={async (studentData) => {
          const ok = await onAddStudent(studentData);
          if (ok && onNavigateSubSection) {
            onNavigateSubSection('all');
          }
          return ok;
        }}
        onCancel={() => onNavigateSubSection ? onNavigateSubSection('all') : undefined}
        showToast={showToast}
        theme={theme}
      />
    );
  }

  if (subSection === 'import') {
    return (
      <StudentImportView
        existingStudents={students}
        classes={classes}
        onImportStudents={async (studentsToImport: any[]) => {
          let okCount = 0;
          for (const st of studentsToImport) {
            const ok = await onAddStudent(st);
            if (ok) okCount++;
          }
          if (onRefreshData) onRefreshData();
          return okCount > 0;
        }}
        onCancel={() => onNavigateSubSection ? onNavigateSubSection('all') : undefined}
        showToast={showToast}
        theme={theme}
      />
    );
  }

  if (subSection === 'export') {
    return (
      <StudentExportView
        students={students}
        filteredStudents={filteredStudents}
        activeFilterCount={activeFilterCount}
        classes={classes}
        fees={fees}
        settings={settings}
        onCancel={() => onNavigateSubSection ? onNavigateSubSection('all') : undefined}
        showToast={showToast}
        theme={theme}
      />
    );
  }

  const subSectionMeta = {
    all: {
      breadcrumb: 'All Students',
      title: 'Dhammaan Ardayda / All Students',
      subtitle: 'Nidaamka casriga ah ee diiwaangelinta, xog-raadinta, falanqaynta, iyo maamulka guud ee ardayda'
    },
    active: {
      breadcrumb: 'Active Students',
      title: 'Ardayda Firfircoon / Active Students',
      subtitle: `Liiska ardayda hadda wax ka barata dugsiga (${stats.active} arday oo firfircoon)`
    },
    inactive: {
      breadcrumb: 'Inactive Students',
      title: 'Ardayda Hakadka Ku Jirta / Inactive Students',
      subtitle: `Ardayda si ku-meel-gaar ah u joojisay waxbarashada (${stats.inactive} arday)`
    },
    archived: {
      breadcrumb: 'Archived Students',
      title: 'Diiwaanka Kaydsan / Archived Students',
      subtitle: `Ardayda ka qalin-jabisay ama laga saaray liiska firfircoon iyadoo taariikhdooda la dhowrayo (${stats.archived} arday)`
    }
  }[subSection === 'active' || subSection === 'inactive' || subSection === 'archived' ? subSection : 'all'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#737373] mb-1">
            <span
              onClick={() => onNavigateSubSection && onNavigateSubSection('all')}
              className="hover:text-[#c4b5fd] cursor-pointer transition-colors"
            >
              Students
            </span>
            <span>·</span>
            <span className="text-[#c4b5fd] font-semibold">{subSectionMeta.breadcrumb}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold font-serif italic tracking-tight text-[#f5f5f5]">
              {subSectionMeta.title}
            </h1>
          </div>
          <p className="text-xs text-[#888888] mt-1">
            {subSectionMeta.subtitle}
          </p>
        </div>

        {/* Global CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="bg-[#0f0f0f] border border-[#ffffff15] p-0.5 rounded-sm flex items-center">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xs text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'table' ? 'bg-[#7c3aed] text-white font-bold' : 'text-[#888888] hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Table</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-xs text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'cards' ? 'bg-[#7c3aed] text-white font-bold' : 'text-[#888888] hover:text-white'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Cards</span>
            </button>
          </div>

          {/* Import Students */}
          <button
            onClick={() => {
              if (onNavigateSubSection) {
                onNavigateSubSection('import');
              } else {
                setImportStep('upload');
                setImportRows([]);
                setShowImportModal(true);
              }
            }}
            className="px-3 py-2 rounded-sm bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Soo Geli (Import)</span>
          </button>

          {/* Export Students */}
          <button
            onClick={() => {
              if (onNavigateSubSection) {
                onNavigateSubSection('export');
              } else {
                exportToExcel();
              }
            }}
            className="px-3 py-2 rounded-sm bg-[#7c3aed]/15 border border-[#7c3aed]/30 hover:bg-[#7c3aed]/25 text-[#c4b5fd] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Dhoofi (Export)</span>
          </button>

          {/* Add Student Primary CTA */}
          <button
            onClick={() => {
              if (onNavigateSubSection) {
                onNavigateSubSection('add');
              } else {
                handleOpenAddModal();
              }
            }}
            className="px-4 py-2 rounded-sm bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-[#7c3aed]/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ku dar Arday (Add Student)</span>
          </button>
        </div>
      </div>

      {/* CONTEXTUAL SUBSECTION INFO BANNERS */}
      {subSection === 'inactive' && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Qaybta Ardayda Aan Firfircoonayn (Inactive Roster)
              </h3>
              <p className="text-xs text-[#cccccc] mt-0.5">
                Ardaydani hadda kama muuqdaan xaadirinta maalinlaha ah. Waxaad dib ugu soo celin kartaa Active wakhti kasta.
              </p>
            </div>
          </div>
          { onNavigateSubSection && (
            <button
              onClick={() => onNavigateSubSection('all')}
              className="px-3 py-1.5 rounded-sm bg-[#ffffff08] hover:bg-[#ffffff15] text-xs font-mono text-white shrink-0"
            >
              Fiiri Dhammaan Ardayda →
            </button>
          )}
        </div>
      )}

      {subSection === 'archived' && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Archive className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Kaydka Taariikhda Ardayda (Archived Records)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Diiwaannada kaydsan lama tirtiro si loo dhowro taariikhda lacagaha, natiijooyinka imtixaanka, iyo xaadiriska hore.
              </p>
            </div>
          </div>
          { onNavigateSubSection && (
            <button
              onClick={() => onNavigateSubSection('all')}
              className="px-3 py-1.5 rounded-sm bg-[#ffffff08] hover:bg-[#ffffff15] text-xs font-mono text-white shrink-0"
            >
              Ku Noqo Dhammaan →
            </button>
          )}
        </div>
      )}

      {/* 2. STATS & ANALYTICS OVERVIEW CARDS */}
      <StudentsStatsOverview
        stats={stats}
        onNavigateSubSection={onNavigateSubSection}
        setSelectedStatusFilter={setSelectedStatusFilter}
        selectedRegDateFilter={selectedRegDateFilter}
        setSelectedRegDateFilter={setSelectedRegDateFilter}
        selectedFeeFilter={selectedFeeFilter}
        setSelectedFeeFilter={setSelectedFeeFilter}
        selectedClassFilter={selectedClassFilter}
        setSelectedClassFilter={setSelectedClassFilter}
        showDashboardDetails={showDashboardDetails}
        setShowDashboardDetails={setShowDashboardDetails}
        onOpenProfile={handleOpenProfile}
      />

      {/* 3 & 4. ADVANCED SEARCH, FILTER, COLUMN VISIBILITY & BULK ACTIONS TOOLBAR */}
      <StudentsFilterToolbar
        subSection={subSection}
        classes={classes}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedClassFilter={selectedClassFilter}
        setSelectedClassFilter={setSelectedClassFilter}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
        selectedGenderFilter={selectedGenderFilter}
        setSelectedGenderFilter={setSelectedGenderFilter}
        selectedRegDateFilter={selectedRegDateFilter}
        setSelectedRegDateFilter={setSelectedRegDateFilter}
        selectedFeeFilter={selectedFeeFilter}
        setSelectedFeeFilter={setSelectedFeeFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        activeFilterCount={activeFilterCount}
        onOpenFiltersDrawer={() => setShowFiltersDrawer(true)}
        showColumnConfig={showColumnConfig}
        setShowColumnConfig={setShowColumnConfig}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        onResetAllFilters={() => {
          setSearchQuery('');
          setSelectedClassFilter('all');
          setSelectedStatusFilter('all');
          setSelectedGenderFilter('all');
          setSelectedFeeFilter('all');
          setSelectedRegDateFilter('all');
          setSortBy('name_asc');
        }}
        filteredStudentsCount={filteredStudents.length}
        selectedStudentIds={selectedStudentIds}
        onClearSelection={() => setSelectedStudentIds([])}
        pageSize={pageSize}
        setPageSize={setPageSize}
        onOpenBulkChangeClass={() => {
          setBulkTargetClass(classes[0]?.className || '');
          setBulkActionModal({ isOpen: true, action: 'change_class' });
        }}
        onOpenBulkChangeStatus={() => {
          setBulkTargetStatus('active');
          setBulkActionModal({ isOpen: true, action: 'change_status' });
        }}
        onBulkExportSelected={() => {
          const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));
          exportToExcel(
            selectedStudents,
            `DugsiPro_Selected_${selectedStudents.length}_Students.xlsx`
          );
        }}
        onOpenBulkArchive={() => setBulkActionModal({ isOpen: true, action: 'archive' })}
        onOpenBulkDelete={() => setBulkActionModal({ isOpen: true, action: 'delete' })}
      />

      {/* 5. STUDENTS CONTENT VIEW (TABLE OR CARDS) & PAGINATION */}
      <StudentsRosterTable
        viewMode={viewMode}
        paginatedStudents={paginatedStudents}
        filteredStudentsCount={filteredStudents.length}
        selectedStudentIds={selectedStudentIds}
        isAllSelected={isAllSelected}
        visibleColumns={visibleColumns}
        currency={settings.currency}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onSetCurrentPage={setCurrentPage}
        onSetPageSize={setPageSize}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelectOne={handleToggleSelectOne}
        getStudentFeeStatus={getStudentFeeStatus}
        onOpenProfile={handleOpenProfile}
        onOpenEditModal={handleOpenEditModal}
        onQuickStatusChange={handleQuickStatusChange}
        onDeleteStudentClick={setDeleteConfirmStudent}
      />

      {/* =========================================================================
          MODALS SECTION
          ========================================================================= */}

      {/* A. 360° STUDENT PROFILE MODAL */}
      {selectedProfileStudent && (
        <StudentProfileModal
          student={selectedProfileStudent}
          classes={classes}
          fees={fees}
          attendance={attendance}
          examScores={examScores}
          subjects={subjects}
          currency={settings.currency}
          onClose={handleCloseProfile}
          onEditStudent={(st) => {
            handleCloseProfile();
            handleOpenEditModal(st);
          }}
          onStatusChange={async (st, newStatus) => {
            await handleQuickStatusChange(st, newStatus);
            setSelectedProfileStudent({ ...st, status: newStatus });
          }}
          theme={theme}
        />
      )}

      {/* B. ADD / EDIT STUDENT MULTI-SECTION MODAL */}
      <StudentFormModal
        showFormModal={showFormModal}
        onCloseFormModal={() => setShowFormModal(false)}
        editingStudent={editingStudent}
        formStep={formStep}
        setFormStep={setFormStep}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        formSubmitting={formSubmitting}
        duplicateWarning={duplicateWarning}
        classes={classes}
        onPhotoFileChange={handlePhotoFileChange}
        onSubmitStudentForm={handleSubmitStudentForm}
      />

      {/* C-E. FILTER DRAWER, BULK IMPORT, BULK ACTIONS & DELETE CONFIRM MODALS */}
      <StudentsActionModals
        showFiltersDrawer={showFiltersDrawer}
        onCloseFiltersDrawer={() => setShowFiltersDrawer(false)}
        subSection={subSection}
        classes={classes}
        selectedClassFilter={selectedClassFilter}
        setSelectedClassFilter={setSelectedClassFilter}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
        selectedGenderFilter={selectedGenderFilter}
        setSelectedGenderFilter={setSelectedGenderFilter}
        selectedRegDateFilter={selectedRegDateFilter}
        setSelectedRegDateFilter={setSelectedRegDateFilter}
        selectedFeeFilter={selectedFeeFilter}
        setSelectedFeeFilter={setSelectedFeeFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onResetAllFilters={() => {
          setSearchQuery('');
          setSelectedClassFilter('all');
          setSelectedStatusFilter('all');
          setSelectedGenderFilter('all');
          setSelectedFeeFilter('all');
          setSelectedRegDateFilter('all');
          setSortBy('name_asc');
        }}
        filteredStudentsCount={filteredStudents.length}
        showImportModal={showImportModal}
        onCloseImportModal={() => setShowImportModal(false)}
        importStep={importStep}
        setImportStep={setImportStep}
        importRows={importRows}
        importValidCount={importValidCount}
        importErrorCount={importErrorCount}
        importFilterTab={importFilterTab}
        setImportFilterTab={setImportFilterTab}
        importProgress={importProgress}
        onDownloadTemplate={downloadTemplate}
        onExcelUpload={handleExcelUpload}
        onCommitImport={handleCommitImport}
        bulkActionModal={bulkActionModal}
        onCloseBulkActionModal={() => setBulkActionModal({ isOpen: false, action: null })}
        selectedStudentIdsCount={selectedStudentIds.length}
        bulkTargetClass={bulkTargetClass}
        setBulkTargetClass={setBulkTargetClass}
        bulkTargetStatus={bulkTargetStatus}
        setBulkTargetStatus={setBulkTargetStatus}
        bulkOperating={bulkOperating}
        onExecuteBulkAction={handleExecuteBulkAction}
        deleteConfirmStudent={deleteConfirmStudent}
        onCloseDeleteConfirm={() => setDeleteConfirmStudent(null)}
        onQuickArchiveFromDelete={async (st) => {
          await handleQuickStatusChange(st, 'archived');
          setDeleteConfirmStudent(null);
        }}
        onConfirmDeleteStudent={async (st) => {
          const success = await onDeleteStudent(st.id);
          if (success) {
            showToast('Ardayga waa la tirtiray', 'success');
            setDeleteConfirmStudent(null);
          }
        }}
      />
    </div>
  );
}
