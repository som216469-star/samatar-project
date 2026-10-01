import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Teacher } from '../../types';

export function exportTeachersToPDF(teachers: Teacher[], currency: string = '$'): void {
  if (teachers.length === 0) return;
  const doc = new jsPDF();
  doc.text('Dugsiga Pro 2026 - Liiska Macallimiinta (Teachers Directory)', 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [['ID', 'Name', 'Phone', 'Qualification', 'Specialization', 'Status', 'Salary']],
    body: teachers.map((t) => [
      t.teacherId,
      t.name,
      t.phone,
      t.qualification,
      t.specialization,
      t.employmentStatus,
      `${currency} ${t.salary}`
    ])
  });
  doc.save(`Macallimiinta_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportTeachersToExcel(teachers: Teacher[]): void {
  if (teachers.length === 0) return;
  const data = teachers.map((t) => ({
    ID: t.teacherId,
    Name: t.name,
    Phone: t.phone,
    Email: t.email || '',
    Gender: t.gender,
    Qualification: t.qualification,
    Specialization: t.specialization,
    Status: t.employmentStatus,
    Salary: t.salary,
    HireDate: t.hireDate
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
  XLSX.writeFile(wb, `Teachers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}
