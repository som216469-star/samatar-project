import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  BookOpen, 
  Award, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Download, 
  FileText,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Student, AttendanceRecord, ExamScore, FeeRecord, Guardian } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentProfileModalProps {
  student: Student;
  guardian?: Guardian;
  classes?: any[];
  attendance?: AttendanceRecord[];
  attendanceRecords?: AttendanceRecord[];
  examScores?: ExamScore[];
  fees?: FeeRecord[];
  feeRecords?: FeeRecord[];
  subjects?: any[];
  currency?: string;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onEditStudent?: (student: Student) => void;
}

export default function StudentProfileModal({
  student,
  guardian,
  attendance,
  attendanceRecords,
  examScores = [],
  fees,
  feeRecords,
  currency = '$',
  onClose
}: StudentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'attendance' | 'fees'>('overview');

  const resolvedAttendance = attendance || attendanceRecords || [];
  const resolvedFees = fees || feeRecords || [];

  // Student specific records
  const studentAttendance = resolvedAttendance.filter(a => a.studentId === student.id);
  const studentScores = examScores.filter(e => e.studentId === student.id);
  const studentFees = resolvedFees.filter(f => f.studentId === student.id);

  // Attendance stats
  const totalMarked = studentAttendance.length;
  const presentDays = studentAttendance.filter(a => (a.status || '').toLowerCase() === 'present').length;
  const absentDays = studentAttendance.filter(a => (a.status || '').toLowerCase() === 'absent').length;
  const attendanceRate = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : 100;

  // Fee stats
  const totalBilled = studentFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  // Academic stats
  const totalScoreMarks = studentScores.reduce((sum, s) => sum + (Number(s.marksObtained) || 0), 0);
  const avgScore = studentScores.length > 0 ? Math.round(totalScoreMarks / studentScores.length) : 0;

  // Print Student Report Card
  const exportReportCardPDF = () => {
    const doc = new jsPDF();
    doc.text(`WARBIXINTA GUUD EE ARDAYGA (STUDENT REPORT CARD)`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Magaca: ${student.fullName} | Fasalka: ${student.class} | ID: ${student.id}`, 14, 22);
    doc.text(`Xiriirka Waalidka: ${student.guardianPhone || guardian?.phone || '-'} | Heerka Joogitaanka: ${attendanceRate}%`, 14, 28);

    doc.text(`Natiijooyinka Imtixaanka:`, 14, 38);
    autoTable(doc, {
      startY: 42,
      head: [['Exam Name', 'Subject', 'Score', 'Max', 'Grade']],
      body: studentScores.map(s => [
        s.examName || 'Term Exam',
        s.subjectName || 'Subject',
        s.marksObtained,
        s.maxMarks || 100,
        s.grade || (s.marksObtained >= 80 ? 'A' : s.marksObtained >= 65 ? 'B' : s.marksObtained >= 50 ? 'C' : 'F')
      ])
    });

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 80;
    doc.text(`Xaaladda Lacagta: Wadarta: ${currency} ${totalBilled} | La Bixiyey: ${currency} ${totalPaid} | Baaqiga: ${currency} ${balanceDue}`, 14, finalY);

    doc.save(`Warbixinta_${student.fullName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Top Header Card */}
        <div className="p-6 bg-gradient-to-r from-[#121212] to-[#0a0a0a] border-b border-[#ffffff10] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-sm text-[#737373] hover:text-white hover:bg-[#ffffff05]"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-sm bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center text-[#c4b5fd] font-bold text-2xl font-mono">
              {student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif text-[#f5f5f5] leading-tight">
                  {student.fullName}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold ${
                  student.status === 'active'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                }`}>
                  {student.status.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-[#737373] font-mono">
                ID: {student.id} • Fasal: <span className="text-[#c4b5fd] font-bold">{student.class}</span> • Jinsi: {student.gender || 'Male'}
              </p>

              <div className="flex items-center gap-3 pt-1 text-xs text-[#a3a3a3]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#525252]" />
                  <span className="font-mono">{student.guardianPhone || guardian?.phone || 'Lama helin'}</span>
                </div>
                {(student.guardianPhone || guardian?.phone) && (
                  <a
                    href={`https://wa.me/${(student.guardianPhone || guardian?.phone || '').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                  >
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[#ffffff05] text-xs">
            <div className="bg-[#0a0a0a] p-2.5 rounded-sm border border-[#ffffff05]">
              <span className="text-[10px] text-[#737373] block uppercase font-mono">Heerka Joogitaanka</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{attendanceRate}%</span>
            </div>
            <div className="bg-[#0a0a0a] p-2.5 rounded-sm border border-[#ffffff05]">
              <span className="text-[10px] text-[#737373] block uppercase font-mono">Celceliska Imtixaanka</span>
              <span className="text-sm font-bold font-mono text-[#c4b5fd]">{avgScore}%</span>
            </div>
            <div className="bg-[#0a0a0a] p-2.5 rounded-sm border border-[#ffffff05]">
              <span className="text-[10px] text-[#737373] block uppercase font-mono">Baaqiga Lacagta</span>
              <span className={`text-sm font-bold font-mono ${balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currency} {balanceDue}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-[#0a0a0a] border-b border-[#ffffff10]">
          {(['overview', 'academic', 'attendance', 'fees'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#7c3aed] text-white'
                  : 'border-transparent text-[#737373] hover:text-[#d4d4d4]'
              }`}
            >
              {tab === 'overview' ? 'Guudmar (Overview)' : tab === 'academic' ? 'Natiijada (Exams)' : tab === 'attendance' ? 'Xaadiriska' : 'Lacagaha (Fees)'}
            </button>
          ))}

          <div className="ml-auto">
            <button
              onClick={exportReportCardPDF}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#ffffff05] border border-[#ffffff10] text-[#c4b5fd] text-xs rounded-sm hover:bg-[#ffffff10]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Warbixin PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh] text-xs space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-[#0a0a0a] border border-[#ffffff05] p-4 rounded-sm space-y-3">
                <h4 className="text-xs font-bold text-[#f5f5f5] uppercase font-mono tracking-wider">Macluumaadka Ardayga</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#525252] block text-[10px]">Magaca Buuxa</span>
                    <span className="text-[#d4d4d4] font-medium">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#525252] block text-[10px]">Fasalka</span>
                    <span className="text-[#d4d4d4] font-medium">{student.class}</span>
                  </div>
                  <div>
                    <span className="text-[#525252] block text-[10px]">Taariikhda Dhalashada</span>
                    <span className="text-[#d4d4d4] font-medium">{student.dateOfBirth || 'Lama hayo'}</span>
                  </div>
                  <div>
                    <span className="text-[#525252] block text-[10px]">Taariikhda Diiwaangelinta</span>
                    <span className="text-[#d4d4d4] font-medium">{student.createdAt || 'Lama hayo'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#ffffff05] p-4 rounded-sm space-y-3">
                <h4 className="text-xs font-bold text-[#f5f5f5] uppercase font-mono tracking-wider">Macluumaadka Waalidka</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#525252] block text-[10px]">Magaca Waalidka</span>
                    <span className="text-[#d4d4d4] font-medium">{student.guardianName || guardian?.name || 'Lama hayo'}</span>
                  </div>
                  <div>
                    <span className="text-[#525252] block text-[10px]">Taleefanka Waalidka</span>
                    <span className="text-[#c4b5fd] font-mono font-medium">{student.guardianPhone || guardian?.phone || 'Lama hayo'}</span>
                  </div>
                  <div>
                    <span className="text-[#525252] block text-[10px]">Xiriirka</span>
                    <span className="text-[#d4d4d4] font-medium">{guardian?.relationship || 'Waalid'}</span>
                  </div>
                  <div>
                    <span className="text-[#525252] block text-[10px]">Cinwaanka</span>
                    <span className="text-[#d4d4d4] font-medium">{guardian?.address || 'Mogadishu'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-3">
              {studentScores.length === 0 ? (
                <div className="py-8 text-center text-[#525252] italic">
                  Weli imtixaanno lama gelin ardaygan
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-[#ffffff05] rounded-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-[10px] uppercase font-mono text-[#737373] border-b border-[#ffffff05]">
                      <tr>
                        <th className="py-2.5 px-3">Imtixaanka</th>
                        <th className="py-2.5 px-3">Maaddada</th>
                        <th className="py-2.5 px-3">Dhibcaha</th>
                        <th className="py-2.5 px-3">Darajada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffffff05] text-[#d4d4d4]">
                      {studentScores.map(score => {
                        const grade = score.grade || (score.marksObtained >= 80 ? 'A' : score.marksObtained >= 65 ? 'B' : score.marksObtained >= 50 ? 'C' : 'F');
                        return (
                          <tr key={score.id}>
                            <td className="py-2.5 px-3 font-semibold text-[#f5f5f5]">{score.examName || 'Midterm'}</td>
                            <td className="py-2.5 px-3">{score.subjectName}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#c4b5fd]">{score.marksObtained} / {score.maxMarks || 100}</td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                                grade === 'A' ? 'bg-emerald-950 text-emerald-400' : grade === 'F' ? 'bg-rose-950 text-rose-400' : 'bg-blue-950 text-blue-400'
                              }`}>
                                {grade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#ffffff05] rounded-sm">
                <div>
                  <span className="text-[10px] text-[#737373] block">Maalmaha la joogay</span>
                  <span className="text-sm font-bold text-emerald-400">{presentDays} maalmood</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] block">Maalmaha la maqnaa</span>
                  <span className="text-sm font-bold text-rose-400">{absentDays} maalmood</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] block">Wadarta Diiwaanka</span>
                  <span className="text-sm font-bold text-[#f5f5f5]">{totalMarked} xilliyo</span>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {studentAttendance.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-[#0a0a0a] border border-[#ffffff05] rounded-sm text-xs">
                    <span className="font-mono text-[#a3a3a3]">{att.date}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold ${
                      att.status.toLowerCase() === 'present' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}>
                      {att.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#ffffff05] rounded-sm">
                <div>
                  <span className="text-[10px] text-[#737373] block">Wadarta Khidmadda</span>
                  <span className="text-sm font-bold text-[#f5f5f5]">{currency} {totalBilled}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] block">La Bixiyey</span>
                  <span className="text-sm font-bold text-emerald-400">{currency} {totalPaid}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] block">Baaqiga Hadhey</span>
                  <span className={`text-sm font-bold ${balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currency} {balanceDue}
                  </span>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {studentFees.map(fee => (
                  <div key={fee.id} className="flex items-center justify-between p-2.5 bg-[#0a0a0a] border border-[#ffffff05] rounded-sm text-xs">
                    <div>
                      <div className="font-semibold text-[#f5f5f5]">{fee.month} {fee.year} (Fee)</div>
                      <div className="text-[10px] text-[#737373]">{fee.createdAt ? new Date(fee.createdAt).toLocaleDateString() : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-[#c4b5fd]">{currency} {fee.amount}</div>
                      <span className={`text-[10px] font-semibold ${
                        fee.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {fee.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
