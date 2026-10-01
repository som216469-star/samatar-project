import React, { useState } from 'react';
import {
  Calendar,
  Save,
  Download,
  Search,
  Users,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { StaffAttendance, Teacher, StaffMember } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import { Button, Card, StatCard, Badge, EmptyState } from '../../components/ui/primitives';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface StaffAttendanceViewProps {
  teachers: Teacher[];
  staff: StaffMember[];
  attendanceRecords?: StaffAttendance[];
  records?: StaffAttendance[];
  onSaveAttendance: (recordsOrDate: any, maybeRecords?: any) => Promise<void>;
  theme: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function StaffAttendancePage({
  teachers,
  staff,
  attendanceRecords = [],
  records = [],
  onSaveAttendance,
  showToast = () => {}
}: StaffAttendanceViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Teachers' | 'Staff'>('All');
  const [saving, setSaving] = useState(false);

  const allEmployees = [
    ...teachers.map((t) => ({
      id: t.id,
      name: t.name,
      employeeId: t.teacherId,
      type: 'Teacher',
      role: 'Teacher',
      phone: t.phone
    })),
    ...staff.map((s) => ({
      id: s.id,
      name: s.name,
      employeeId: s.employeeId,
      type: 'Staff',
      role: s.role,
      phone: s.phone
    }))
  ];

  const recordsList = attendanceRecords.length > 0 ? attendanceRecords : records;
  const existingForDate = recordsList.filter((a) => a.date === selectedDate);
  const existingMap = new Map<string, string>();
  existingForDate.forEach((a) => existingMap.set(a.staffId, a.status));

  const [statusMap, setStatusMap] = useState<{
    [id: string]: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Leave';
  }>({});

  const getStatus = (empId: string): 'Present' | 'Absent' | 'Late' | 'Excused' | 'Leave' => {
    if (statusMap[empId]) return statusMap[empId];
    if (existingMap.has(empId)) return existingMap.get(empId) as any;
    return 'Present';
  };

  const handleStatusChange = (
    empId: string,
    status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Leave'
  ) => {
    setStatusMap((prev) => ({
      ...prev,
      [empId]: status
    }));
  };

  const markAllPresent = () => {
    const updated: any = {};
    allEmployees.forEach((e) => {
      updated[e.id] = 'Present';
    });
    setStatusMap(updated);
    showToast('Dhammaan waxaa loo calaamadeeyay Jooga (Present)', 'info');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const recordsToSave = allEmployees.map((e) => ({
        staffId: e.id,
        staffName: e.name,
        role: e.role,
        status: getStatus(e.id),
        date: selectedDate,
        timestamp: new Date().toISOString()
      }));

      await onSaveAttendance(selectedDate, recordsToSave);
      showToast('Xaadiriska macallimiinta iyo shaqaalaha waa la kaydiyey', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Khalad ayaa dhacay xilliga kaydinta', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = allEmployees.filter((e) => {
    const matchQuery =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'All' || e.type === filterType;
    return matchQuery && matchType;
  });

  const totalEmployees = allEmployees.length;
  const presentCount = allEmployees.filter((e) => getStatus(e.id) === 'Present').length;
  const absentCount = allEmployees.filter((e) => getStatus(e.id) === 'Absent').length;
  const lateCount = allEmployees.filter((e) => getStatus(e.id) === 'Late').length;
  const leaveCount = allEmployees.filter(
    (e) => getStatus(e.id) === 'Leave' || getStatus(e.id) === 'Excused'
  ).length;
  const attendanceRate =
    totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  const exportPDF = () => {
    if (filteredEmployees.length === 0) return;
    const doc = new jsPDF();
    doc.text(`Dugsiga Pro 2026 - Xaadiriska Shaqaalaha (${selectedDate})`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['ID', 'Name', 'Category', 'Role', 'Status']],
      body: filteredEmployees.map((e) => [
        e.employeeId,
        e.name,
        e.type,
        e.role,
        getStatus(e.id)
      ])
    });
    doc.save(`Staff_Attendance_${selectedDate}.pdf`);
  };

  const exportExcel = () => {
    if (filteredEmployees.length === 0) return;
    const data = filteredEmployees.map((e) => ({
      ID: e.employeeId,
      Name: e.name,
      Category: e.type,
      Role: e.role,
      Date: selectedDate,
      Status: getStatus(e.id)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Staff_Attendance_${selectedDate}.xlsx`);
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'People & HR' }, { label: 'Staff Attendance' }]}
        title="Xaadiriska Macallimiinta & Shaqaalaha"
        description="Diiwaangelinta joogitaanka maalinlaha ah ee macallimiinta iyo shaqaalaha iskuulka"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3 py-1.5 rounded-lg">
              <Calendar className="w-4 h-4 text-[var(--color-brand)]" />
              <input
                type="date"
                aria-label="Attendance date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-[var(--color-text-primary)] focus:outline-none border-0 p-0"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              loading={saving}
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
            >
              {saving ? 'Kaydinaya...' : 'Kaydi Xaadiriska'}
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label="Shaqaale Guud"
          value={totalEmployees}
          sublabel="Macallin & Shaqaale"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Jooga (Present)"
          value={presentCount}
          sublabel={`${attendanceRate}% heerka joogitaanka`}
          variant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          label="Maqan (Absent)"
          value={absentCount}
          sublabel="Aan xaadirin"
          variant="danger"
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Daahay (Late)"
          value={lateCount}
          sublabel="Soo daahay"
          variant="warning"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Fasax (Leave)"
          value={leaveCount}
          sublabel="Idan leh"
          variant="info"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      {/* Control Bar: Search, Category Filter, Quick Mark All */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Raadi shaqaale ama macallin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ds-input pl-9 pr-3 py-2"
              />
            </div>

            <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-1 rounded-lg">
              {(['All', 'Teachers', 'Staff'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    filterType === type
                      ? 'bg-[var(--color-brand)] text-white shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {type === 'All'
                    ? 'Dhammaan'
                    : type === 'Teachers'
                    ? 'Macallimiinta'
                    : 'Shaqaalaha'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4 text-[var(--color-success)]" />}
              onClick={markAllPresent}
            >
              Dhammaan Jooga
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={exportPDF}
            >
              PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={exportExcel}
            >
              Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Roster Table with Status Selectors */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4">ID & Magaca</th>
                <th className="py-3 px-4">Qaybta (Category)</th>
                <th className="py-3 px-4">Doorka (Role)</th>
                <th className="py-3 px-4 text-center">
                  Xaaladda Joogitaanka (Attendance Status)
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10">
                    <EmptyState
                      title="Shaqaale lama helin"
                      description="Ma jiraan macallimiin ama shaqaale waafaqsan raadintaada."
                    />
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((e) => {
                  const currentStatus = getStatus(e.id);
                  return (
                    <tr key={e.id}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--color-text-primary)]">
                          {e.name}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                          {e.employeeId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={e.type === 'Teacher' ? 'brand' : 'neutral'}>
                          {e.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">{e.role}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(e.id, 'Present')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              currentStatus === 'Present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                            }`}
                          >
                            Jooga
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(e.id, 'Absent')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              currentStatus === 'Absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                            }`}
                          >
                            Maqan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(e.id, 'Late')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              currentStatus === 'Late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                            }`}
                          >
                            Daahay
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(e.id, 'Leave')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              currentStatus === 'Leave' || currentStatus === 'Excused'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                            }`}
                          >
                            Fasax
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
