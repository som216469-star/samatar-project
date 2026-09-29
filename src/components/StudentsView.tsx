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
import { Student, SchoolClass, FeeRecord, AttendanceRecord, ExamScore } from '../types';
import StudentProfileModal from './StudentProfileModal';
import StudentAddView from './students/StudentAddView';
import StudentImportView from './students/StudentImportView';
import StudentExportView from './students/StudentExportView';

export type StudentSubSection = 'all' | 'add' | 'active' | 'inactive' | 'archived' | 'import' | 'export';

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

// Compress image helper (Canvas-based, keeps payload lightweight)
function compressImage(file: File, maxDim = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Image decode error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
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
  theme = 'dark'
}: StudentsViewProps) {
  // --- View & Layout States ---
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // --- Search, Filter & Sort States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedFeeFilter, setSelectedFeeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc' | 'class'>('name_asc');

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // --- Column Visibility ---
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    class: true,
    gender: true,
    guardian: true,
    status: true,
    fees: true,
    actions: true
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);

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

    return {
      total,
      active,
      inactive,
      archived,
      male,
      female,
      malePercent: total > 0 ? Math.round((male / total) * 100) : 0,
      femalePercent: total > 0 ? Math.round((female / total) * 100) : 0,
      unpaidFeesCount
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

  // --- Filtered and Sorted Students ---
  const filteredStudents = useMemo(() => {
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

      // 4. Status Filter
      if (selectedStatusFilter !== 'all') {
        const studentStatus = student.status || 'active';
        if (studentStatus !== selectedStatusFilter) {
          return false;
        }
      }

      // 5. Fee Filter
      if (selectedFeeFilter !== 'all') {
        const feeInfo = getStudentFeeStatus(student.id);
        if (selectedFeeFilter === 'paid' && feeInfo.status !== 'paid') return false;
        if (selectedFeeFilter === 'unpaid' && feeInfo.status !== 'unpaid') return false;
        if (selectedFeeFilter === 'partial' && feeInfo.status !== 'partial') return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'name_desc') {
        return b.fullName.localeCompare(a.fullName);
      } else if (sortBy === 'date_desc') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      } else if (sortBy === 'date_asc') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      } else if (sortBy === 'class') {
        return a.class.localeCompare(b.class);
      }
      return 0;
    });

    return result;
  }, [students, searchQuery, selectedClassFilter, selectedGenderFilter, selectedStatusFilter, selectedFeeFilter, sortBy, fees]);

  // --- Pagination Slice ---
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassFilter, selectedGenderFilter, selectedStatusFilter, selectedFeeFilter, pageSize]);

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
  const exportToExcel = (targetStudents = filteredStudents, filename = "DugsiPro_Students_Roster.xlsx") => {
    if (targetStudents.length === 0) {
      showToast("Wax xog arday ah oo la dhoofiyo ma jiraan", "warning");
      return;
    }

    const exportData = targetStudents.map((s, idx) => {
      const fee = getStudentFeeStatus(s.id);
      return {
        "No": idx + 1,
        "Student ID": s.id,
        "Full Name": s.fullName,
        "Class": s.class,
        "Section": s.section || "-",
        "Roll Number": s.rollNumber || "-",
        "Gender": s.gender,
        "Status": s.status || "active",
        "Guardian Phone": s.guardianPhone || "-",
        "Guardian Name": s.guardianName || "-",
        "Address": s.address || "-",
        "Fee Status": fee.status,
        "Paid Amount": `${settings.currency} ${fee.paid}`,
        "Balance": `${settings.currency} ${fee.balance}`,
        "Registration Date": s.createdAt || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ardayda");
    XLSX.writeFile(wb, filename);
    showToast(`Faylka Excel waa la diyaariyey (${targetStudents.length} arday)`, "success");
  };

  const exportToCSV = (targetStudents = filteredStudents) => {
    if (targetStudents.length === 0) {
      showToast("Wax xog ah oo la dhoofiyo ma jiraan", "warning");
      return;
    }
    const exportData = targetStudents.map((s, idx) => ({
      "No": idx + 1,
      "Student ID": s.id,
      "Full Name": s.fullName,
      "Class": s.class,
      "Gender": s.gender,
      "Status": s.status || "active",
      "Guardian Phone": s.guardianPhone || "-",
      "Registration Date": s.createdAt || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DugsiPro_Students.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Faylka CSV waa la soo dejiyey", "success");
  };

  const exportToPDF = (targetStudents = filteredStudents) => {
    if (targetStudents.length === 0) {
      showToast("Wax xog ah oo la daabaco ma jiraan", "warning");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Header Banner
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(245, 245, 245);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.schoolName || "DUGSI PRO SCHOOL", 14, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(167, 139, 250);
      doc.text("STUDENT MANAGEMENT DIRECTORY / DIIWAANKA ARDAYDA", 14, 22);

      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} | Total: ${targetStudents.length} Students`, 140, 22);

      // Table
      const tableData = targetStudents.map((s, idx) => [
        idx + 1,
        s.id,
        s.fullName,
        s.class,
        s.gender,
        s.guardianPhone || "-",
        (s.status || "active").toUpperCase()
      ]);

      autoTable(doc, {
        head: [['#', 'ID', 'FULL NAME', 'CLASS', 'GENDER', 'GUARDIAN PHONE', 'STATUS']],
        body: tableData,
        startY: 36,
        theme: 'striped',
        headStyles: {
          fillColor: [124, 58, 237],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 26 },
          2: { cellWidth: 62 },
          3: { cellWidth: 28 },
          4: { cellWidth: 20 },
          5: { cellWidth: 32 },
          6: { cellWidth: 22, halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: [248, 248, 250]
        }
      });

      doc.save(`DugsiPro_Students_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("Faylka PDF waa la daabacay", "success");
    } catch (e) {
      console.error(e);
      showToast("Khalad ayaa dhacay abuurista PDF", "error");
    }
  };

  const downloadTemplate = () => {
    const templateRows = [
      {
        "Student ID (Optional)": "STD-1001",
        "Magaca Ardayga (Full Name) *": "Maxamed Cali Jaamac",
        "Fasalka (Class) *": classes[0]?.className || "Fasalka 1aad",
        "Section": "A",
        "Roll Number": "01",
        "Lab/Dhedig (Gender - Male/Female)": "Male",
        "Telefoonka Waalidka (Guardian Phone)": "+252615123456",
        "Magaca Waalidka (Guardian Name)": "Cali Jaamac",
        "Status (active/inactive/archived)": "active"
      },
      {
        "Student ID (Optional)": "STD-1002",
        "Magaca Ardayga (Full Name) *": "Caasho Axmed Nuur",
        "Fasalka (Class) *": classes[0]?.className || "Fasalka 1aad",
        "Section": "A",
        "Roll Number": "02",
        "Lab/Dhedig (Gender - Male/Female)": "Female",
        "Telefoonka Waalidka (Guardian Phone)": "+252615654321",
        "Magaca Waalidka (Guardian Name)": "Axmed Nuur",
        "Status (active/inactive/archived)": "active"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ardayda_Template");
    XLSX.writeFile(wb, "DugsiPro_Students_Template.xlsx");
    showToast("Template-ka Excel waa la soo dejiyey", "success");
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold font-serif italic tracking-tight text-[#f5f5f5]">
              Ardayda / Student Management
            </h1>
            <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold bg-[#7c3aed]/15 text-[#c4b5fd] border border-[#7c3aed]/30 uppercase tracking-widest">
              DUGSI PRO 2026
            </span>
          </div>
          <p className="text-xs text-[#888888] mt-1 uppercase tracking-wider">
            Nidaamka casriga ah ee diiwaangelinta, xog-raadinta, falanqaynta, iyo dhoofinta ardayda
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

          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="px-3 py-2 rounded-sm bg-[#ffffff05] border border-[#ffffff15] hover:bg-[#ffffff10] text-[#cccccc] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors"
            title="Download Official Excel Template"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Template</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={() => {
              setImportStep('upload');
              setImportRows([]);
              setShowImportModal(true);
            }}
            className="px-3 py-2 rounded-sm bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Soo Geli (Import)</span>
          </button>

          {/* Export Dropdown Options */}
          <div className="relative group">
            <button
              className="px-3 py-2 rounded-sm bg-[#7c3aed]/15 border border-[#7c3aed]/30 hover:bg-[#7c3aed]/25 text-[#c4b5fd] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Dhoofi (Export)</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#141414] border border-[#ffffff15] rounded-sm shadow-2xl py-1.5 z-40 hidden group-hover:block divide-y divide-[#ffffff08]">
              <button
                onClick={() => exportToExcel()}
                className="w-full px-3.5 py-2 text-left text-xs text-[#e5e5e5] hover:bg-[#7c3aed]/20 hover:text-white flex items-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => exportToPDF()}
                className="w-full px-3.5 py-2 text-left text-xs text-[#e5e5e5] hover:bg-[#7c3aed]/20 hover:text-white flex items-center gap-2 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Export PDF (.pdf)</span>
              </button>
              <button
                onClick={() => exportToCSV()}
                className="w-full px-3.5 py-2 text-left text-xs text-[#e5e5e5] hover:bg-[#7c3aed]/20 hover:text-white flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Add Student Primary CTA */}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-sm bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-[#7c3aed]/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ku dar Arday (Add Student)</span>
          </button>
        </div>
      </div>

      {/* 2. STATS & ANALYTICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">Wadar Guud</span>
            <Users className="w-4 h-4 text-[#c4b5fd]" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{stats.total}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Total Enrolled</p>
        </div>

        {/* Card 2: Active */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Firfircoon</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">{stats.active}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Active Students</p>
        </div>

        {/* Card 3: Inactive */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Joojiyey</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">{stats.inactive}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Inactive Roster</p>
        </div>

        {/* Card 4: Archived */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Kaydsan</span>
            <Archive className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-300">{stats.archived}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Archived History</p>
        </div>

        {/* Card 5: Male / Female Ratio */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 space-y-1.5 col-span-2 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">Wiilal & Gabdho</span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-[#60a5fa] font-bold">M: {stats.male}</span>
              <span className="text-[#737373]">|</span>
              <span className="text-[#f472b6] font-bold">F: {stats.female}</span>
            </div>
          </div>
          {/* Ratio bar */}
          <div className="h-2 w-full bg-[#1e1e1e] rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${stats.malePercent}%` }} 
              className="bg-[#3b82f6] h-full transition-all duration-500" 
              title={`Male: ${stats.malePercent}%`}
            />
            <div 
              style={{ width: `${stats.femalePercent}%` }} 
              className="bg-[#ec4899] h-full transition-all duration-500" 
              title={`Female: ${stats.femalePercent}%`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#737373] font-mono">
            <span>{stats.malePercent}% Wiilal</span>
            <span>{stats.femalePercent}% Gabdho</span>
          </div>
        </div>
      </div>

      {/* 3. ADVANCED SEARCH, FILTER & ACTION BAR */}
      <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ku raadi Magac, ID, Fasal, Taleefanka waalidka, Roll Number..."
              className="w-full pl-10 pr-9 py-2 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed] placeholder-[#555555]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-1 text-[#737373] hover:text-white"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Class Filter */}
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Dhammaan Fasallada (All Classes)</option>
              {classes.map(c => (
                <option key={c.id} value={c.className}>{c.className}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Dhammaan Xaaladaha (All Status)</option>
              <option value="active">Active (Firfircoon)</option>
              <option value="inactive">Inactive (Aan Firfircoonayn)</option>
              <option value="archived">Archived (La Kaydiyey)</option>
            </select>

            {/* Gender Filter */}
            <select
              value={selectedGenderFilter}
              onChange={(e) => setSelectedGenderFilter(e.target.value)}
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Lab & Dhedig (All Genders)</option>
              <option value="Male">Wiilal (Male)</option>
              <option value="Female">Gabdho (Female)</option>
            </select>

            {/* Fee Filter */}
            <select
              value={selectedFeeFilter}
              onChange={(e) => setSelectedFeeFilter(e.target.value)}
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Biilka Bisha (All Fee Status)</option>
              <option value="paid">Lacagta La Bixiyey (Paid)</option>
              <option value="partial">Qabyo (Partial)</option>
              <option value="unpaid">Aan La Bixin (Unpaid)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="name_asc">Magaca (A - Z)</option>
              <option value="name_desc">Magaca (Z - A)</option>
              <option value="date_desc">Ugu Dambeeyey (Newest)</option>
              <option value="date_asc">Ugu Horreeyey (Oldest)</option>
              <option value="class">Fasalka (Class)</option>
            </select>

            {/* Reset Filters */}
            {(searchQuery || selectedClassFilter !== 'all' || selectedStatusFilter !== 'all' || selectedGenderFilter !== 'all' || selectedFeeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClassFilter('all');
                  setSelectedStatusFilter('all');
                  setSelectedGenderFilter('all');
                  setSelectedFeeFilter('all');
                  setSortBy('name_asc');
                }}
                className="px-2.5 py-2 text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 bg-rose-500/10 rounded-sm flex items-center gap-1"
                title="Reset All Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Results Summary & Page Size */}
        <div className="flex items-center justify-between text-[11px] text-[#737373] pt-2 border-t border-[#ffffff08]">
          <div className="flex items-center gap-2">
            <span>
              Waxaa la helay <strong className="text-white font-mono">{filteredStudents.length}</strong> arday
            </span>
            {selectedStudentIds.length > 0 && (
              <span className="text-[#c4b5fd] font-bold">
                ({selectedStudentIds.length} la doortay)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Boggii:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-[#0a0a0a] text-[11px] text-[#cccccc] border border-[#ffffff15] px-1.5 py-0.5 rounded-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BULK ACTIONS TOOLBAR (Appears when items are selected) */}
      <AnimatePresence>
        {selectedStudentIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#1e1435] border border-[#7c3aed]/40 rounded-sm p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#7c3aed] text-white flex items-center justify-center font-bold text-xs font-mono">
                {selectedStudentIds.length}
              </span>
              <div>
                <p className="text-xs font-bold text-white">Arday ayaa la doortay (Students Selected)</p>
                <p className="text-[10px] text-[#c4b5fd]">Dooro hawsha aad rabto inaad wadajir ugu fuliso</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Change Class */}
              <button
                onClick={() => {
                  setBulkTargetClass(classes[0]?.className || '');
                  setBulkActionModal({ isOpen: true, action: 'change_class' });
                }}
                className="px-3 py-1.5 rounded-sm bg-[#ffffff10] hover:bg-[#ffffff20] text-xs font-semibold text-white transition-colors"
              >
                U wareeji Fasal Cusub
              </button>

              {/* Bulk Change Status */}
              <button
                onClick={() => {
                  setBulkTargetStatus('active');
                  setBulkActionModal({ isOpen: true, action: 'change_status' });
                }}
                className="px-3 py-1.5 rounded-sm bg-[#ffffff10] hover:bg-[#ffffff20] text-xs font-semibold text-white transition-colors"
              >
                Beddel Status
              </button>

              {/* Bulk Export Selected */}
              <button
                onClick={() => {
                  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
                  exportToExcel(selectedStudents, `DugsiPro_Selected_${selectedStudents.length}_Students.xlsx`);
                }}
                className="px-3 py-1.5 rounded-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Dhoofi kuwa la doortay
              </button>

              {/* Bulk Archive */}
              <button
                onClick={() => setBulkActionModal({ isOpen: true, action: 'archive' })}
                className="px-3 py-1.5 rounded-sm bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Kaydi (Archive)
              </button>

              {/* Bulk Delete */}
              <button
                onClick={() => setBulkActionModal({ isOpen: true, action: 'delete' })}
                className="px-3 py-1.5 rounded-sm bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tirtir (Delete)
              </button>

              {/* Clear Selection */}
              <button
                onClick={() => setSelectedStudentIds([])}
                className="p-1.5 text-[#a3a3a3] hover:text-white"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. STUDENTS CONTENT VIEW (TABLE OR CARDS) */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#ffffff10] text-[10px] uppercase font-bold tracking-widest text-[#737373]">
                  {/* Select All Checkbox */}
                  <th className="px-4 py-3.5 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="p-1 text-[#888888] hover:text-white transition-colors"
                      title={isAllSelected ? "Deselect All" : "Select All on this Page"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#7c3aed]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5">Ardayga / Student</th>
                  <th className="px-4 py-3.5">ID / Roll No</th>
                  <th className="px-4 py-3.5">Fasalka / Class</th>
                  <th className="px-4 py-3.5">Lab/Dhedig</th>
                  <th className="px-4 py-3.5">Waalidka / Guardian</th>
                  <th className="px-4 py-3.5">Biilka Bisha</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Hawlaha / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff08] text-xs">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Users className="w-10 h-10 text-[#333333]" />
                        <p className="text-sm font-semibold text-[#888888]">Wax arday ah oo buuxiyey shuruudaha lama helin</p>
                        <p className="text-xs text-[#555555]">Isku day inaad beddesho erayada raadinta ama filter-yada aad dooratay.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    const feeInfo = getStudentFeeStatus(student.id);

                    return (
                      <tr 
                        key={student.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-[#7c3aed]/10' : 'hover:bg-[#ffffff02]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleSelectOne(student.id)}
                            className="p-1 text-[#888888] hover:text-white transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#7c3aed]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Student Name & Avatar */}
                        <td className="px-4 py-3">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => setSelectedProfileStudent(student)}
                            title="Fiiri 360° Profile-ka Ardayga"
                          >
                            {student.photo ? (
                              <img
                                src={student.photo}
                                alt={student.fullName}
                                className="w-9 h-9 rounded-full object-cover border border-[#ffffff15] group-hover:border-[#7c3aed] transition-colors"
                              />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                                student.gender === 'Female' 
                                  ? 'bg-[#ec4899]/15 border-[#ec4899]/30 text-[#f472b6]' 
                                  : 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#60a5fa]'
                              }`}>
                                {student.fullName.trim() ? student.fullName.trim().charAt(0) : '?'}
                              </div>
                            )}

                            <div>
                              <p className="font-bold text-[#f0f0f0] group-hover:text-[#c4b5fd] transition-colors flex items-center gap-1.5">
                                <span>{student.fullName}</span>
                                {student.status === 'archived' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-slate-700/50 text-slate-300 font-mono">Archived</span>
                                )}
                              </p>
                              <p className="text-[10px] text-[#737373] font-mono">
                                Reg: {student.createdAt || "N/A"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Student ID & Roll No */}
                        <td className="px-4 py-3 font-mono text-[11px] text-[#a3a3a3]">
                          <div>
                            <span className="px-1.5 py-0.5 rounded-xs bg-[#ffffff05] border border-[#ffffff08] text-white">
                              {student.id}
                            </span>
                            {student.rollNumber && (
                              <p className="text-[9px] text-[#737373] mt-0.5">
                                Roll: {student.rollNumber}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Class & Section */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[#e5e5e5]">
                            {student.class}
                          </span>
                          {student.section && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-xs bg-[#ffffff08] text-[9px] text-[#a3a3a3] font-mono">
                              Sec {student.section}
                            </span>
                          )}
                        </td>

                        {/* Gender */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                            student.gender === 'Female' ? 'text-[#f472b6]' : 'text-[#60a5fa]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${student.gender === 'Female' ? 'bg-[#ec4899]' : 'bg-[#3b82f6]'}`} />
                            {student.gender}
                          </span>
                        </td>

                        {/* Guardian Contact */}
                        <td className="px-4 py-3">
                          {student.guardianPhone ? (
                            <a
                              href={`tel:${student.guardianPhone}`}
                              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#c4b5fd] hover:text-white hover:underline transition-colors"
                              title="Wac Telefoonka Waalidka"
                            >
                              <Phone className="w-3 h-3 text-[#7c3aed]" />
                              <span>{student.guardianPhone}</span>
                            </a>
                          ) : (
                            <span className="text-[#555555] font-mono text-xs">-</span>
                          )}
                          {student.guardianName && (
                            <p className="text-[10px] text-[#737373] mt-0.5">
                              {student.guardianName}
                            </p>
                          )}
                        </td>

                        {/* Fee Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${
                            feeInfo.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : feeInfo.status === 'partial'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            <DollarSign className="w-2.5 h-2.5" />
                            <span>{feeInfo.status}</span>
                          </span>
                          {feeInfo.status !== 'paid' && feeInfo.balance > 0 && (
                            <p className="text-[9px] text-[#888888] font-mono mt-0.5">
                              Dhiman: {settings.currency} {feeInfo.balance}
                            </p>
                          )}
                        </td>

                        {/* Lifecycle Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${
                            student.status === 'active'
                              ? 'bg-[#7c3aed]/15 text-[#c4b5fd] border-[#7c3aed]/30'
                              : student.status === 'archived'
                              ? 'bg-slate-700/30 text-slate-300 border-slate-600/40'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}>
                            {student.status || 'active'}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Profile 360 */}
                            <button
                              onClick={() => setSelectedProfileStudent(student)}
                              className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#c4b5fd] hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/30 transition-colors"
                              title="360° Profile-ka Ardayga"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(student)}
                              className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-white hover:bg-[#ffffff10] transition-colors"
                              title="Tafatir (Edit Student)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Archive / Restore */}
                            {student.status === 'archived' ? (
                              <button
                                onClick={() => handleQuickStatusChange(student, 'active')}
                                className="p-1.5 rounded-sm border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title="Ka bixi Kaydka (Restore to Active)"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuickStatusChange(student, 'archived')}
                                className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                title="Kaydi Ardayga (Archive Student)"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirmStudent(student)}
                              className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Tirtir (Delete Student)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      ) : (
        /* CARDS GRID VIEW (Responsive / Mobile-First) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedStudents.map((student) => {
            const isSelected = selectedStudentIds.includes(student.id);
            const feeInfo = getStudentFeeStatus(student.id);

            return (
              <div
                key={student.id}
                className={`bg-[#0f0f0f] border rounded-sm p-4.5 space-y-3 transition-all relative ${
                  isSelected 
                    ? 'border-[#7c3aed] bg-[#7c3aed]/5' 
                    : 'border-[#ffffff10] hover:border-[#ffffff25]'
                }`}
              >
                {/* Top card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleSelectOne(student.id)}
                      className="p-1 text-[#888888] hover:text-white"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4 text-[#7c3aed]" /> : <Square className="w-4 h-4" />}
                    </button>
                    {student.photo ? (
                      <img src={student.photo} alt={student.fullName} className="w-12 h-12 rounded-full object-cover border border-[#ffffff15]" />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm uppercase border ${
                        student.gender === 'Female' ? 'bg-[#ec4899]/15 border-[#ec4899]/30 text-[#f472b6]' : 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#60a5fa]'
                      }`}>
                        {student.fullName.trim() ? student.fullName.trim().charAt(0) : '?'}
                      </div>
                    )}
                    <div>
                      <h4 
                        onClick={() => setSelectedProfileStudent(student)}
                        className="font-bold text-white hover:text-[#c4b5fd] cursor-pointer transition-colors"
                      >
                        {student.fullName}
                      </h4>
                      <p className="text-[10px] text-[#888888] font-mono">ID: {student.id}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${
                    student.status === 'active' ? 'bg-[#7c3aed]/15 text-[#c4b5fd] border-[#7c3aed]/30' :
                    student.status === 'archived' ? 'bg-slate-700/30 text-slate-300 border-slate-600/40' :
                    'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}>
                    {student.status || 'active'}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#ffffff08]">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">Fasalka:</span>
                    <span className="font-semibold text-[#e5e5e5]">{student.class} {student.section ? `(${student.section})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">Lab/Dhedig:</span>
                    <span className={student.gender === 'Female' ? 'text-[#f472b6]' : 'text-[#60a5fa]'}>{student.gender}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">Telefoonka:</span>
                    {student.guardianPhone ? (
                      <a href={`tel:${student.guardianPhone}`} className="text-[#c4b5fd] hover:underline font-mono text-[11px]">
                        {student.guardianPhone}
                      </a>
                    ) : (
                      <span className="text-[#555555]">-</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">Biilka Bisha:</span>
                    <span className={`text-[10px] font-bold uppercase ${
                      feeInfo.status === 'paid' ? 'text-emerald-400' : feeInfo.status === 'partial' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {feeInfo.status}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[#ffffff08]">
                  <button
                    onClick={() => setSelectedProfileStudent(student)}
                    className="text-xs text-[#c4b5fd] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> 360° Profile
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(student)}
                      className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmStudent(student)}
                      className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-3.5">
          <p className="text-xs text-[#737373]">
            Showing <strong className="text-white font-mono">{((currentPage - 1) * pageSize) + 1}</strong> to{' '}
            <strong className="text-white font-mono">
              {Math.min(currentPage * pageSize, filteredStudents.length)}
            </strong> of <strong className="text-white font-mono">{filteredStudents.length}</strong> students
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-[#cccccc] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#ffffff05] transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-[#e5e5e5] px-3 py-1 bg-[#ffffff05] border border-[#ffffff10] rounded-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-[#cccccc] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#ffffff05] transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
          onClose={() => setSelectedProfileStudent(null)}
          onEditStudent={(st) => {
            setSelectedProfileStudent(null);
            handleOpenEditModal(st);
          }}
          theme={theme}
        />
      )}

      {/* B. ADD / EDIT STUDENT MULTI-SECTION MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm w-full max-w-2xl shadow-2xl relative my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#141414] border-b border-[#ffffff10] p-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif italic text-white">
                  {editingStudent ? 'Tafatir Ardayga (Edit Student)' : 'Diiwaangeli Arday Cusub (Register New Student)'}
                </h2>
                <p className="text-[10px] text-[#888888] uppercase tracking-widest mt-0.5">
                  Dugsi Pro 2026 — Smart Student Registration Engine
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 text-[#737373] hover:text-white rounded-sm hover:bg-[#ffffff05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Section Navigation Tabs */}
            <div className="flex border-b border-[#ffffff10] bg-[#0a0a0a]">
              <button
                type="button"
                onClick={() => setFormStep('identity')}
                className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${
                  formStep === 'identity' 
                    ? 'border-[#7c3aed] text-white bg-[#7c3aed]/5' 
                    : 'border-transparent text-[#737373] hover:text-white'
                }`}
              >
                1. Macluumaadka Ardayga
              </button>
              <button
                type="button"
                onClick={() => setFormStep('enrollment')}
                className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${
                  formStep === 'enrollment' 
                    ? 'border-[#7c3aed] text-white bg-[#7c3aed]/5' 
                    : 'border-transparent text-[#737373] hover:text-white'
                }`}
              >
                2. Fasalka & Diiwaanka
              </button>
              <button
                type="button"
                onClick={() => setFormStep('guardian')}
                className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${
                  formStep === 'guardian' 
                    ? 'border-[#7c3aed] text-white bg-[#7c3aed]/5' 
                    : 'border-transparent text-[#737373] hover:text-white'
                }`}
              >
                3. Waalidka & Xiriirka
              </button>
            </div>

            {/* Real-time Duplicate Alert Banner */}
            {duplicateWarning.found && (
              <div className="bg-amber-500/15 border-b border-amber-500/30 p-3 flex items-start gap-3 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px]">⚠️ Digniin: Arday shabbaha ayaa jira (Potential Duplicate)</p>
                  <p className="text-[11px] text-[#e5e5e5] mt-0.5">
                    {duplicateWarning.reason}: <strong className="text-amber-300">{duplicateWarning.existingStudent?.fullName}</strong> ({duplicateWarning.existingStudent?.class}).
                  </p>
                </div>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSubmitStudentForm} className="p-6 space-y-6">
              {/* SECTION 1: IDENTITY */}
              {formStep === 'identity' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Photo Upload & Preview Box */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-sm bg-[#0a0a0a] border border-[#ffffff10]">
                    <div className="relative group">
                      {formData.photo ? (
                        <img
                          src={formData.photo}
                          alt="Student Preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-[#7c3aed]"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-[#1e1e1e] border-2 border-dashed border-[#444444] flex flex-col items-center justify-center text-[#737373]">
                          <Camera className="w-6 h-6" />
                          <span className="text-[9px] mt-1 uppercase tracking-wider">Sawir</span>
                        </div>
                      )}
                      {formData.photo && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                          className="absolute -top-1 -right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                          title="Tirtir Sawirka"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1.5">
                      <p className="text-xs font-bold text-white">Sawirka Ardayga (Student Photo)</p>
                      <p className="text-[10px] text-[#888888]">
                        Jiid sawirka halkan ama ka dooro kombuyutarka. Xajmiga ugu sarreeya 5MB.
                      </p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#ffffff10] hover:bg-[#ffffff15] text-xs font-semibold text-[#c4b5fd] cursor-pointer transition-colors border border-[#ffffff10]">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Dooro Sawir (Select Photo)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoFileChange(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                      Magaca Ardayga oo Buuxa (Full Name) *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        if (formErrors.fullName) setFormErrors(prev => ({ ...prev, fullName: '' }));
                      }}
                      placeholder="Tusaale: Maxamed Cali Jaamac"
                      className={`w-full px-4 py-2.5 rounded-sm border bg-[#0a0a0a] text-xs text-white focus:outline-none ${
                        formErrors.fullName ? 'border-rose-500' : 'border-[#ffffff15] focus:border-[#7c3aed]'
                      }`}
                      required
                    />
                    {formErrors.fullName && (
                      <p className="text-[10px] text-rose-400 font-semibold">{formErrors.fullName}</p>
                    )}
                  </div>

                  {/* Student ID & Gender Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Student ID / Admission No
                      </label>
                      <input
                        type="text"
                        value={formData.id}
                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                        disabled={!!editingStudent}
                        className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs font-mono text-[#c4b5fd] focus:outline-none focus:border-[#7c3aed] disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Lab/Dhedig (Gender) *
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                      >
                        <option value="Male">Lab (Male)</option>
                        <option value="Female">Dhedig (Female)</option>
                      </select>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                      Taariikhda Dhalashada (Date of Birth)
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: ENROLLMENT */}
              {formStep === 'enrollment' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Class */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Fasalka (Class) *
                      </label>
                      <select
                        value={formData.class}
                        onChange={(e) => {
                          setFormData({ ...formData, class: e.target.value });
                          if (formErrors.class) setFormErrors(prev => ({ ...prev, class: '' }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-sm border bg-[#0a0a0a] text-xs text-white focus:outline-none ${
                          formErrors.class ? 'border-rose-500' : 'border-[#ffffff15] focus:border-[#7c3aed]'
                        }`}
                        required
                      >
                        <option value="">-- Dooro Fasal --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.className}>{c.className}</option>
                        ))}
                      </select>
                      {formErrors.class && (
                        <p className="text-[10px] text-rose-400 font-semibold">{formErrors.class}</p>
                      )}
                    </div>

                    {/* Section */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Qaybta (Section)
                      </label>
                      <input
                        type="text"
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        placeholder="Tusaale: A, B, ama C"
                        className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Roll Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                        placeholder="Tusaale: 01"
                        className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Xaaladda Ardayga (Status) *
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                      >
                        <option value="active">Active (Firfircoon)</option>
                        <option value="inactive">Inactive (Aan Firfircoonayn)</option>
                        <option value="archived">Archived (La Kaydiyey)</option>
                      </select>
                    </div>
                  </div>

                  {/* Registration Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                      Taariikhda Diiwaangelinta (Registration Date)
                    </label>
                    <input
                      type="date"
                      value={formData.createdAt}
                      onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: GUARDIAN & CONTACT */}
              {formStep === 'guardian' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Guardian Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Magaca Waalidka / Mas'uulka (Guardian Name)
                      </label>
                      <input
                        type="text"
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        placeholder="Tusaale: Cali Jaamac"
                        className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>

                    {/* Guardian Phone */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                        Telefoonka Waalidka (Guardian Phone)
                      </label>
                      <input
                        type="text"
                        value={formData.guardianPhone}
                        onChange={(e) => {
                          setFormData({ ...formData, guardianPhone: e.target.value });
                          if (formErrors.guardianPhone) setFormErrors(prev => ({ ...prev, guardianPhone: '' }));
                        }}
                        placeholder="+252 61 xxx xxxx"
                        className={`w-full px-4 py-2.5 rounded-sm border bg-[#0a0a0a] text-xs text-white font-mono focus:outline-none ${
                          formErrors.guardianPhone ? 'border-rose-500' : 'border-[#ffffff15] focus:border-[#7c3aed]'
                        }`}
                      />
                      {formErrors.guardianPhone && (
                        <p className="text-[10px] text-rose-400 font-semibold">{formErrors.guardianPhone}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                      Cinwaanka Guriga / Deegaanka (Home Address)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Degmada, Xaafadda, ama Laanta..."
                      className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-[#ffffff10] flex items-center justify-between">
                <div>
                  {formStep === 'enrollment' && (
                    <button
                      type="button"
                      onClick={() => setFormStep('identity')}
                      className="px-4 py-2 rounded-sm bg-[#ffffff08] hover:bg-[#ffffff15] text-xs text-[#cccccc] font-semibold"
                    >
                      Dib ugu noqo (Back)
                    </button>
                  )}
                  {formStep === 'guardian' && (
                    <button
                      type="button"
                      onClick={() => setFormStep('enrollment')}
                      className="px-4 py-2 rounded-sm bg-[#ffffff08] hover:bg-[#ffffff15] text-xs text-[#cccccc] font-semibold"
                    >
                      Dib ugu noqo (Back)
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
                  >
                    Ka noqo (Cancel)
                  </button>

                  {formStep !== 'guardian' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (formStep === 'identity') {
                          if (!formData.fullName.trim()) {
                            setFormErrors({ fullName: 'Magaca ardayga waa qasab' });
                            return;
                          }
                          setFormStep('enrollment');
                        } else if (formStep === 'enrollment') {
                          if (!formData.class) {
                            setFormErrors({ class: 'Fasalka waa qasab' });
                            return;
                          }
                          setFormStep('guardian');
                        }
                      }}
                      className="px-5 py-2 rounded-sm bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold uppercase tracking-wider"
                    >
                      Xiga (Next Step)
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-6 py-2 rounded-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                    >
                      {formSubmitting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{editingStudent ? 'Cusbooneysii (Update)' : 'Kaydi Ardayga (Save Student)'}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. ENTERPRISE BULK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm w-full max-w-3xl shadow-2xl relative my-8 overflow-hidden">
            {/* Header */}
            <div className="bg-[#141414] border-b border-[#ffffff10] p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-serif italic text-white">Soo Gelinta Ardayda (Bulk Excel Import)</h2>
                  <p className="text-[10px] text-[#888888] uppercase tracking-widest mt-0.5">
                    Ku dar boqolaal arday hal mar adigoo isticmaalaya faylka Excel
                  </p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-2 text-[#737373] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {importStep === 'upload' && (
                <div className="space-y-6">
                  {/* Step Guide */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm space-y-1">
                      <span className="text-[10px] font-mono text-[#7c3aed] font-bold">TALLAABADA 1</span>
                      <p className="font-bold text-white">Soo Dejiso Template-ka</p>
                      <p className="text-[11px] text-[#888888]">Ka bilow template-ka rasmiga ah ee nidaamka ku diyaarsan.</p>
                      <button
                        onClick={downloadTemplate}
                        className="mt-2 text-xs text-[#c4b5fd] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3 h-3" /> Soo Dejiso Hada
                      </button>
                    </div>

                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm space-y-1">
                      <span className="text-[10px] font-mono text-[#7c3aed] font-bold">TALLAABADA 2</span>
                      <p className="font-bold text-white">Buuxi Macluumaadka</p>
                      <p className="text-[11px] text-[#888888]">Geli magacyada, fasallada saxda ah, iyo telefoonada waalidiinta.</p>
                    </div>

                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm space-y-1">
                      <span className="text-[10px] font-mono text-[#7c3aed] font-bold">TALLAABADA 3</span>
                      <p className="font-bold text-white">Soo Geli oo Baar</p>
                      <p className="text-[11px] text-[#888888]">Nidaamku wuxuu xaqiijinayaa khaladaadka ka hor inta uusan kaydin.</p>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <div className="border-2 border-dashed border-[#ffffff20] hover:border-[#7c3aed] rounded-sm p-8 text-center bg-[#0a0a0a] transition-colors flex flex-col items-center justify-center gap-3">
                    <div className="p-3 rounded-full bg-[#7c3aed]/10 text-[#c4b5fd]">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Dooro ama ku soo tuur faylka Excel (.xlsx, .xls)</p>
                      <p className="text-xs text-[#737373] mt-1">Xajmiga ugu sarreeya ee faylku waa 10MB</p>
                    </div>
                    <label className="mt-2 px-5 py-2.5 rounded-sm bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-colors">
                      Baar Kombuyutarka (Browse File)
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {importStep === 'preview' && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff10] rounded-sm">
                      <span className="text-[9px] uppercase tracking-widest text-[#888888] font-bold block">Wadarta Safafka</span>
                      <span className="text-xl font-bold font-mono text-white">{importRows.length}</span>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                      <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold block">Kuwa Saxda ah</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">{importValidCount}</span>
                    </div>
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-sm">
                      <span className="text-[9px] uppercase tracking-widest text-rose-400 font-bold block">Kuwa Ciladaysan</span>
                      <span className="text-xl font-bold font-mono text-rose-400">{importErrorCount}</span>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-2 border-b border-[#ffffff10] pb-2">
                    <button
                      onClick={() => setImportFilterTab('all')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        importFilterTab === 'all' ? 'bg-[#ffffff15] text-white' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Dhammaan ({importRows.length})
                    </button>
                    <button
                      onClick={() => setImportFilterTab('valid')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        importFilterTab === 'valid' ? 'bg-emerald-500/20 text-emerald-300' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Sax Kaliya ({importValidCount})
                    </button>
                    <button
                      onClick={() => setImportFilterTab('invalid')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        importFilterTab === 'invalid' ? 'bg-rose-500/20 text-rose-300' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Khaladaad leh ({importErrorCount})
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-64 overflow-y-auto border border-[#ffffff10] rounded-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0a0a0a] text-[9px] uppercase tracking-widest text-[#737373] sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Magaca</th>
                          <th className="px-3 py-2">Fasalka</th>
                          <th className="px-3 py-2">Telefoonka</th>
                          <th className="px-3 py-2">Natiijada Hubinta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ffffff08]">
                        {importRows
                          .filter(r => importFilterTab === 'all' ? true : importFilterTab === 'valid' ? r.isValid : !r.isValid)
                          .map((row, idx) => (
                            <tr key={idx} className={row.isValid ? 'hover:bg-[#ffffff02]' : 'bg-rose-500/5'}>
                              <td className="px-3 py-2 font-mono text-[10px] text-[#888888]">#{row.rowNum}</td>
                              <td className="px-3 py-2 font-bold text-white">{row.data.fullName || '-'}</td>
                              <td className="px-3 py-2 text-[#cccccc]">{row.data.class || '-'}</td>
                              <td className="px-3 py-2 font-mono text-[#888888]">{row.data.guardianPhone || '-'}</td>
                              <td className="px-3 py-2">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-3 h-3" /> Sax (Valid)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rose-400 font-medium">
                                    ⚠️ {row.errors.join(', ')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importStep === 'importing' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <RefreshCw className="w-10 h-10 text-[#7c3aed] animate-spin" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Fadlan sug, ardayda ayaa la gelinayaa...</h3>
                    <p className="text-xs text-[#888888] mt-1">Ha xirin daaqadda inta hawshu socoto.</p>
                  </div>
                  <div className="w-64 bg-[#1e1e1e] h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${importProgress}%` }}
                      className="bg-[#7c3aed] h-full transition-all duration-300"
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#c4b5fd]">{importProgress}%</span>
                </div>
              )}
            </div>

            {/* Footer */}
            {importStep !== 'importing' && (
              <div className="bg-[#141414] border-t border-[#ffffff10] p-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (importStep === 'preview') setImportStep('upload');
                    else setShowImportModal(false);
                  }}
                  className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
                >
                  {importStep === 'preview' ? 'Dib u dooro fayl' : 'Xir (Close)'}
                </button>

                {importStep === 'preview' && (
                  <button
                    type="button"
                    onClick={handleCommitImport}
                    disabled={importValidCount === 0}
                    className="px-5 py-2 rounded-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    <span>Soo Geli Kuwa Saxda ah ({importValidCount} Arday)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. BULK ACTION MODAL */}
      {bulkActionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
              <h3 className="text-lg font-bold text-white">
                {bulkActionModal.action === 'change_class' && 'U wareeji Fasal Cusub'}
                {bulkActionModal.action === 'change_status' && 'Beddel Status-ka Ardayda'}
                {bulkActionModal.action === 'archive' && 'Kaydi Ardayda (Archive)'}
                {bulkActionModal.action === 'delete' && 'Tirtir Ardayda (Delete)'}
              </h3>
              <button
                onClick={() => setBulkActionModal({ isOpen: false, action: null })}
                className="p-1 text-[#888888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#cccccc]">
              Waxaad dooratay <strong className="text-white font-mono">{selectedStudentIds.length}</strong> arday.
            </p>

            {bulkActionModal.action === 'change_class' && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">Dooro Fasalka Cusub</label>
                <select
                  value={bulkTargetClass}
                  onChange={(e) => setBulkTargetClass(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] text-xs text-white border border-[#ffffff15] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.className}>{c.className}</option>
                  ))}
                </select>
              </div>
            )}

            {bulkActionModal.action === 'change_status' && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">Dooro Xaaladda Cusub</label>
                <select
                  value={bulkTargetStatus}
                  onChange={(e) => setBulkTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] text-xs text-white border border-[#ffffff15] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="active">Active (Firfircoon)</option>
                  <option value="inactive">Inactive (Aan firfircoonayn)</option>
                  <option value="archived">Archived (La kaydiyey)</option>
                </select>
              </div>
            )}

            {bulkActionModal.action === 'archive' && (
              <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-sm text-xs text-slate-300">
                Ardayda la kaydiyo kama muuqan doonaan liisaska firfircoon laakiin taariikhdooda imtixaanaadka iyo lacagaha waa la dhowri doonaa.
              </div>
            )}

            {bulkActionModal.action === 'delete' && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-sm text-xs text-rose-300 space-y-1">
                <p className="font-bold">⚠️ Digniin Weyn:</p>
                <p>Hawshani waxay tirtiri doontaa dhammaan xogta {selectedStudentIds.length} arday, biilashooda, iyo xaadirkooda. Tani dib uma noqonayso!</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkActionModal({ isOpen: false, action: null })}
                className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
              >
                Ka noqo
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkAction}
                disabled={bulkOperating}
                className={`px-5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 ${
                  bulkActionModal.action === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
                }`}
              >
                {bulkOperating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xaqiiji Hawsha (Confirm)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. SINGLE STUDENT DELETE CONFIRM MODAL */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0f0f] border border-rose-500/30 rounded-sm w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Ma hubtaa inaad tirtirto?</h3>
            </div>
            <p className="text-xs text-[#cccccc] leading-relaxed">
              Ardayga: <strong className="text-white">{deleteConfirmStudent.fullName}</strong> ({deleteConfirmStudent.class})
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-sm text-xs text-amber-300">
              💡 <strong>Talo:</strong> Halkii aad ardayga tirtiri lahayd, waxaad dooran kartaa inaad <strong>Archive</strong> garayso si xogta lacagaha iyo natiijooyinka imtixaanaadku u badbaadaan.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmStudent(null)}
                className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
              >
                Ka noqo
              </button>
              <button
                onClick={async () => {
                  await handleQuickStatusChange(deleteConfirmStudent, 'archived');
                  setDeleteConfirmStudent(null);
                }}
                className="px-4 py-2 rounded-sm bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white uppercase tracking-wider"
              >
                Kaydi Kaliya (Archive)
              </button>
              <button
                onClick={async () => {
                  const success = await onDeleteStudent(deleteConfirmStudent.id);
                  if (success) {
                    showToast("Ardayga waa la tirtiray", "success");
                    setDeleteConfirmStudent(null);
                  }
                }}
                className="px-4 py-2 rounded-sm bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white uppercase tracking-wider"
              >
                Tirtir (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
