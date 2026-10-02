import React from 'react';
import {
  Search,
  CheckCircle2,
  Download,
  Printer,
  Users,
  Calendar,
  DollarSign,
  Award
} from 'lucide-react';
import { Student, ExamScore } from '../../types';
import { Badge, Button, Card, EmptyState } from '../../components/ui/primitives';
import { getAcademicFeedback } from './reportsPdfExport';

interface StudentReportCardSectionProps {
  students: Student[];
  studentSearch: string;
  onChangeStudentSearch: (q: string) => void;
  searchedStudents: Student[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  activeStudent: Student | undefined;
  activeStudentExams: ExamScore[];
  stdPresentCount: number;
  stdAbsentCount: number;
  stdAttendanceRate: number;
  stdTotalInvoiced: number;
  stdTotalPaid: number;
  stdBalance: number;
  stdAvgPercentage: number;
  onDownloadPDF: () => void;
  onPrint: () => void;
}

export const StudentReportCardSection: React.FC<StudentReportCardSectionProps> = ({
  students,
  studentSearch,
  onChangeStudentSearch,
  searchedStudents,
  selectedStudentId,
  onSelectStudentId,
  activeStudent,
  activeStudentExams,
  stdPresentCount,
  stdAbsentCount,
  stdAttendanceRate,
  stdTotalInvoiced,
  stdTotalPaid,
  stdBalance,
  stdAvgPercentage,
  onDownloadPDF,
  onPrint
}) => {
  return (
    <div className="space-y-6">
      {/* Student Select and Search Control */}
      <Card className="no-print space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
            Dooro Ardayga si aad u soo saarto Warbixintiisa (Report Card)
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Ku raadi magaca ardayga ama fasalkiisa si aad u daabacdo shahaadada imtixaanka
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            aria-label="Ku raadi magaca ama fasalka ardayga"
            placeholder="Ku raadi magaca ama fasalka ardayga..."
            value={studentSearch}
            onChange={(e) => onChangeStudentSearch(e.target.value)}
            className="w-full ds-input pl-10 pr-4 py-2.5 text-xs"
          />
        </div>

        {/* Quick search matches */}
        {studentSearch.trim() && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)] text-xs max-h-56 overflow-y-auto shadow-[var(--shadow-md)]">
            {searchedStudents.length > 0 ? (
              searchedStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    onSelectStudentId(student.id);
                    onChangeStudentSearch('');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors flex items-center justify-between text-[var(--color-text-primary)] font-medium"
                >
                  <span>{student.fullName}</span>
                  <Badge variant="brand">Fasalka: {student.class}</Badge>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-[var(--color-text-muted)]">
                Wax arday ah oo magacaas leh lama helin.
              </div>
            )}
          </div>
        )}

        {/* Selection Status */}
        {selectedStudentId ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[var(--color-surface)] text-[var(--color-brand)] border border-[var(--color-brand-border)]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-text-primary)]">
                  {students.find((s) => s.id === selectedStudentId)?.fullName}
                </p>
                <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                  Class: {students.find((s) => s.id === selectedStudentId)?.class} | ID:{' '}
                  {selectedStudentId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Download className="w-4 h-4 text-[var(--color-success)]" />}
                onClick={onDownloadPDF}
              >
                La soo deg (Download PDF)
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={onPrint}
              >
                Daabac (Print Card)
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] text-xs text-center">
            Fadlan dooro arday sare ka raadi si aad u bilowdo diyaarinta warqadda natiijada.
          </div>
        )}
      </Card>

      {/* Printable Report Card Template */}
      {selectedStudentId && activeStudent && (
        <div
          id="printable-report-card"
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-md)] space-y-7 max-w-4xl mx-auto"
        >
          {/* Report Header */}
          <div className="border-b border-[var(--color-border)] pb-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-[var(--color-brand)] rounded-xl flex items-center justify-center text-white font-bold font-mono text-lg shadow-sm">
                DP
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  DUGSI PRO 2026
                </h1>
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-mono mt-0.5">
                  Xafiiska Imtixaanaadka & Maamulka Waxbarashada
                </p>
              </div>
            </div>

            <div className="text-center md:text-right font-mono text-[11px] text-[var(--color-text-secondary)] space-y-1">
              <Badge variant="brand">Warqadda Natiijada (Report Card)</Badge>
              <p className="mt-1">Taariikhda: {new Date().toISOString().split('T')[0]}</p>
              <p>ID: {activeStudent.id}</p>
            </div>
          </div>

          {/* Student Demographics Info Grid */}
          <div className="flex flex-col md:flex-row gap-6 bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-5 rounded-xl items-center">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
              {activeStudent.photo ? (
                <img
                  src={activeStudent.photo}
                  alt={activeStudent.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex flex-col items-center justify-center text-center p-1">
                  <Users className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] uppercase tracking-wider font-bold">No Photo</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full text-left">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                  Magaca (Student Name)
                </p>
                <p className="text-xs font-bold text-[var(--color-text-primary)] mt-1">
                  {activeStudent.fullName}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                  Fasalka (Class)
                </p>
                <p className="text-xs font-bold text-[var(--color-brand)] mt-1 font-mono">
                  {activeStudent.class}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                  Lab/Dhedig (Gender)
                </p>
                <p className="text-xs font-bold text-[var(--color-text-primary)] mt-1">
                  {activeStudent.gender}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                  Taleefanka Waalidka
                </p>
                <p className="text-xs font-bold text-[var(--color-text-primary)] font-mono mt-1">
                  {activeStudent.guardianPhone || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Attendance & Finance Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)] flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Xaadirinta (Attendance)</span>
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)]">Xaadir (Present)</p>
                  <p className="text-lg font-bold font-mono text-[var(--color-success)] mt-1">
                    {stdPresentCount}
                  </p>
                </div>
                <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)]">Maqan (Absent)</p>
                  <p className="text-lg font-bold font-mono text-[var(--color-danger)] mt-1">
                    {stdAbsentCount}
                  </p>
                </div>
                <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)]">Celcelis Rate</p>
                  <p className="text-lg font-bold font-mono text-[var(--color-text-primary)] mt-1">
                    {stdAttendanceRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-success)] flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Maaliyadda (Fee Status)</span>
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)]">Lagu Leeyahay</p>
                  <p className="text-lg font-bold font-mono text-[var(--color-text-primary)] mt-1">
                    ${stdTotalInvoiced}
                  </p>
                </div>
                <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)]">La Bixiyey</p>
                  <p className="text-lg font-bold font-mono text-[var(--color-success)] mt-1">
                    ${stdTotalPaid}
                  </p>
                </div>
                <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)]">Baaqi (Balance)</p>
                  <p className="text-lg font-bold font-mono text-[var(--color-warning)] mt-1">
                    ${stdBalance}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Academics performance report */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-warning)] flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>Natiijada Academiga (Academic Exam Scores)</span>
            </h3>

            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="px-5 py-3 text-left">Maaddada (Subject)</th>
                    <th className="px-4 py-3">Imtixaan (Exam)</th>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Dhibcaha la Helay</th>
                    <th className="px-4 py-3">Dhibcaha Sare</th>
                    <th className="px-4 py-3">Boqolley (%)</th>
                    <th className="px-5 py-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudentExams.length > 0 ? (
                    activeStudentExams.map((score) => {
                      const percentage = Math.round((score.marksObtained / score.maxMarks) * 100);
                      return (
                        <tr key={score.id}>
                          <td className="px-5 py-3 text-left font-semibold text-[var(--color-text-primary)]">
                            {score.subjectName}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                            {score.examName}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">
                            {score.term}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-primary)]">
                            {score.marksObtained}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--color-text-muted)]">
                            {score.maxMarks}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--color-text-primary)]">
                            {percentage}%
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Badge
                              variant={
                                score.grade === 'A' || score.grade === 'B'
                                  ? 'success'
                                  : score.grade === 'C'
                                  ? 'info'
                                  : score.grade === 'D'
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {score.grade}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8">
                        <EmptyState
                          title="Wax natiijo imtixaan ah weli looma diiwaangelin ardaygaan"
                          description="Geli dhibcaha imtixaanka qaybta Exams si ay halkan uga soo muuqdaan."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GPA / Combined Academic feedback footer */}
          {activeStudentExams.length > 0 && (
            <div className="p-5 bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                  Celceliska Guud ee Imtixaanka (Overall Average)
                </p>
                <p
                  className={`text-sm font-bold ${
                    getAcademicFeedback(stdAvgPercentage).color
                  }`}
                >
                  {getAcademicFeedback(stdAvgPercentage).text}
                </p>
              </div>

              <div className="text-center font-mono">
                <p className="text-[10px] uppercase text-[var(--color-text-muted)]">
                  Boqolley Guud
                </p>
                <p className="text-2xl font-bold text-[var(--color-brand)] mt-0.5">
                  {stdAvgPercentage}%
                </p>
              </div>
            </div>
          )}

          {/* Printing Signatures area */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="border-t border-[var(--color-border)] pt-3 space-y-1">
              <p className="font-semibold text-[var(--color-text-primary)]">
                Saxiixa Macallinka (Class Teacher)
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">DUGSI PRO Office</p>
            </div>
            <div className="border-t border-[var(--color-border)] pt-3 space-y-1">
              <p className="font-semibold text-[var(--color-text-primary)]">
                Saxiixa Maamulaha (Headmaster)
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Shaabadda Iskuulka</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
