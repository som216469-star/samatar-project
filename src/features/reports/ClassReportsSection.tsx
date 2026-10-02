import React from 'react';
import { Download, Users, UserCheck, DollarSign, Award } from 'lucide-react';
import { Student, SchoolClass } from '../../types';
import { Badge, Button, Card, EmptyState, StatCard } from '../../components/ui/primitives';

interface ClassReportsSectionProps {
  selectedClass: string;
  onSelectClass: (cls: string) => void;
  classes: SchoolClass[];
  classStudents: Student[];
  classAttendanceRate: number;
  classFinanceRate: number;
  classExamAvg: number;
  classMaleCount: number;
  classFemaleCount: number;
  classTotalPaid: number;
  classTotalInvoiced: number;
  onExportPDF: () => void;
}

export const ClassReportsSection: React.FC<ClassReportsSectionProps> = ({
  selectedClass,
  onSelectClass,
  classes,
  classStudents,
  classAttendanceRate,
  classFinanceRate,
  classExamAvg,
  classMaleCount,
  classFemaleCount,
  classTotalPaid,
  classTotalInvoiced,
  onExportPDF
}) => {
  return (
    <div className="space-y-6 no-print">
      {/* Class Select Bar */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              Dooro Fasalka aad rabto warbixintiisa
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Xogta hoose waxay si toos ah u xisaabinaysaa celcelisyada fasalkan
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <select
              aria-label="Dooro Fasalka"
              value={selectedClass}
              onChange={(e) => onSelectClass(e.target.value)}
              className="ds-input py-2 px-3.5 text-xs font-semibold min-w-[200px]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.className}>
                  {c.className}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={onExportPDF}
            >
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ardayda Fasalka"
          value={classStudents.length}
          sublabel={`${classMaleCount} wiil • ${classFemaleCount} gabdhood`}
          variant="brand"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Xaadirinta (Attendance)"
          value={`${classAttendanceRate}%`}
          sublabel="Celceliska joogitaanka"
          variant="success"
          icon={<UserCheck className="w-4 h-4" />}
        />
        <StatCard
          label="Lacag Bixinta (Tuition)"
          value={`${classFinanceRate}%`}
          sublabel={`$${classTotalPaid.toLocaleString()} / $${classTotalInvoiced.toLocaleString()}`}
          variant="info"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Celcelis Imtixaan (Exam Avg)"
          value={`${classExamAvg}%`}
          sublabel="Natiijada guud ee fasalka"
          variant="warning"
          icon={<Award className="w-4 h-4" />}
        />
      </div>

      {/* Detailed Demographic and Class List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="space-y-5">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">
            Warbixinta Guud
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Fasalka:</span>
              <Badge variant="brand">{selectedClass}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Macallinka Mas&apos;uulka:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {classes.find((c) => c.className === selectedClass)?.teacherName || 'Lama qoondeyn'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Qolka (Room):</span>
              <span className="font-mono text-[var(--color-text-primary)]">
                {classes.find((c) => c.className === selectedClass)?.roomNumber || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Wiilal (Boys):</span>
              <span className="font-semibold text-[var(--color-brand)] font-mono">
                {classMaleCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Gabdho (Girls):</span>
              <span className="font-semibold text-[var(--color-info)] font-mono">
                {classFemaleCount}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3.5">
              <span className="text-[var(--color-text-secondary)]">Biilasha la soo ururiyey:</span>
              <span className="font-mono font-bold text-[var(--color-success)]">
                ${classTotalPaid.toLocaleString()} / ${classTotalInvoiced.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card padding="none" className="lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Liiska Ardayda Fasalka
            </h3>
            <Badge variant="brand">{classStudents.length} Arday</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="px-5 py-3">Magaca (Name)</th>
                  <th className="px-4 py-3">Lab/Dhedig (Gender)</th>
                  <th className="px-4 py-3">Teleefanka Waalidka (Phone)</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.length > 0 ? (
                  classStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-5 py-3 font-semibold text-[var(--color-text-primary)]">
                        {student.fullName}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {student.gender}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">
                        {student.guardianPhone || 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                          {student.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-10">
                      <EmptyState
                        title="Fasalkaan hadda arday kuma diiwaangashana"
                        description="Dooro fasal kale ama ku dar arday fasalkaan."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
