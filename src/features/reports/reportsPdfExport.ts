import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExamScore, SchoolClass, Student } from '../../types';

export function getAcademicFeedback(avgPercentage: number) {
  if (avgPercentage >= 90) {
    return {
      grade: 'A+',
      text: 'Aad u Sareeya — Dadaal Cajiib ah! (Outstanding Performance)',
      color: 'text-emerald-500',
      somaliRemark: 'Aad u Sareeya — Dadaal Cajiib ah!',
      englishRemark: 'Outstanding Academic Performance'
    };
  }
  if (avgPercentage >= 80) {
    return {
      grade: 'A',
      text: 'Aad u Wanaagsan — Sii wad dadaalka. (Excellent Progress)',
      color: 'text-emerald-500',
      somaliRemark: 'Aad u Wanaagsan — Sii wad dadaalka.',
      englishRemark: 'Excellent Academic Progress'
    };
  }
  if (avgPercentage >= 70) {
    return {
      grade: 'B',
      text: 'Wanaagsan — Natiijo lagu farxo. (Good Academic Standing)',
      color: 'text-blue-500',
      somaliRemark: 'Wanaagsan — Natiijo lagu farxo.',
      englishRemark: 'Good Academic Standing'
    };
  }
  if (avgPercentage >= 50) {
    return {
      grade: 'C',
      text: 'Dhexdhexaad — Kordhi akhriska iyo dadaalka. (Satisfactory)',
      color: 'text-amber-500',
      somaliRemark: 'Dhexdhexaad — Kordhi akhriska iyo dadaalka.',
      englishRemark: 'Satisfactory — Needs More Effort'
    };
  }
  return {
    grade: 'F',
    text: 'Wuxuu u baahan yahay kormeer iyo taageero dheeraad ah. (Needs Support)',
    color: 'text-rose-500',
    somaliRemark: 'Wuxuu u baahan yahay kormeer iyo taageero dheeraad ah.',
    englishRemark: 'Needs Immediate Academic Support'
  };
}

export function exportClassReportPDF(params: {
  selectedClass: string;
  classes: SchoolClass[];
  classStudents: Student[];
  classAttendanceRate: number;
  classFinanceRate: number;
  classExamAvg: number;
  classMaleCount: number;
  classFemaleCount: number;
}) {
  const {
    selectedClass,
    classes,
    classStudents,
    classAttendanceRate,
    classFinanceRate,
    classExamAvg,
    classMaleCount,
    classFemaleCount
  } = params;

  const doc = new jsPDF();
  const classObj = classes.find(
    (c) => c.className.toLowerCase() === selectedClass.toLowerCase()
  );

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(`WARBIXINTA FASALKA: ${selectedClass}`, 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Macallinka: ${classObj?.teacherName || 'Lama Xusin'} | Qolka: ${classObj?.roomNumber || 'N/A'} | Taariikhda: ${new Date().toLocaleDateString()}`,
    14,
    20
  );

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(
    `Wadarta Ardayda: ${classStudents.length} (${classMaleCount} Lab / ${classFemaleCount} Dhedig)   |   Xaadirinta: ${classAttendanceRate}%   |   Bixinta Fiiga: ${classFinanceRate}%   |   Celceliska Imtixaanka: ${classExamAvg}%`,
    14,
    35
  );

  autoTable(doc, {
    startY: 42,
    head: [['#', 'Magaca Ardayga', 'Jinsiga', 'Telefoonka Waalidka', 'Status']],
    body: classStudents.map((s, i) => [
      i + 1,
      s.fullName,
      s.gender === 'Male' ? 'Lab' : 'Dhedig',
      s.guardianPhone || 'N/A',
      s.status || 'active'
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(`Warbixinta_Fasalka_${selectedClass}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportStudentReportCardPDF(params: {
  activeStudent: Student;
  activeStudentExams: ExamScore[];
  stdPresentCount: number;
  stdAbsentCount: number;
  stdAttendanceRate: number;
  stdTotalInvoiced: number;
  stdTotalPaid: number;
  stdBalance: number;
  stdAvgPercentage: number;
}) {
  const {
    activeStudent,
    activeStudentExams,
    stdPresentCount,
    stdAbsentCount,
    stdAttendanceRate,
    stdTotalInvoiced,
    stdTotalPaid,
    stdBalance,
    stdAvgPercentage
  } = params;

  const doc = new jsPDF();
  const feedback = getAcademicFeedback(stdAvgPercentage);

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('WARBIXINTA NATIIJADA ARDAYGA (REPORT CARD)', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Ardayga: ${activeStudent.fullName} | Fasalka: ${activeStudent.class} | ID: ${activeStudent.id.slice(0, 8)}`,
    14,
    21
  );

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(
    `Celceliska: ${stdAvgPercentage}% (${feedback.grade}) | Xaadirinta: ${stdAttendanceRate}% (${stdPresentCount} Jooga, ${stdAbsentCount} Maqan)`,
    14,
    37
  );
  doc.text(
    `Maaliyadda: Wadarta $${stdTotalInvoiced} | Bixiyay $${stdTotalPaid} | Baaqi $${stdBalance}`,
    14,
    43
  );

  autoTable(doc, {
    startY: 50,
    head: [['Maadada (Subject)', 'Nooca Imtixaanka', 'Dhibcaha', 'Boqolkiiba', 'Darajada']],
    body: activeStudentExams.map((ex) => {
      const pct = Math.round((ex.marksObtained / ex.maxMarks) * 100);
      return [
        ex.subjectName,
        ex.examName,
        `${ex.marksObtained} / ${ex.maxMarks}`,
        `${pct}%`,
        ex.grade
      ];
    }),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(
    `Shahaadada_${activeStudent.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
