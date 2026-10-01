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
import { motion } from 'motion/react';
import { Student, ExamScore } from '../../types';
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Student Select and Search Control */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#161616]/60 to-[#0e0e0e]/80 border border-[#ffffff08] shadow-xl no-print space-y-4">
        <h2 className="text-lg font-serif italic text-white">
          Dooro Ardayga si aad u soo saarto Warbixintiisa (Report Card)
        </h2>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#525252]" />
          <input
            type="text"
            aria-label="Ku raadi magaca ama fasalka ardayga"
            placeholder="Ku raadi magaca ama fasalka ardayga..."
            value={studentSearch}
            onChange={(e) => onChangeStudentSearch(e.target.value)}
            className="w-full pl-11 pr-5 py-3 rounded-xl border border-[#ffffff10] bg-[#0a0a0a] text-xs uppercase tracking-widest text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-[#7c3aed]/50 transition-colors"
          />
        </div>

        {/* Quick search matches */}
        {studentSearch.trim() && (
          <div className="bg-[#101010] border border-[#ffffff10] rounded-xl overflow-hidden divide-y divide-[#ffffff05] text-xs max-h-56 overflow-y-auto shadow-2xl">
            {searchedStudents.length > 0 ? (
              searchedStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    onSelectStudentId(student.id);
                    onChangeStudentSearch('');
                  }}
                  className="w-full text-left px-5 py-3 hover:bg-[#7c3aed10] transition-colors flex items-center justify-between text-white font-medium"
                >
                  <span className="uppercase tracking-wider">{student.fullName}</span>
                  <span className="font-mono text-[10px] text-[#737373] uppercase">
                    Fasalka: {student.class}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-5 py-3 text-center text-[#525252]">
                Wax arday ah oo magacaas leh lama helin.
              </div>
            )}
          </div>
        )}

        {/* Selection Status */}
        {selectedStudentId ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-[#7c3aed0a] border border-[#7c3aed20]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#7c3aed15] text-[#c4b5fd]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  {students.find((s) => s.id === selectedStudentId)?.fullName}
                </p>
                <p className="text-[10px] font-mono text-[#737373] uppercase">
                  Class: {students.find((s) => s.id === selectedStudentId)?.class} | ID:{' '}
                  {selectedStudentId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onDownloadPDF}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase tracking-widest font-bold shadow-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>La soo deg (Download PDF)</span>
              </button>
              <button
                type="button"
                onClick={onPrint}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#8b5cf6] hover:to-[#7c3aed] text-white text-[10px] uppercase tracking-widest font-bold shadow-lg transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Daabac (Print Card)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-[#ffffff05] bg-[#ffffff02] text-[#737373] text-xs text-center font-serif italic">
            Fadlan dooro arday sare ka raadi si aad u bilowdo diyaarinta warqadda natiijada.
          </div>
        )}
      </div>

      {/* Printable Report Card Template */}
      {selectedStudentId && activeStudent && (
        <div
          id="printable-report-card"
          className="bg-gradient-to-b from-[#161616]/80 to-[#0d0d0d]/90 border border-[#ffffff08] rounded-3xl p-8 shadow-2xl space-y-8 max-w-4xl mx-auto"
        >
          {/* Report Header */}
          <div className="border-b border-[#ffffff10] pb-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-14 h-14 bg-gradient-to-tr from-[#7c3aed] to-[#6d28d9] rounded-2xl flex items-center justify-center text-white font-bold font-mono text-xl shadow-lg">
                DP
              </div>
              <div>
                <h1 className="text-3xl font-serif italic font-bold text-white tracking-tight">
                  Dugsiga Portal
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-[#737373] font-mono mt-0.5">
                  Xafiiska Imtixaanaadka & Maamulka
                </p>
              </div>
            </div>

            <div className="text-center md:text-right font-mono text-[10px] text-[#737373] space-y-1">
              <p className="text-xs uppercase font-bold text-[#c4b5fd] tracking-widest">
                Warqadda Natiijada (Report Card)
              </p>
              <p>Taariikhda: {new Date().toISOString().split('T')[0]}</p>
              <p>ID: {activeStudent.id}</p>
            </div>
          </div>

          {/* Student Demographics Info Grid */}
          <div className="flex flex-col md:flex-row gap-6 bg-[#ffffff02] border border-[#ffffff05] p-5 rounded-2xl items-center">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#ffffff05] border border-[#ffffff10] flex items-center justify-center shrink-0">
              {activeStudent.photo ? (
                <img
                  src={activeStudent.photo}
                  alt={activeStudent.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#7c3aed]/10 text-[#c4b5fd] flex flex-col items-center justify-center text-center p-1">
                  <Users className="w-5 h-5 mb-0.5 text-[#c4b5fd]/80" />
                  <span className="text-[8px] uppercase tracking-wider font-bold">No Photo</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full text-left">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#525252] font-semibold">
                  Magaca (Student Name)
                </p>
                <p className="text-xs font-bold text-white uppercase mt-1 tracking-wider">
                  {activeStudent.fullName}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#525252] font-semibold">
                  Fasalka (Class)
                </p>
                <p className="text-xs font-bold text-white uppercase mt-1 font-mono">
                  {activeStudent.class}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#525252] font-semibold">
                  Lab/Dhedig (Gender)
                </p>
                <p className="text-xs font-bold text-white uppercase mt-1">{activeStudent.gender}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#525252] font-semibold">
                  Taleefanka Waalidka
                </p>
                <p className="text-xs font-bold text-white font-mono mt-1">
                  {activeStudent.guardianPhone || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Attendance & Finance Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#121212]/40 border border-[#ffffff05] p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#7c3aed] flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Xaadirinta (Attendance)</span>
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#ffffff02] p-3 rounded-xl border border-[#ffffff05]">
                  <p className="text-[9px] uppercase text-[#737373]">Xaadir (Present)</p>
                  <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
                    {stdPresentCount}
                  </p>
                </div>
                <div className="bg-[#ffffff02] p-3 rounded-xl border border-[#ffffff05]">
                  <p className="text-[9px] uppercase text-[#737373]">Maqan (Absent)</p>
                  <p className="text-lg font-bold font-mono text-rose-400 mt-1">
                    {stdAbsentCount}
                  </p>
                </div>
                <div className="bg-[#ffffff02] p-3 rounded-xl border border-[#ffffff05]">
                  <p className="text-[9px] uppercase text-[#737373]">Celcelis Rate</p>
                  <p className="text-lg font-bold font-mono text-white mt-1">
                    {stdAttendanceRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#121212]/40 border border-[#ffffff05] p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#10b981] flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Maaliyadda (Fee Status)</span>
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#ffffff02] p-3 rounded-xl border border-[#ffffff05]">
                  <p className="text-[9px] uppercase text-[#737373]">Lagu Leeyahay</p>
                  <p className="text-lg font-bold font-mono text-white mt-1">${stdTotalInvoiced}</p>
                </div>
                <div className="bg-[#ffffff02] p-3 rounded-xl border border-[#ffffff05]">
                  <p className="text-[9px] uppercase text-[#737373]">La Bixiyey</p>
                  <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
                    ${stdTotalPaid}
                  </p>
                </div>
                <div className="bg-[#ffffff02] p-3 rounded-xl border border-[#ffffff05]">
                  <p className="text-[9px] uppercase text-[#737373]">Hoor (Balance)</p>
                  <p className="text-lg font-bold font-mono text-amber-500 mt-1">${stdBalance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Academics performance report */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>Natiijada Academiga (Academic Exam Scores)</span>
            </h3>

            <div className="border border-[#ffffff05] rounded-2xl overflow-hidden bg-[#ffffff01]">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-[#ffffff05] bg-[#000000]/20 text-[9px] uppercase font-bold tracking-widest text-[#737373]">
                    <th className="px-6 py-3.5 text-left">Maaddada (Subject)</th>
                    <th className="px-4 py-3.5">Imtixaan (Exam)</th>
                    <th className="px-4 py-3.5">Term</th>
                    <th className="px-4 py-3.5">Dhibcaha la Helay</th>
                    <th className="px-4 py-3.5">Dhibcaha Sare</th>
                    <th className="px-4 py-3.5">Boqolley (%)</th>
                    <th className="px-6 py-3.5 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff03] text-xs">
                  {activeStudentExams.length > 0 ? (
                    activeStudentExams.map((score) => {
                      const percentage = Math.round((score.marksObtained / score.maxMarks) * 100);
                      let gradeColor = 'text-rose-400';
                      if (score.grade === 'A') gradeColor = 'text-emerald-400 font-bold';
                      else if (score.grade === 'B') gradeColor = 'text-teal-400 font-bold';
                      else if (score.grade === 'C') gradeColor = 'text-sky-400 font-bold';
                      else if (score.grade === 'D') gradeColor = 'text-amber-400';

                      return (
                        <tr key={score.id} className="text-[#a3a3a3] font-medium">
                          <td className="px-6 py-3.5 text-left text-white font-serif italic text-sm">
                            {score.subjectName}
                          </td>
                          <td className="px-4 py-3.5 text-[11px]">{score.examName}</td>
                          <td className="px-4 py-3.5 font-mono text-[10px]">{score.term}</td>
                          <td className="px-4 py-3.5 font-mono text-white font-semibold">
                            {score.marksObtained}
                          </td>
                          <td className="px-4 py-3.5 font-mono">{score.maxMarks}</td>
                          <td className="px-4 py-3.5 font-mono">{percentage}%</td>
                          <td className={`px-6 py-3.5 text-right font-mono text-[11px] ${gradeColor}`}>
                            {score.grade}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#525252]">
                        Wax natiijo imtixaan ah weli looma diiwaangelin ardaygaan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GPA / Combined Academic feedback footer */}
          {activeStudentExams.length > 0 && (
            <div className="p-6 bg-gradient-to-r from-[#7c3aed0a] to-[#6d28d905] border border-[#7c3aed15] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-[9px] uppercase tracking-wider text-[#737373] font-semibold">
                  Celceliska Guud ee Imtixaanka (Overall Average)
                </p>
                <p
                  className={`text-base font-bold tracking-wide ${
                    getAcademicFeedback(stdAvgPercentage).color
                  }`}
                >
                  {getAcademicFeedback(stdAvgPercentage).text}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center font-mono">
                  <p className="text-[9px] uppercase text-[#737373]">Boqolley Guud</p>
                  <p className="text-3xl font-black text-white mt-1">{stdAvgPercentage}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Printing Signatures area */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="border-t border-[#ffffff10] pt-3 space-y-1">
              <p className="font-semibold text-white">Saxiixa Macallinka (Class Teacher)</p>
              <p className="text-[10px] text-[#737373]">Dugsiga Portal Office</p>
            </div>
            <div className="border-t border-[#ffffff10] pt-3 space-y-1">
              <p className="font-semibold text-white">Saxiixa Maamulaha (Headmaster)</p>
              <p className="text-[10px] text-[#737373]">Shaabadda Iskuulka</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
