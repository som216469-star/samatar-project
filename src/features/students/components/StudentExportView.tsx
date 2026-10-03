import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  Table
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, SchoolClass, FeeRecord } from '../../../types';
import { StudentSubSection } from '../../../app/navigationConfig';
import { PageContainer, PageHeader } from '../../../components/layout/PageLayout';
import { downloadStudentSpreadsheet, rowsToCsv } from '../../../lib/studentSpreadsheet';
import { Badge, Button, Card } from '../../../components/ui/primitives';
import StudentWorkspaceNav from './StudentWorkspaceNav';

interface StudentExportViewProps {
  students: Student[];
  filteredStudents?: Student[];
  activeFilterCount?: number;
  classes: SchoolClass[];
  fees: FeeRecord[];
  settings: {
    schoolName: string;
    currency: string;
    [key: string]: any;
  };
  onCancel: () => void;
  onNavigateSubSection?: (subSection: StudentSubSection) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
  canViewFinance?: boolean;
}

export default function StudentExportView({
  students,
  filteredStudents,
  activeFilterCount = 0,
  classes,
  fees,
  settings,
  onCancel,
  onNavigateSubSection,
  showToast,
  canViewFinance = false
}: StudentExportViewProps) {
  const [scope, setScope] = useState<'filtered' | 'all' | 'active' | 'inactive' | 'archived' | 'class'>(() =>
    filteredStudents && activeFilterCount > 0 ? 'filtered' : 'all'
  );
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.className || '');
  const [selectedGender, setSelectedGender] = useState<'all' | 'Male' | 'Female'>('all');
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');

  const [selectedColumns, setSelectedColumns] = useState({
    id: true,
    fullName: true,
    class: true,
    section: true,
    rollNumber: true,
    gender: true,
    dateOfBirth: true,
    guardianPhone: true,
    guardianPhoneAlt: false,
    emergencyContact: false,
    guardianName: true,
    guardianRelationship: true,
    nationalId: false,
    previousSchool: true,
    bloodGroup: false,
    medicalNotes: false,
    status: true,
    feeStatus: canViewFinance,
    address: true,
    registrationDate: true,
    lastUpdated: true
  });

  const targetStudents = useMemo(() => {
    let base: Student[] = students;
    if (scope === 'filtered' && filteredStudents) {
      base = filteredStudents;
    } else if (scope === 'active') {
      base = students.filter((s) => (s.status || 'active') === 'active');
    } else if (scope === 'inactive') {
      base = students.filter((s) => s.status === 'inactive');
    } else if (scope === 'archived') {
      base = students.filter((s) => s.status === 'archived');
    } else if (scope === 'class' && selectedClass) {
      base = students.filter((s) => s.class === selectedClass);
    }

    if (selectedGender !== 'all') {
      base = base.filter((s) => s.gender === selectedGender);
    }
    return base;
  }, [students, filteredStudents, scope, selectedClass, selectedGender]);

  const monthsList = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  const currentMonth = monthsList[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const currentMonthFeeByStudent = useMemo(() => {
    const map = new Map<string, FeeRecord>();
    for (const fee of fees) {
      if (
        fee.month === currentMonth &&
        fee.year === currentYear &&
        !map.has(fee.studentId)
      ) {
        map.set(fee.studentId, fee);
      }
    }
    return map;
  }, [fees, currentMonth, currentYear]);

  const getStudentFeeStatus = (studentId: string) => {
    const studentFee = currentMonthFeeByStudent.get(studentId);
    if (!studentFee) {
      return { status: 'unpaid', paid: 0, balance: Number(settings.feeAmount) || 0 };
    }

    const amount = Number(studentFee.amount) || 0;
    const paid = Number(studentFee.paidAmount) || 0;
    return {
      status: studentFee.status,
      paid,
      balance: Math.max(0, amount - paid)
    };
  };

  const handleToggleAllColumns = (val: boolean) => {
    setSelectedColumns({
      id: val,
      fullName: val,
      class: val,
      section: val,
      rollNumber: val,
      gender: val,
      dateOfBirth: val,
      guardianPhone: val,
      guardianPhoneAlt: val,
      emergencyContact: val,
      guardianName: val,
      guardianRelationship: val,
      nationalId: val,
      previousSchool: val,
      bloodGroup: val,
      medicalNotes: val,
      status: val,
      feeStatus: canViewFinance && val,
      address: val,
      registrationDate: val,
      lastUpdated: val
    });
  };

  const handleExport = async () => {
    if (targetStudents.length === 0) {
      showToast('Ma jiraan arday buuxisa shuruudaha la doortay', 'warning');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'excel' || format === 'csv') {
      const rows = targetStudents.map((s, idx) => {
        const fee = getStudentFeeStatus(s.id);
        const row: Record<string, any> = { '#': idx + 1 };

        if (selectedColumns.id) row['Student ID'] = s.id;
        if (selectedColumns.fullName) row['Full Name'] = s.fullName;
        if (selectedColumns.class) row['Class'] = s.class;
        if (selectedColumns.section) row['Section'] = s.section || '-';
        if (selectedColumns.rollNumber) row['Roll Number'] = s.rollNumber || '-';
        if (selectedColumns.gender) row['Gender'] = s.gender;
        if (selectedColumns.dateOfBirth) row['Date of Birth'] = s.dateOfBirth || '-';
        if (selectedColumns.guardianPhone) row['Guardian Phone'] = s.guardianPhone || '-';
        if (selectedColumns.guardianPhoneAlt) row['Guardian Phone Alt'] = s.guardianPhoneAlt || '-';
        if (selectedColumns.emergencyContact) row['Emergency Contact'] = s.emergencyContact || '-';
        if (selectedColumns.guardianName) row['Guardian Name'] = s.guardianName || '-';
        if (selectedColumns.guardianRelationship) row['Guardian Relationship'] = s.guardianRelationship || '-';
        if (selectedColumns.nationalId) row['National ID'] = s.nationalId || '-';
        if (selectedColumns.previousSchool) row['Previous School'] = s.previousSchool || '-';
        if (selectedColumns.bloodGroup) row['Blood Group'] = s.bloodGroup || '-';
        if (selectedColumns.medicalNotes) row['Medical Notes'] = s.medicalNotes || '-';
        if (selectedColumns.status) row['Status'] = s.status || 'active';
        if (canViewFinance && selectedColumns.feeStatus && fee)
          row['Fee Status'] = `${fee.status} (Bal: ${settings.currency} ${fee.balance})`;
        if (selectedColumns.address) row['Address'] = s.address || '-';
        if (selectedColumns.registrationDate) row['Registration Date'] = s.createdAt || '-';
        if (selectedColumns.lastUpdated)
          row['Last Updated'] = (s.updatedAt || s.createdAt || '-').split('T')[0];

        return row;
      });

      try {
        if (format === 'excel') {
          await downloadStudentSpreadsheet(
            rows as Record<string, unknown>[],
            `DugsiPro_Students_${scope}_${dateStr}.xlsx`,
            'Ardayda'
          );
          showToast(
            `Faylka Excel waa la dhoofiyey (${targetStudents.length} arday)`,
            'success'
          );
        } else {
          const csv = rowsToCsv(rows as Record<string, unknown>[]);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          try {
            const link = document.createElement('a');
            link.href = url;
            link.download = `DugsiPro_Students_${scope}_${dateStr}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
          } finally {
            URL.revokeObjectURL(url);
          }
          showToast(
            `Faylka CSV waa la dhoofiyey (${targetStudents.length} arday)`,
            'success'
          );
        }
      } catch (error) {
        console.error('Student export failed:', error);
        showToast('Dhoofinta xogta ardayda way fashilantay.', 'error');
      }
      return;
    }

    if (format === 'pdf') {
      try {
        const exportColumnCount = Object.values(selectedColumns).filter(Boolean).length + 1;
        const doc = new jsPDF({
          orientation: exportColumnCount > 7 ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.schoolName || 'DUGSI PRO SCHOOL', 14, 13);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(165, 180, 252);
        doc.text(`STUDENT DIRECTORY — SCOPE: ${scope.toUpperCase()}`, 14, 21);

        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225);
        doc.text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${targetStudents.length} Students`,
          135,
          21
        );

        const headers: string[] = ['#'];
        const pushColumn = (enabled: boolean, label: string) => {
          if (enabled) headers.push(label);
        };

        pushColumn(selectedColumns.id, 'ID');
        pushColumn(selectedColumns.fullName, 'NAME');
        pushColumn(selectedColumns.class, 'CLASS');
        pushColumn(selectedColumns.section, 'SECTION');
        pushColumn(selectedColumns.rollNumber, 'ROLL #');
        pushColumn(selectedColumns.gender, 'GENDER');
        pushColumn(selectedColumns.guardianPhone, 'PHONE');
        pushColumn(selectedColumns.guardianPhoneAlt, 'ALT PHONE');
        pushColumn(selectedColumns.guardianName, 'GUARDIAN');
        pushColumn(selectedColumns.guardianRelationship, 'RELATION');
        pushColumn(selectedColumns.nationalId, 'NATIONAL ID');
        pushColumn(selectedColumns.previousSchool, 'PREVIOUS SCHOOL');
        pushColumn(selectedColumns.bloodGroup, 'BLOOD');
        pushColumn(selectedColumns.medicalNotes, 'MEDICAL NOTES');
        pushColumn(selectedColumns.status, 'STATUS');
        if (canViewFinance && selectedColumns.feeStatus) headers.push('FEE STATUS');
        pushColumn(selectedColumns.address, 'ADDRESS');
        pushColumn(selectedColumns.registrationDate, 'REG DATE');
        pushColumn(selectedColumns.lastUpdated, 'UPDATED');

        const tableBody = targetStudents.map((s, idx) => {
          const fee = canViewFinance ? getStudentFeeStatus(s.id) : null;
          const row: any[] = [idx + 1];

          if (selectedColumns.id) row.push(s.id);
          if (selectedColumns.fullName) row.push(s.fullName);
          if (selectedColumns.class) row.push(s.class);
          if (selectedColumns.section) row.push(s.section || '-');
          if (selectedColumns.rollNumber) row.push(s.rollNumber || '-');
          if (selectedColumns.gender) row.push(s.gender || '-');
          if (selectedColumns.guardianPhone) row.push(s.guardianPhone || '-');
          if (selectedColumns.guardianPhoneAlt) row.push(s.guardianPhoneAlt || '-');
          if (selectedColumns.guardianName) row.push(s.guardianName || '-');
          if (selectedColumns.guardianRelationship) row.push(s.guardianRelationship || '-');
          if (selectedColumns.nationalId) row.push(s.nationalId || '-');
          if (selectedColumns.previousSchool) row.push(s.previousSchool || '-');
          if (selectedColumns.bloodGroup) row.push(s.bloodGroup || '-');
          if (selectedColumns.medicalNotes) row.push(s.medicalNotes || '-');
          if (selectedColumns.status) row.push((s.status || 'active').toUpperCase());
          if (canViewFinance && selectedColumns.feeStatus && fee) {
            row.push(`${fee.status} / Bal: ${settings.currency} ${fee.balance}`);
          }
          if (selectedColumns.address) row.push(s.address || '-');
          if (selectedColumns.registrationDate) row.push(s.createdAt || '-');
          if (selectedColumns.lastUpdated) row.push((s.updatedAt || s.createdAt || '-').split('T')[0]);

          return row;
        });

        autoTable(doc, {
          head: [headers],
          body: tableBody,
          startY: 34,
          theme: 'striped',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 2.5
          },
          styles: {
            fontSize: exportColumnCount > 12 ? 6.5 : 8,
            cellPadding: exportColumnCount > 12 ? 1.5 : 2.5,
            overflow: 'linebreak'
          },
          margin: { left: 8, right: 8 },
          tableWidth: 'auto',
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          }
        });

        doc.save(`DugsiPro_Students_${scope}_${dateStr}.pdf`);
        showToast('Faylka PDF waa la daabacay', 'success');
      } catch (err) {
        console.error(err);
        showToast('Khalad ayaa dhacay dhoofinta PDF', 'error');
      }
    }
  };

  return (
    <PageContainer className="max-w-5xl mx-auto pb-16">
      <PageHeader
        breadcrumbs={[
          { label: 'Students', onClick: onCancel },
          { label: 'Export Students' }
        ]}
        title="Dhoofinta Xogta Ardayda (Export Center)"
        description="Kala soo bax xogta ardayda qaabab kala duwan sida Excel, CSV, ama PDF adigoo ixtiraamaya filter-yada iyo ogolaanshaha."
        actions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={onCancel}
          >
            Ka Noqo
          </Button>
        }
      />

      <StudentWorkspaceNav
        active="export"
        counts={{ total: students.length }}
        onNavigate={(next) => { if (next !== 'export') onNavigateSubSection?.(next); }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Scope & Format */}
        <div className="space-y-6 md:col-span-2">
          {/* SECTION 1: Scope Selection */}
          <Card className="space-y-4">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                Dooro Ardayda Aad Dhoofinayso (Target Audience Scope)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredStudents && (
                <button
                  type="button"
                  onClick={() => setScope('filtered')}
                  className={`p-4 rounded-xl border text-left transition-all col-span-1 sm:col-span-2 ${
                    scope === 'filtered'
                      ? 'bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[var(--color-brand)]">
                      Ardayda Hadda La Shaandheeyey (Current Filtered Students)
                    </div>
                    <Badge variant="brand">{filteredStudents.length} arday</Badge>
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    Waxay ixtiraamaysaa raadinta iyo filter-yada aad ku dooratay bogga All Students
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  scope === 'all'
                    ? 'bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="text-xs font-bold text-[var(--color-text-primary)]">
                  Dhammaan Ardayda (All)
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Guud ahaan diiwaanka ({students.length} arday)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('active')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  scope === 'active'
                    ? 'bg-[var(--color-success-soft)] border-[var(--color-success)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="text-xs font-bold text-[var(--color-success)]">
                  Firfircoon Kaliya (Active)
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Ardayda hadda dhigata (
                  {students.filter((s) => (s.status || 'active') === 'active').length} arday)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('inactive')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  scope === 'inactive'
                    ? 'bg-[var(--color-warning-soft)] border-[var(--color-warning)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="text-xs font-bold text-[var(--color-warning)]">
                  Aan Firfircoonayn (Inactive)
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Ardayda fasax ama hakad ku jira (
                  {students.filter((s) => s.status === 'inactive').length} arday)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('archived')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  scope === 'archived'
                    ? 'bg-[var(--color-surface-hover)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Ardayda Kaydsan (Archived)
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Diiwaanka hore ee la keydiyey (
                  {students.filter((s) => s.status === 'archived').length} arday)
                </div>
              </button>

              <div
                className={`p-4 rounded-xl border col-span-1 sm:col-span-2 transition-all ${
                  scope === 'class'
                    ? 'bg-[var(--color-brand-soft)] border-[var(--color-brand)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setScope('class')}
                  >
                    <input
                      type="radio"
                      checked={scope === 'class'}
                      onChange={() => setScope('class')}
                      className="accent-[var(--color-brand)]"
                    />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      Fasal Gaar ah (Specific Class)
                    </span>
                  </div>
                  {scope === 'class' && (
                    <select
                      aria-label="Select specific class to export"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="ds-input py-1.5 px-3 text-xs max-w-[200px]"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.className}>
                          {c.className}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Gender Filter */}
            <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">
                Shaandhaynta Jinsiga (Gender Filter):
              </span>
              <div className="flex items-center gap-1.5">
                {(['all', 'Male', 'Female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGender(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      selectedGender === g
                        ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand)]'
                        : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {g === 'all'
                      ? 'Lab & Dhedig (All)'
                      : g === 'Male'
                      ? 'Wiilal (Male)'
                      : 'Gabdho (Female)'}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* SECTION 2: Format Selection */}
          <Card className="space-y-4">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-info-soft)] text-[var(--color-info)] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                Nooca Faylka (Export Format)
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                  format === 'excel'
                    ? 'bg-[var(--color-success-soft)] border-[var(--color-success)] text-[var(--color-success)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <span className="text-xs font-bold">Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                  format === 'csv'
                    ? 'bg-[var(--color-info-soft)] border-[var(--color-info)] text-[var(--color-info)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <Table className="w-6 h-6" />
                <span className="text-xs font-bold">CSV (.csv)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                  format === 'pdf'
                    ? 'bg-[var(--color-danger-soft)] border-[var(--color-danger)] text-[var(--color-danger)]'
                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <FileText className="w-6 h-6" />
                <span className="text-xs font-bold">PDF Document</span>
              </button>
            </div>
          </Card>

          {/* SECTION 3: Live Export Preview */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Muuqaalka Xogta La Dhoofinayo (Live Preview)
                </h2>
              </div>
              <Badge variant="neutral">{targetStudents.length} records matched</Badge>
            </div>

            <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg max-h-60">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    {selectedColumns.id && <th className="py-2 px-3">ID</th>}
                    {selectedColumns.fullName && <th className="py-2 px-3">Full Name</th>}
                    {selectedColumns.class && <th className="py-2 px-3">Class</th>}
                    {selectedColumns.gender && <th className="py-2 px-3">Gender</th>}
                    {selectedColumns.status && <th className="py-2 px-3">Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {targetStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-[var(--color-text-muted)]"
                      >
                        Wax arday ah kuma jiraan qaybta la doortay
                      </td>
                    </tr>
                  ) : (
                    targetStudents.slice(0, 8).map((st, idx) => (
                      <tr key={st.id}>
                        <td className="py-2 px-3 font-mono text-[var(--color-text-muted)]">
                          {idx + 1}
                        </td>
                        {selectedColumns.id && (
                          <td className="py-2 px-3 font-mono text-[var(--color-text-primary)]">
                            {st.id}
                          </td>
                        )}
                        {selectedColumns.fullName && (
                          <td className="py-2 px-3 font-semibold text-[var(--color-text-primary)]">
                            {st.fullName}
                          </td>
                        )}
                        {selectedColumns.class && (
                          <td className="py-2 px-3 text-[var(--color-brand)] font-semibold">
                            {st.class}
                          </td>
                        )}
                        {selectedColumns.gender && (
                          <td className="py-2 px-3 text-[var(--color-text-secondary)]">
                            {st.gender}
                          </td>
                        )}
                        {selectedColumns.status && (
                          <td className="py-2 px-3 font-mono uppercase text-[10px]">
                            {st.status || 'active'}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Column Selector & Action Card */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Tiirarka (Columns)
              </h2>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleToggleAllColumns(true)}
                  className="text-[var(--color-brand)] hover:underline font-medium"
                >
                  Dhammaan
                </button>
                <span className="text-[var(--color-text-muted)]">|</span>
                <button
                  type="button"
                  onClick={() => handleToggleAllColumns(false)}
                  className="text-[var(--color-text-muted)] hover:underline"
                >
                  Ka Qaad
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-[var(--color-text-secondary)]">
              {[
                { key: 'id', label: 'Student ID' },
                { key: 'fullName', label: 'Magaca oo Buuxa (Full Name)' },
                { key: 'class', label: 'Fasalka (Class)' },
                { key: 'section', label: 'Section' },
                { key: 'rollNumber', label: 'Roll Number' },
                { key: 'gender', label: 'Jinsiga (Gender)' },
                { key: 'dateOfBirth', label: 'Taariikhda Dhalashada' },
                { key: 'guardianPhoneAlt', label: 'Telefoonka Labaad' },
                { key: 'guardianPhone', label: 'Telefoonka Waalidka' },
                { key: 'guardianName', label: 'Magaca Waalidka' },
                { key: 'guardianRelationship', label: 'Xiriirka Waalidka' },
                { key: 'nationalId', label: 'National ID' },
                { key: 'previousSchool', label: 'Previous School' },
                { key: 'bloodGroup', label: 'Blood Group' },
                { key: 'medicalNotes', label: 'Medical Notes' },
                { key: 'status', label: 'Xaaladda (Status)' },
                ...(canViewFinance
                  ? [{ key: 'feeStatus', label: 'Xaaladda Lacagta (Fee Status)' }]
                  : []),
                { key: 'registrationDate', label: 'Taariikhda Qorista (Reg Date)' },
                { key: 'lastUpdated', label: 'Ugu Dambeeyey (Last Updated)' }
              ].map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2.5 cursor-pointer hover:text-[var(--color-text-primary)]"
                >
                  <input
                    type="checkbox"
                    checked={(selectedColumns as any)[col.key]}
                    onChange={(e) =>
                      setSelectedColumns({ ...selectedColumns, [col.key]: e.target.checked })
                    }
                    className="accent-[var(--color-brand)] rounded"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 border-[var(--color-brand-border)]">
            <div className="text-[11px] uppercase font-mono tracking-wider text-[var(--color-text-muted)]">
              Xisaabta Guud (Export Summary)
            </div>

            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-3">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Ardayda La Dhoofinayo:
              </span>
              <span className="text-2xl font-bold font-mono text-[var(--color-brand)]">
                {targetStudents.length}
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              disabled={targetStudents.length === 0}
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              Dhoofi Faylka ({format.toUpperCase()})
            </Button>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
