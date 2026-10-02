import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Award,
  Search,
  Filter,
  Percent,
  Download,
  Upload,
  AlertCircle,
  Trophy
} from 'lucide-react';
import { ExamScore, Student, SchoolSubject, SchoolClass } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Button,
  Card,
  StatCard,
  Badge,
  Modal,
  ConfirmDialog,
  EmptyState
} from '../../components/ui/primitives';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readStudentSpreadsheet, downloadStudentSpreadsheet } from '../../lib/studentSpreadsheet';

export interface ExamsViewProps {
  examScores: ExamScore[];
  students: Student[];
  subjects: SchoolSubject[];
  classes: SchoolClass[];
  onAddExamScore: (examData: Omit<ExamScore, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateExamScore: (id: string, examData: Partial<ExamScore>) => Promise<void>;
  onDeleteExamScore: (id: string) => Promise<void>;
  theme: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function ExamsPage({
  examScores,
  students,
  subjects,
  classes,
  onAddExamScore,
  onUpdateExamScore,
  onDeleteExamScore,
  showToast = () => {}
}: ExamsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    examName: string;
    studentName: string;
  } | null>(null);

  const [form, setForm] = useState({
    studentId: '',
    className: '',
    subjectName: '',
    examName: 'Imtixaanka Dhexe (Midterm)',
    term: 'Term 1',
    maxMarks: 100,
    marksObtained: 0,
    examDate: new Date().toISOString().split('T')[0]
  });

  const calculateGrade = (obtained: number, max: number): string => {
    const pct = (obtained / max) * 100;
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (student) {
      const classSubjects = subjects.filter(
        (sub) => sub.className.toLowerCase() === student.class.toLowerCase()
      );
      setForm({
        ...form,
        studentId,
        className: student.class,
        subjectName: classSubjects.length > 0 ? classSubjects[0].subjectName : ''
      });
    } else {
      setForm({
        ...form,
        studentId: '',
        className: '',
        subjectName: ''
      });
    }
  };

  const openAddModal = () => {
    setEditingExam(null);
    const firstStudent = students[0];
    const initialStudentId = firstStudent ? firstStudent.id : '';
    const initialClass = firstStudent ? firstStudent.class : '';
    const classSubjects = firstStudent
      ? subjects.filter(
          (sub) => sub.className.toLowerCase() === firstStudent.class.toLowerCase()
        )
      : [];
    const initialSubject = classSubjects.length > 0 ? classSubjects[0].subjectName : '';

    setForm({
      studentId: initialStudentId,
      className: initialClass,
      subjectName: initialSubject,
      examName: 'Imtixaanka Dhexe (Midterm)',
      term: 'Term 1',
      maxMarks: 100,
      marksObtained: 0,
      examDate: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEditModal = (exam: ExamScore) => {
    setEditingExam(exam);
    setForm({
      studentId: exam.studentId,
      className: exam.className,
      subjectName: exam.subjectName,
      examName: exam.examName,
      term: exam.term || 'Term 1',
      maxMarks: exam.maxMarks || 100,
      marksObtained: exam.marksObtained || 0,
      examDate: exam.examDate || new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.className || !form.subjectName) return;

    setLoading(true);
    const student = students.find((s) => s.id === form.studentId);
    const payload = {
      studentId: form.studentId,
      studentName: student ? student.fullName : '',
      className: form.className,
      subjectName: form.subjectName,
      examName: form.examName,
      term: form.term,
      maxMarks: Number(form.maxMarks),
      marksObtained: Number(form.marksObtained),
      grade: calculateGrade(Number(form.marksObtained), Number(form.maxMarks)),
      examDate: form.examDate
    };

    try {
      if (editingExam) {
        await onUpdateExamScore(editingExam.id, payload);
      } else {
        await onAddExamScore(payload);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      await onDeleteExamScore(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = examScores.filter((e) => {
    const student = students.find((s) => s.id === e.studentId);
    const studentName = student ? student.fullName.toLowerCase() : '';
    const matchesSearch =
      studentName.includes(searchQuery.toLowerCase()) ||
      e.examName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subjectName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      classFilter === 'All' || e.className.toLowerCase() === classFilter.toLowerCase();
    const matchesSubject =
      subjectFilter === 'All' || e.subjectName.toLowerCase() === subjectFilter.toLowerCase();
    return matchesSearch && matchesClass && matchesSubject;
  });

  const totalEntries = filteredExams.length;
  const averagePercentage = totalEntries
    ? Math.round(
        filteredExams.reduce(
          (acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100,
          0
        ) / totalEntries
      )
    : 0;

  const passedCount = filteredExams.filter(
    (e) => (e.marksObtained / e.maxMarks) * 100 >= 60
  ).length;
  const passRate = totalEntries ? Math.round((passedCount / totalEntries) * 100) : 0;

  const topScoreEntry = filteredExams.length
    ? [...filteredExams].sort(
        (a, b) => b.marksObtained / b.maxMarks - a.marksObtained / a.maxMarks
      )[0]
    : null;

  const currentClassSubjects = form.className
    ? subjects.filter((s) => s.className.toLowerCase() === form.className.toLowerCase())
    : [];

  const downloadExcelTemplate = () => {
    const rows: any[] = [];
    students
      .filter((s) => s.status === 'active')
      .forEach((s) => {
        const sSubjects = subjects.filter(
          (sub) => sub.className.toLowerCase() === s.class.toLowerCase()
        );
        if (sSubjects.length > 0) {
          sSubjects.forEach((sub) => {
            rows.push({
              'Arday ID (Student ID)': s.id,
              'Magaca Ardayga (Name)': s.fullName,
              'Fasalka (Class)': s.class,
              'Maaddada (Subject)': sub.subjectName,
              'Imtixaanka (Exam Name)': 'Imtixaanka Dhexe (Midterm)',
              'Term-ka (Term)': 'Term 1',
              'Dhibcaha Ugu Badan (Max Marks)': 100,
              'Dhibcaha la Helay (Marks Obtained)': '',
              'Taariikhda (Date - YYYY-MM-DD)': new Date().toISOString().split('T')[0]
            });
          });
        } else {
          rows.push({
            'Arday ID (Student ID)': s.id,
            'Magaca Ardayga (Name)': s.fullName,
            'Fasalka (Class)': s.class,
            'Maaddada (Subject)': 'General',
            'Imtixaanka (Exam Name)': 'Imtixaanka Dhexe (Midterm)',
            'Term-ka (Term)': 'Term 1',
            'Dhibcaha Ugu Badan (Max Marks)': 100,
            'Dhibcaha la Helay (Marks Obtained)': '',
            'Taariikhda (Date - YYYY-MM-DD)': new Date().toISOString().split('T')[0]
          });
        }
      });

    void downloadStudentSpreadsheet(
      rows as Record<string, unknown>[],
      'Natiijooyinka_Template.xlsx',
      'Exam_Template'
    ).catch((error) => {
      console.error('Exam template export failed:', error);
      showToast('Template-ka Excel lama abuuri karin', 'error');
    });
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';

    if (file.size > 10 * 1024 * 1024) {
      showToast('Faylka kama badnaan karo 10MB.', 'error');
      return;
    }

    try {
      const data = await readStudentSpreadsheet(file);
      if (data.length === 0) {
        showToast('Faylka Excel waa faaruq.', 'warning');
        return;
      }
      if (data.length > 1000) {
        showToast('Hal mar kama badnaan karo 1000 natiijo.', 'error');
        return;
      }

      let importedCount = 0;
      let errorCount = 0;

      for (const row of data) {
        const get = (...keys: string[]) => {
          for (const key of keys) {
            const value = row[key];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              return String(value).trim();
            }
          }
          return '';
        };

        const studentId = get('Arday ID (Student ID)', 'studentId', 'Student ID');
        const subjectName = get('Maaddada (Subject)', 'subjectName', 'Subject');
        const examName = get('Imtixaanka (Exam Name)', 'examName') || 'Imtixaanka Dhexe (Midterm)';
        const term = get('Term-ka (Term)', 'term') || 'Term 1';
        const maxMarks = Number(get('Dhibcaha Ugu Badan (Max Marks)', 'maxMarks') || 100);
        const marksText = get('Dhibcaha la Helay (Marks Obtained)', 'marksObtained');
        const examDate =
          get('Taariikhda (Date - YYYY-MM-DD)', 'examDate') ||
          new Date().toISOString().split('T')[0];

        if (!studentId || !subjectName || marksText === '') {
          errorCount += 1;
          continue;
        }

        const marksObtained = Number(marksText);
        if (
          !Number.isFinite(maxMarks) ||
          maxMarks <= 0 ||
          !Number.isFinite(marksObtained) ||
          marksObtained < 0 ||
          marksObtained > maxMarks
        ) {
          errorCount += 1;
          continue;
        }

        const student = students.find((s) => s.id === studentId);
        if (!student) {
          errorCount += 1;
          continue;
        }

        try {
          await onAddExamScore({
            studentId,
            studentName: student.fullName,
            className: student.class,
            subjectName,
            examName,
            term,
            maxMarks,
            marksObtained,
            grade: calculateGrade(marksObtained, maxMarks),
            examDate
          });
          importedCount += 1;
        } catch {
          errorCount += 1;
        }
      }

      showToast(
        `Soo gelinta waa dhammaatay! La galiyey: ${importedCount} | Ka haray: ${errorCount}`,
        errorCount > 0 ? 'warning' : 'success'
      );
    } catch (error) {
      console.error('Exam spreadsheet import failed:', error);
      showToast(
        'Faylka Excel/CSV lama akhrin karo. Fadlan hubi template-ka.',
        'error'
      );
    }
  };

  const exportExamsToPDF = () => {
    try {
      if (filteredExams.length === 0) {
        showToast('Ma jiraan natiijooyin imtixaan oo la dhoofiyo.', 'warning');
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 6, 'F');

      doc.setTextColor(17, 24, 39);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Dugsiga Portal', 15, 20);

      doc.setTextColor(107, 114, 128);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Xafiiska Imtixaanaadka & Maamulka', 15, 25);

      doc.setTextColor(79, 70, 229);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('NATIIJOOYINKA IMTIXAANADA', 195, 20, { align: 'right' });
      doc.text('(EXAMINATION MARKS RECORD)', 195, 24, { align: 'right' });

      doc.setTextColor(107, 114, 128);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Taariikhda: ${new Date().toLocaleDateString()}`, 195, 30, { align: 'right' });
      doc.text(`Diiwaanada: ${filteredExams.length} Natiijooyin`, 195, 34, { align: 'right' });

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(15, 38, 195, 38);

      doc.setFillColor(249, 250, 251);
      doc.rect(15, 43, 180, 22, 'F');
      doc.setDrawColor(243, 244, 246);
      doc.rect(15, 43, 180, 22, 'S');

      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont('Helvetica', 'normal');
      doc.text('Average Percentage', 20, 49);
      doc.text('Pass Rate (>=60%)', 75, 49);
      doc.text('Total Exam Entries', 135, 49);

      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${averagePercentage}%`, 20, 55);
      doc.text(`${passRate}%`, 75, 55);
      doc.text(`${totalEntries}`, 135, 55);

      const tableBody = filteredExams.map((e, idx) => {
        const student = students.find((s) => s.id === e.studentId);
        const percentage = Math.round((e.marksObtained / e.maxMarks) * 100);
        return [
          (idx + 1).toString(),
          student ? student.fullName.toUpperCase() : e.studentName.toUpperCase(),
          e.className.toUpperCase(),
          e.subjectName.toUpperCase(),
          e.examName.toUpperCase(),
          `${e.marksObtained} / ${e.maxMarks}`,
          `${percentage}%`,
          e.grade.toUpperCase()
        ];
      });

      autoTable(doc, {
        startY: 72,
        head: [
          [
            '#',
            'Ardayga (Student)',
            'Fasalka (Class)',
            'Maaddada (Subject)',
            'Imtixaan (Exam)',
            'Marks',
            'Percentage',
            'Grade'
          ]
        ],
        body: tableBody,
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5, font: 'Helvetica' }
      });

      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Dugsiga Portal - System Generated Official Examination Statement`,
        105,
        282,
        { align: 'center' }
      );

      doc.save(`Liiska_Natiijooyinka_Imtixaanada.pdf`);
    } catch (err) {
      console.error('Failed to export exams to PDF:', err);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Academic' }, { label: 'Exams & Marks' }]}
        title="Natiijooyinka Imtixaannada (Exams & Marks)"
        description="Geli natiijooyinka imtixaanka adoo isticmaalaya nidaamka darajooyinka casriga ah"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={downloadExcelTemplate}
            >
              Template Excel
            </Button>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span>Soo Geli (Import)</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={exportExamsToPDF}
            >
              Dhoofi PDF
            </Button>

            <Button
              variant="primary"
              size="md"
              disabled={students.length === 0 || subjects.length === 0}
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openAddModal}
            >
              Natiijo Cusub (Add Marks)
            </Button>
          </div>
        }
      />

      {(students.length === 0 || subjects.length === 0) && (
        <div className="p-4 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-soft)] text-[var(--color-warning)] text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Fadlan hubi inaad haysato ugu yaraan hal arday iyo hal maaddo ka hor inta aadan gelin
            natiijada imtixaanka.
          </span>
        </div>
      )}

      {/* Statistics dashboard panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Imtixaannada la Galiyey"
          value={totalEntries}
          sublabel="Diiwaanada imtixaanka"
          variant="brand"
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          label="Celcelis Guud (Average)"
          value={`${averagePercentage}%`}
          sublabel="Celceliska dhibcaha"
          variant="success"
          icon={<Percent className="w-4 h-4" />}
        />
        <StatCard
          label="Gudbista (Pass Rate)"
          value={`${passRate}%`}
          sublabel="Ardayda >= 60%"
          variant="info"
          icon={<Filter className="w-4 h-4" />}
        />
        <StatCard
          label="Ardayga Ugu Sareeya"
          value={
            topScoreEntry
              ? `${Math.round((topScoreEntry.marksObtained / topScoreEntry.maxMarks) * 100)}%`
              : 'N/A'
          }
          sublabel={
            topScoreEntry
              ? students.find((s) => s.id === topScoreEntry.studentId)?.fullName ||
                topScoreEntry.studentName
              : 'Weli lama gelin'
          }
          variant="warning"
          icon={<Trophy className="w-4 h-4" />}
        />
      </div>

      {/* Filters and Search toolbar */}
      <Card padding="sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Ku raadi magac arday, imtixaan ama maaddo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ds-input pl-9 pr-4 py-2"
            />
          </div>

          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full ds-input py-2"
            >
              <option value="All">Dhammaan Fasallada</option>
              {classes.map((c) => (
                <option key={c.id} value={c.className}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full ds-input py-2"
            >
              <option value="All">Dhammaan Maaddooyinka</option>
              {Array.from(new Set(subjects.map((s) => s.subjectName))).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Exam Results Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Ardayga (Student)</th>
                <th className="px-4 py-3">Fasalka</th>
                <th className="px-4 py-3">Maaddada</th>
                <th className="px-4 py-3">Imtixaanka</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Dhibcaha</th>
                <th className="px-4 py-3">Boqolley (%)</th>
                <th className="px-4 py-3">Darajo</th>
                <th className="px-4 py-3 text-right">Ficilada</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredExams.length > 0 ? (
                filteredExams.map((exam) => {
                  const student = students.find((s) => s.id === exam.studentId);
                  const percentage = Math.round((exam.marksObtained / exam.maxMarks) * 100);

                  return (
                    <tr key={exam.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand)] text-xs font-bold font-mono uppercase">
                            {student ? student.fullName.substring(0, 2) : 'ST'}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--color-text-primary)]">
                              {student ? student.fullName : exam.studentName}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-mono">
                              ID: {exam.studentId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">
                        {exam.className}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">
                        {exam.subjectName}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {exam.examName}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--color-text-muted)]">
                        {exam.term}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {exam.marksObtained}
                        </span>
                        <span className="text-[var(--color-text-muted)] mx-1">/</span>
                        <span className="text-[var(--color-text-secondary)]">{exam.maxMarks}</span>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            percentage >= 60
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--color-danger)]'
                          }`}
                        >
                          {percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            exam.grade === 'A' || exam.grade === 'B'
                              ? 'success'
                              : exam.grade === 'C'
                              ? 'info'
                              : exam.grade === 'D'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {exam.grade}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(exam)}
                            className="p-1.5 rounded-md bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                            title="Tafatir"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                id: exam.id,
                                examName: exam.examName,
                                studentName: student ? student.fullName : exam.studentName
                              })
                            }
                            className="p-1.5 rounded-md bg-[var(--color-surface-muted)] hover:bg-[var(--color-danger-soft)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors"
                            title="Tirtir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-10">
                    <EmptyState
                      icon={<Award className="w-6 h-6" />}
                      title="Wax natiijo ah lama helin"
                      description="Fadlan hubi shuruudaha raadinta ama billow gelinta natiijo cusub."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Exam Entry Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExam ? 'Tafatir Imtixaanka' : 'Geli Natiijo Imtixaan'}
        description="Dooro ardayga, maaddada, iyo dhibcaha uu ka keenay imtixaanka."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Ka noqo
            </Button>
            <Button variant="primary" loading={loading} onClick={handleSubmit as any}>
              {editingExam ? 'Cusbooneysii' : 'Kaydi (Save)'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Dooro Ardayga (Student) *
              </label>
              <select
                value={form.studentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full ds-input"
                required
              >
                <option value="">-- Dooro Arday --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.class})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Maaddada (Subject) *
              </label>
              <select
                value={form.subjectName}
                onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                className="w-full ds-input"
                required
                disabled={!form.studentId}
              >
                <option value="">-- Dooro Maaddo --</option>
                {currentClassSubjects.map((sub) => (
                  <option key={sub.id} value={sub.subjectName}>
                    {sub.subjectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Nooca Imtixaanka (Exam Type)
              </label>
              <select
                value={form.examName}
                onChange={(e) => setForm({ ...form, examName: e.target.value })}
                className="w-full ds-input"
              >
                <option value="Imtixaanka Koowaad (First Exam)">
                  Imtixaanka Koowaad (First Exam)
                </option>
                <option value="Imtixaanka Dhexe (Midterm)">Imtixaanka Dhexe (Midterm)</option>
                <option value="Imtixaanka Dhamaadka (Final Exam)">
                  Imtixaanka Dhamaadka (Final Exam)
                </option>
                <option value="Imtixaan Kedis ah (Quiz)">Imtixaan Kedis ah (Quiz)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Term / Semester
              </label>
              <select
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                className="w-full ds-input"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Dhibcaha Sare (Max)
              </label>
              <input
                type="number"
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
                className="w-full ds-input font-mono tabular-nums"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                La Helay (Obtained)
              </label>
              <input
                type="number"
                value={form.marksObtained}
                onChange={(e) => setForm({ ...form, marksObtained: Number(e.target.value) })}
                className="w-full ds-input font-mono tabular-nums"
                max={form.maxMarks}
                min={0}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Darajada (Grade)
              </label>
              <div className="w-full ds-input font-bold font-mono text-[var(--color-brand)] flex items-center justify-center bg-[var(--color-surface-muted)]">
                {calculateGrade(Number(form.marksObtained), Number(form.maxMarks))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--color-text-secondary)] block">
              Taariikhda Imtixaanka (Exam Date)
            </label>
            <input
              type="date"
              value={form.examDate}
              onChange={(e) => setForm({ ...form, examDate: e.target.value })}
              className="w-full ds-input"
              required
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Tirtir Natiijada Imtixaanka?"
        message={`Ma hubtaa inaad tirtirto natiijada imtixaanka "${confirmDelete?.examName}" ee ardayga ${confirmDelete?.studentName}?`}
        confirmLabel="Haa, Tirtir"
        loading={loading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageContainer>
  );
}
