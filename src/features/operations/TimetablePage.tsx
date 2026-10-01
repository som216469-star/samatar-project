import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Download,
  User,
  BookOpen,
  MapPin,
  X
} from 'lucide-react';
import { TimetableSlot, SchoolClass, SchoolSubject, Teacher } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Card,
  Button,
  Badge,
  EmptyState,
  ConfirmDialog
} from '../../components/ui/primitives';

interface TimetableScheduleViewProps {
  timetable: TimetableSlot[];
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  teachers: Teacher[];
  onAddSlot: (slotData: Omit<TimetableSlot, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteSlot: (id: string) => Promise<void>;
  theme?: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const DAYS: { id: TimetableSlot['day']; label: string }[] = [
  { id: 'Saturday', label: 'Sabti (Saturday)' },
  { id: 'Sunday', label: 'Axad (Sunday)' },
  { id: 'Monday', label: 'Isniin (Monday)' },
  { id: 'Tuesday', label: 'Talaado (Tuesday)' },
  { id: 'Wednesday', label: 'Arbaco (Wednesday)' },
  { id: 'Thursday', label: 'Khamiis (Thursday)' },
  { id: 'Friday', label: 'Jimce (Friday)' }
];

export default function TimetablePage({
  timetable,
  classes,
  subjects,
  teachers,
  onAddSlot,
  onDeleteSlot
}: TimetableScheduleViewProps) {
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.className || '');
  const [selectedDay, setSelectedDay] = useState<TimetableSlot['day']>('Saturday');
  const [showModal, setShowModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    academicYear: string;
    term: string;
    className: string;
    subjectName: string;
    teacherName: string;
    day: TimetableSlot['day'];
    startTime: string;
    endTime: string;
    roomNumber: string;
  }>({
    academicYear: '2025/2026',
    term: 'Term 1',
    className: classes[0]?.className || '',
    subjectName: subjects[0]?.subjectName || '',
    teacherName: teachers[0]?.name || '',
    day: 'Saturday',
    startTime: '08:00',
    endTime: '08:45',
    roomNumber: 'Room 101'
  });

  const filteredPeriods = timetable
    .filter((p) => (!selectedClass || p.className === selectedClass) && p.day === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleOpenAdd = () => {
    setFormData({
      academicYear: '2025/2026',
      term: 'Term 1',
      className: selectedClass || classes[0]?.className || '',
      subjectName: subjects[0]?.subjectName || '',
      teacherName: teachers[0]?.name || '',
      day: selectedDay,
      startTime: '08:00',
      endTime: '08:45',
      roomNumber: 'Room 101'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddSlot(formData);
    setShowModal(false);
  };

  const exportTimetableCSV = () => {
    const headers = ['Class', 'Day', 'Start Time', 'End Time', 'Subject', 'Teacher', 'Room'];
    const rows = timetable
      .filter((p) => !selectedClass || p.className === selectedClass)
      .map((p) => [
        p.className,
        p.day,
        p.startTime,
        p.endTime,
        p.subjectName,
        p.teacherName,
        p.roomNumber
      ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_${selectedClass || 'all'}.csv`;
    a.click();
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Jadwalka Xisadaha (Class Timetable)"
        subtitle="Maamul jadwalka maalinlaha ah ee fasallada, maadooyinka, iyo macalimiinta."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              icon={<Download className="w-4 h-4" />}
              onClick={exportTimetableCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAdd}
            >
              Ku dar Xisad (Add Period)
            </Button>
          </div>
        }
      />

      {/* Filters Bar */}
      <Card className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] whitespace-nowrap">
            Dooro Fasalka:
          </span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 flex-1 lg:w-60"
          >
            <option value="">Dhammaan Fasallada (All Classes)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.className}>
                {c.className}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Schedule Grid */}
      {filteredPeriods.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="Jadwal lama helin maalintan"
            description="Riix 'Ku dar Xisad' si aad u abuurto jadwalka fasalkan."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Ku dar Xisad (Add Period)
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeriods.map((period) => (
            <Card
              key={period.id}
              className="p-5 hover:border-emerald-500/30 transition-all group relative"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <Badge variant="success" className="gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {period.startTime} - {period.endTime}
                </Badge>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(period.id)}
                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Tirtir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                {period.subjectName}
              </h3>

              <div className="space-y-2 text-xs text-[var(--color-text-secondary)] pt-3 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> Macalinka:
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {period.teacherName || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> Qolka / Fasalka:
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {period.className} {period.roomNumber ? `• ${period.roomNumber}` : ''}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ds-surface-elevated rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Ku dar Xisad Cusub
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Fasalka (Class)
                  </label>
                  <select
                    required
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="">Dooro Fasal</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.className}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Maalinta (Day)
                  </label>
                  <select
                    required
                    value={formData.day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        day: e.target.value as TimetableSlot['day']
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    {DAYS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Maadada (Subject)
                  </label>
                  <input
                    type="text"
                    required
                    list="subjects-list"
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    placeholder="Matoor ama qor maadada"
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                  <datalist id="subjects-list">
                    {subjects.map((s) => (
                      <option key={s.id} value={s.subjectName} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Macalinka (Teacher)
                  </label>
                  <input
                    type="text"
                    list="teachers-list"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    placeholder="Magaca macalinka"
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                  <datalist id="teachers-list">
                    {teachers.map((t) => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Bilowga (Start)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Dhamaadka (End)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Qolka (Room)
                  </label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    placeholder="Room 1"
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Jooji
                </Button>
                <Button variant="primary" type="submit">
                  Kaydi Xisadda
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Tirtir Xisadda (Delete Period)"
        description="Ma hubtaa inaad tirtirto xisaddan jadwalka ku jirta?"
        confirmLabel="Haa, Tirtir"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId === null) return;
          setIsDeleting(true);
          try {
            await onDeleteSlot(pendingDeleteId);
          } finally {
            setIsDeleting(false);
            setPendingDeleteId(null);
          }
        }}
      />
    </PageContainer>
  );
}
