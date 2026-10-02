import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Teacher } from '../../types';
import { downloadStudentSpreadsheet } from '../../lib/studentSpreadsheet';

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

export async function exportTeachersToExcel(teachers: Teacher[]): Promise<void> {
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
  await downloadStudentSpreadsheet(
    data as Record<string, unknown>[],
    `Teachers_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
    'Teachers'
  );
}
