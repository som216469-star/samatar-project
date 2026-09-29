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
  ShieldCheck,
  Edit2,
  Camera,
  School,
  Activity,
  Archive,
  RotateCcw
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
  onStatusChange?: (student: Student, newStatus: 'active' | 'inactive' | 'archived') => void;
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
  onClose,
  onEditStudent,
  onStatusChange
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Top Header Card */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#141414] to-[#0a0a0a] border-b border-[#ffffff10] relative">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">
              Students / Profile / {student.id}
            </span>
            <div className="flex items-center gap-2">
              {onEditStudent && (
                <button
                  onClick={() => onEditStudent(student)}
                  className="px-3 py-1.5 rounded-sm bg-[#ffffff08] hover:bg-[#ffffff15] border border-[#ffffff15] text-xs font-semibold text-[#e5e5e5] flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#c4b5fd]" />
                  <span>Tafatir (Edit)</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-sm text-[#737373] hover:text-white hover:bg-[#ffffff08] transition-colors"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {student.photo ? (
              <img
                src={student.photo}
                alt={student.fullName}
                className="w-20 h-20 rounded-sm object-cover border-2 border-[#7c3aed]/50 shrink-0 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-sm bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center text-[#c4b5fd] font-bold text-2xl font-mono shrink-0">
                {student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#f5f5f5] leading-tight truncate">
                  {student.fullName}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-sm font-mono font-bold uppercase tracking-wider border ${
                  student.status === 'active'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                    : student.status === 'archived'
                    ? 'bg-slate-800/60 text-slate-300 border-slate-700/50'
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                }`}>
                  {student.status || 'active'}
                </span>
              </div>

              <p className="text-xs text-[#a3a3a3] font-mono">
                ID: <span className="text-white">{student.id}</span>
                {' · '}
                Fasal: <span className="text-[#c4b5fd] font-bold">{student.class}</span>
                {student.section ? ` (${student.section})` : ''}
                {student.rollNumber ? ` · Roll #${student.rollNumber}` : ''}
                {' · '}
                Jinsi: {student.gender || 'Male'}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#a3a3a3]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span className="font-mono">{student.guardianPhone || guardian?.phone || 'Lama helin'}</span>
                </div>
                {(student.guardianPhone || guardian?.phone) && (
                  <>
                    <a
                      href={`tel:${student.guardianPhone || guardian?.phone}`}
                      className="text-[11px] text-[#c4b5fd] hover:underline font-medium"
                    >
                      Wac Hadda
                    </a>
                    <a
                      href={`https://wa.me/${(student.guardianPhone || guardian?.phone || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-medium"
                    >
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-[#ffffff08] text-xs">
            <div className="bg-[#0a0a0a] p-3 rounded-sm border border-[#ffffff08]">
              <span className="text-[10px] text-[#737373] block uppercase font-mono">Heerka Joogitaanka</span>
              <span className="text-base font-bold font-mono text-emerald-400">{attendanceRate}%</span>
            </div>
            <div className="bg-[#0a0a0a] p-3 rounded-sm border border-[#ffffff08]">
              <span className="text-[10px] text-[#737373] block uppercase font-mono">Celceliska Imtixaanka</span>
              <span className="text-base font-bold font-mono text-[#c4b5fd]">{avgScore}%</span>
            </div>
            <div className="bg-[#0a0a0a] p-3 rounded-sm border border-[#ffffff08]">
              <span className="text-[10px] text-[#737373] block uppercase font-mono">Baaqiga Lacagta</span>
              <span className={`text-base font-bold font-mono ${balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currency} {balanceDue}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 sm:px-6 pt-3 bg-[#0a0a0a] border-b border-[#ffffff10] overflow-x-auto">
          {(['overview', 'academic', 'attendance', 'fees'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#7c3aed] text-white'
                  : 'border-transparent text-[#737373] hover:text-[#d4d4d4]'
              }`}
            >
              {tab === 'overview'
                ? 'Guudmar (Overview)'
                : tab === 'academic'
                ? `Natiijada (${studentScores.length})`
                : tab === 'attendance'
                ? `Xaadiriska (${totalMarked})`
                : `Lacagaha (${studentFees.length})`}
            </button>
          ))}

          <div className="ml-auto pl-2 pb-1">
            <button
              onClick={exportReportCardPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed]/15 border border-[#7c3aed]/30 text-[#c4b5fd] text-xs font-semibold rounded-sm hover:bg-[#7c3aed]/25 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Warbixin PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Personal Information */}
              <div className="bg-[#0a0a0a] border border-[#ffffff08] p-4 rounded-sm space-y-3">
                <div className="flex items-center gap-2 text-[#c4b5fd] border-b border-[#ffffff08] pb-2">
                  <User className="w-3.5 h-3.5" />
                  <h4 className="text-[11px] font-bold text-[#f5f5f5] uppercase font-mono tracking-wider">
                    1. Xogta Shakhsiga (Personal Info)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Magaca Buuxa</span>
                    <span className="text-[#e5e5e5] font-semibold">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Jinsiga (Gender)</span>
                    <span className="text-[#e5e5e5] font-medium">{student.gender || 'Male'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Taariikhda Dhalashada</span>
                    <span className="text-[#e5e5e5] font-mono">{student.dateOfBirth || 'Lama hayo'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Dhiigga / National ID</span>
                    <span className="text-[#e5e5e5] font-mono">
                      {[student.bloodGroup, student.nationalId].filter(Boolean).join(' · ') || 'Lama hayo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Enrollment Information */}
              <div className="bg-[#0a0a0a] border border-[#ffffff08] p-4 rounded-sm space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 border-b border-[#ffffff08] pb-2">
                  <School className="w-3.5 h-3.5" />
                  <h4 className="text-[11px] font-bold text-[#f5f5f5] uppercase font-mono tracking-wider">
                    2. Macluumaadka Waxbarashada (Enrollment)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Fasalka Hadda</span>
                    <span className="text-[#c4b5fd] font-bold">{student.class}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Qeybta / Roll No</span>
                    <span className="text-[#e5e5e5] font-mono">
                      {student.section ? `Sec ${student.section}` : '-'} {student.rollNumber ? `· #${student.rollNumber}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Taariikhda Qorista</span>
                    <span className="text-[#e5e5e5] font-mono">{student.createdAt || 'Lama hayo'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Iskuulkii Hore</span>
                    <span className="text-[#e5e5e5]">{student.previousSchool || 'Lama hayo'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Guardian Information */}
              <div className="bg-[#0a0a0a] border border-[#ffffff08] p-4 rounded-sm space-y-3">
                <div className="flex items-center gap-2 text-blue-400 border-b border-[#ffffff08] pb-2">
                  <Phone className="w-3.5 h-3.5" />
                  <h4 className="text-[11px] font-bold text-[#f5f5f5] uppercase font-mono tracking-wider">
                    3. Xogta Waalidka (Guardian Info)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Magaca Waalidka</span>
                    <span className="text-[#e5e5e5] font-semibold">{student.guardianName || guardian?.name || 'Lama hayo'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Xiriirka</span>
                    <span className="text-[#e5e5e5]">{student.guardianRelationship || guardian?.relationship || 'Waalid'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Telefoonka Koowaad</span>
                    <span className="text-[#c4b5fd] font-mono font-semibold">{student.guardianPhone || guardian?.phone || 'Lama hayo'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Cinwaanka Guriga</span>
                    <span className="text-[#e5e5e5]">{student.address || guardian?.address || 'Mogadishu'}</span>
                  </div>
                </div>
              </div>

              {/* 4. Status, Photo & System Information */}
              <div className="bg-[#0a0a0a] border border-[#ffffff08] p-4 rounded-sm space-y-3">
                <div className="flex items-center gap-2 text-amber-400 border-b border-[#ffffff08] pb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <h4 className="text-[11px] font-bold text-[#f5f5f5] uppercase font-mono tracking-wider">
                    4. Xaaladda & Xogta Nidaamka (System Info)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Arday ID (System Key)</span>
                    <span className="text-[#e5e5e5] font-mono">{student.id}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Sawirka Aqoonsiga</span>
                    <span className="text-[#e5e5e5]">{student.photo ? 'Waa diiwaangashan yahay' : 'Sawir ma jiro'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Last Updated</span>
                    <span className="text-[#e5e5e5] font-mono">{student.updatedAt || student.createdAt || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block text-[10px] uppercase">Xaaladda Hadda</span>
                    <span className="text-[#e5e5e5] font-mono uppercase">{student.status || 'active'}</span>
                  </div>
                </div>

                {onStatusChange && (
                  <div className="pt-2 border-t border-[#ffffff08] flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#737373] uppercase">Beddel Xaaladda:</span>
                    <div className="flex items-center gap-1.5">
                      {(['active', 'inactive', 'archived'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => onStatusChange(student, st)}
                          disabled={(student.status || 'active') === st}
                          className={`px-2 py-1 rounded-sm text-[10px] font-mono uppercase transition-colors border ${
                            (student.status || 'active') === st
                              ? 'bg-[#7c3aed]/20 text-[#c4b5fd] border-[#7c3aed]/40 font-bold cursor-default'
                              : 'bg-[#141414] text-[#888888] border-[#ffffff10] hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {student.medicalNotes && (
                <div className="md:col-span-2 bg-[#0a0a0a] border border-[#ffffff08] p-4 rounded-sm space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400 block">
                    Xusuusin Gaar ah / Caafimaad (Notes)
                  </span>
                  <p className="text-xs text-[#d4d4d4]">{student.medicalNotes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-3">
              {studentScores.length === 0 ? (
                <div className="py-8 text-center text-[#737373]">
                  Weli imtixaanno lama gelin ardaygan
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-[#ffffff08] rounded-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-[10px] uppercase font-mono text-[#737373] border-b border-[#ffffff08]">
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
              <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm">
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

              <div className="max-h-56 overflow-y-auto space-y-1">
                {studentAttendance.length === 0 ? (
                  <div className="py-6 text-center text-[#737373]">Weli diiwaan xaadiris ah lama hayo</div>
                ) : (
                  studentAttendance.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-[#0a0a0a] border border-[#ffffff05] rounded-sm text-xs">
                      <span className="font-mono text-[#a3a3a3]">{att.date}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold ${
                        att.status.toLowerCase() === 'present' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {att.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm">
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

              <div className="max-h-56 overflow-y-auto space-y-1">
                {studentFees.length === 0 ? (
                  <div className="py-6 text-center text-[#737373]">Weli biilal lacageed looma diiwaangelin</div>
                ) : (
                  studentFees.map(fee => (
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
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
