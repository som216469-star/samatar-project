import React, { useState } from 'react';
import {
  Student,
  SchoolClass,
  SchoolSubject,
  ExamScore,
  AttendanceRecord,
  FeeRecord
} from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import { ClassReportsSection } from './ClassReportsSection';
import { StudentReportCardSection } from './StudentReportCardSection';
import { exportClassReportPDF, exportStudentReportCardPDF } from './reportsPdfExport';

interface ReportsViewProps {
  students: Student[];
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  examScores: ExamScore[];
  attendance: AttendanceRecord[];
  fees: FeeRecord[];
  theme: 'light' | 'dark';
}

export default function ReportsView({
  students,
  classes,
  examScores,
  attendance,
  fees
}: ReportsViewProps) {
  const [subTab, setSubTab] = useState<'class' | 'student'>('class');
  const [selectedClass, setSelectedClass] = useState<string>(
    classes.length > 0 ? classes[0].className : '1A'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');

  // 1. Class Report Calculations
  const classStudents = students.filter(
    (s) => s.class.toLowerCase() === selectedClass.toLowerCase()
  );
  const classMaleCount = classStudents.filter((s) => s.gender === 'Male').length;
  const classFemaleCount = classStudents.filter((s) => s.gender === 'Female').length;

  const classStudentIds = classStudents.map((s) => s.id);
  const classAttendanceRecords = attendance.filter((a) => classStudentIds.includes(a.studentId));
  const totalClassAttendancePossibilities = classAttendanceRecords.length;
  const totalClassPresent = classAttendanceRecords.filter((a) => a.status === 'Present').length;
  const classAttendanceRate = totalClassAttendancePossibilities
    ? Math.round((totalClassPresent / totalClassAttendancePossibilities) * 100)
    : 100;

  const classFees = fees.filter((f) => classStudentIds.includes(f.studentId));
  const classTotalInvoiced = classFees.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const classTotalPaid = classFees.reduce((acc, curr) => acc + Number(curr.paidAmount), 0);
  const classFinanceRate = classTotalInvoiced
    ? Math.round((classTotalPaid / classTotalInvoiced) * 100)
    : 0;

  const classExams = examScores.filter(
    (e) => e.className.toLowerCase() === selectedClass.toLowerCase()
  );
  const classExamAvg = classExams.length
    ? Math.round(
        classExams.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) /
          classExams.length
      )
    : 0;

  // 2. Student Report Card Calculations
  const activeStudent = students.find((s) => s.id === selectedStudentId);
  const activeStudentExams = examScores.filter((e) => e.studentId === selectedStudentId);
  const activeStudentAttendance = attendance.filter((a) => a.studentId === selectedStudentId);
  const activeStudentFees = fees.filter((f) => f.studentId === selectedStudentId);

  const stdTotalAttendanceCount = activeStudentAttendance.length;
  const stdPresentCount = activeStudentAttendance.filter((a) => a.status === 'Present').length;
  const stdAbsentCount = activeStudentAttendance.filter((a) => a.status === 'Absent').length;
  const stdAttendanceRate = stdTotalAttendanceCount
    ? Math.round((stdPresentCount / stdTotalAttendanceCount) * 100)
    : 100;

  const stdTotalInvoiced = activeStudentFees.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const stdTotalPaid = activeStudentFees.reduce((acc, curr) => acc + Number(curr.paidAmount), 0);
  const stdBalance = stdTotalInvoiced - stdTotalPaid;

  const stdAvgPercentage = activeStudentExams.length
    ? Math.round(
        activeStudentExams.reduce(
          (acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100,
          0
        ) / activeStudentExams.length
      )
    : 0;

  const searchedStudents = students
    .filter(
      (s) =>
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.class.toLowerCase().includes(studentSearch.toLowerCase())
    )
    .slice(0, 5);

  return (
    <PageContainer id="reports-view-root">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
          }
          #printable-report-card, #printable-report-card * {
            visibility: visible;
          }
          #printable-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          breadcrumbs={[
            { label: 'Academics & Reports' },
            { label: subTab === 'class' ? 'Class Reports' : 'Student Report Cards' }
          ]}
          title="Warbixinnada & Shahaadooyinka (Reports)"
          description="Soo saar warbixinnada gaarka ah ee fasallada iyo warqadaha imtixaanka ardayda"
          actions={
            <div
              role="tablist"
              aria-label="Report Categories"
              className="flex bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-1 rounded-xl w-fit"
            >
              <button
                type="button"
                role="tab"
                aria-selected={subTab === 'class'}
                onClick={() => setSubTab('class')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subTab === 'class'
                    ? 'bg-[var(--color-brand)] text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Fasallada (Class Report)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={subTab === 'student'}
                onClick={() => setSubTab('student')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subTab === 'student'
                    ? 'bg-[var(--color-brand)] text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Ardayda (Student Report Card)
              </button>
            </div>
          }
        />
      </div>

      {subTab === 'class' && (
        <ClassReportsSection
          selectedClass={selectedClass}
          onSelectClass={setSelectedClass}
          classes={classes}
          classStudents={classStudents}
          classAttendanceRate={classAttendanceRate}
          classFinanceRate={classFinanceRate}
          classExamAvg={classExamAvg}
          classMaleCount={classMaleCount}
          classFemaleCount={classFemaleCount}
          classTotalPaid={classTotalPaid}
          classTotalInvoiced={classTotalInvoiced}
          onExportPDF={() =>
            exportClassReportPDF({
              selectedClass,
              classes,
              classStudents,
              classAttendanceRate,
              classFinanceRate,
              classExamAvg,
              classMaleCount,
              classFemaleCount
            })
          }
        />
      )}

      {subTab === 'student' && (
        <StudentReportCardSection
          students={students}
          studentSearch={studentSearch}
          onChangeStudentSearch={setStudentSearch}
          searchedStudents={searchedStudents}
          selectedStudentId={selectedStudentId}
          onSelectStudentId={setSelectedStudentId}
          activeStudent={activeStudent}
          activeStudentExams={activeStudentExams}
          stdPresentCount={stdPresentCount}
          stdAbsentCount={stdAbsentCount}
          stdAttendanceRate={stdAttendanceRate}
          stdTotalInvoiced={stdTotalInvoiced}
          stdTotalPaid={stdTotalPaid}
          stdBalance={stdBalance}
          stdAvgPercentage={stdAvgPercentage}
          onDownloadPDF={() => {
            if (!activeStudent) return;
            exportStudentReportCardPDF({
              activeStudent,
              activeStudentExams,
              stdPresentCount,
              stdAbsentCount,
              stdAttendanceRate,
              stdTotalInvoiced,
              stdTotalPaid,
              stdBalance,
              stdAvgPercentage
            });
          }}
          onPrint={() => window.print()}
        />
      )}
    </PageContainer>
  );
}
