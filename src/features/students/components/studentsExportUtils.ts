import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, SchoolClass } from '../../../types';

export interface StudentFeeSummary {
  status: string;
  amount: number;
  paid: number;
  balance: number;
}

export function compressImage(file: File, maxDim = 400, quality = 0.85): Promise<string> {
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

export function exportStudentsToExcel(
  targetStudents: Student[],
  getStudentFeeStatus: (studentId: string) => StudentFeeSummary,
  currency: string,
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void,
  filename = 'DugsiPro_Students_Roster.xlsx'
) {
  if (targetStudents.length === 0) {
    showToast('Wax xog arday ah oo la dhoofiyo ma jiraan', 'warning');
    return;
  }

  const exportData = targetStudents.map((s, idx) => {
    const fee = getStudentFeeStatus(s.id);
    return {
      No: idx + 1,
      'Student ID': s.id,
      'Full Name': s.fullName,
      Class: s.class,
      Section: s.section || '-',
      'Roll Number': s.rollNumber || '-',
      Gender: s.gender,
      Status: s.status || 'active',
      'Guardian Phone': s.guardianPhone || '-',
      'Guardian Name': s.guardianName || '-',
      Address: s.address || '-',
      'Fee Status': fee.status,
      'Paid Amount': `${currency} ${fee.paid}`,
      Balance: `${currency} ${fee.balance}`,
      'Registration Date': s.createdAt || '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ardayda');
  XLSX.writeFile(wb, filename);
  showToast(`Faylka Excel waa la diyaariyey (${targetStudents.length} arday)`, 'success');
}

export function exportStudentsToCSV(
  targetStudents: Student[],
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
) {
  if (targetStudents.length === 0) {
    showToast('Wax xog ah oo la dhoofiyo ma jiraan', 'warning');
    return;
  }
  const exportData = targetStudents.map((s, idx) => ({
    No: idx + 1,
    'Student ID': s.id,
    'Full Name': s.fullName,
    Class: s.class,
    Gender: s.gender,
    Status: s.status || 'active',
    'Guardian Phone': s.guardianPhone || '-',
    'Registration Date': s.createdAt || '-'
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
  showToast('Faylka CSV waa la soo dejiyey', 'success');
}

export function exportStudentsToPDF(
  targetStudents: Student[],
  schoolName: string,
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
) {
  if (targetStudents.length === 0) {
    showToast('Wax xog ah oo la daabaco ma jiraan', 'warning');
    return;
  }

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(245, 245, 245);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName || 'DUGSI PRO SCHOOL', 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(167, 139, 250);
    doc.text('STUDENT MANAGEMENT DIRECTORY / DIIWAANKA ARDAYDA', 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Date: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })} | Total: ${targetStudents.length} Students`,
      140,
      22
    );

    const tableData = targetStudents.map((s, idx) => [
      idx + 1,
      s.id,
      s.fullName,
      s.class,
      s.gender,
      s.guardianPhone || '-',
      (s.status || 'active').toUpperCase()
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
    showToast('Faylka PDF waa la daabacay', 'success');
  } catch (e) {
    console.error(e);
    showToast('Khalad ayaa dhacay abuurista PDF', 'error');
  }
}

export function downloadStudentsExcelTemplate(
  classes: SchoolClass[],
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
) {
  const templateRows = [
    {
      'Student ID (Optional)': 'STD-1001',
      'Magaca Ardayga (Full Name) *': 'Maxamed Cali Jaamac',
      'Fasalka (Class) *': classes[0]?.className || 'Fasalka 1aad',
      Section: 'A',
      'Roll Number': '01',
      'Lab/Dhedig (Gender - Male/Female)': 'Male',
      'Telefoonka Waalidka (Guardian Phone)': '+252615123456',
      'Magaca Waalidka (Guardian Name)': 'Cali Jaamac',
      'Status (active/inactive/archived)': 'active'
    },
    {
      'Student ID (Optional)': 'STD-1002',
      'Magaca Ardayga (Full Name) *': 'Caasho Axmed Nuur',
      'Fasalka (Class) *': classes[0]?.className || 'Fasalka 1aad',
      Section: 'A',
      'Roll Number': '02',
      'Lab/Dhedig (Gender - Male/Female)': 'Female',
      'Telefoonka Waalidka (Guardian Phone)': '+252615654321',
      'Magaca Waalidka (Guardian Name)': 'Axmed Nuur',
      'Status (active/inactive/archived)': 'active'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ardayda_Template');
  XLSX.writeFile(wb, 'DugsiPro_Students_Template.xlsx');
  showToast('Template-ka Excel waa la soo dejiyey', 'success');
}
