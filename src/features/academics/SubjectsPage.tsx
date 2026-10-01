import React, { useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen, FolderOpen, Search, AlertCircle } from 'lucide-react';
import { SchoolSubject, SchoolClass } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Button,
  Card,
  StatCard,
  Modal,
  ConfirmDialog,
  EmptyState
} from '../../components/ui/primitives';

export interface SubjectsViewProps {
  subjects: SchoolSubject[];
  classes: SchoolClass[];
  onAddSubject: (subjectData: Omit<SchoolSubject, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateSubject: (id: string, subjectData: Partial<SchoolSubject>) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
  theme: 'light' | 'dark';
}

export default function SubjectsPage({
  subjects,
  classes,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject
}: SubjectsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [form, setForm] = useState({
    subjectName: '',
    subjectCode: '',
    className: '',
    teacherName: ''
  });

  const openAddModal = () => {
    setEditingSubject(null);
    setForm({
      subjectName: '',
      subjectCode: '',
      className: classes.length > 0 ? classes[0].className : '',
      teacherName: ''
    });
    setShowModal(true);
  };

  const openEditModal = (sub: SchoolSubject) => {
    setEditingSubject(sub);
    setForm({
      subjectName: sub.subjectName,
      subjectCode: sub.subjectCode || '',
      className: sub.className || '',
      teacherName: sub.teacherName || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectName.trim()) return;

    setLoading(true);
    try {
      if (editingSubject) {
        await onUpdateSubject(editingSubject.id, form);
      } else {
        await onAddSubject(form);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      await onDeleteSubject(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subjectCode && s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.teacherName && s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClass = classFilter === 'All' || s.className === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Academic' }, { label: 'Subjects' }]}
        title="Maaddooyinka (Subjects)"
        description="Maamul maaddooyinka iyo manhajka iskuulka ee fasal walba"
        actions={
          <Button
            variant="primary"
            size="md"
            disabled={classes.length === 0}
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
          >
            Maaddo Cusub (Add Subject)
          </Button>
        }
      />

      {classes.length === 0 && (
        <div className="p-4 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-soft)] text-[var(--color-warning)] text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Horta fadlan soo samee ugu yaraan hal Fasal si aad maaddooyinka ugu xiriiriso.
          </span>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi maaddo, koodh, ama macallin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ds-input pl-9 pr-3 py-2"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="ds-input w-full sm:w-44 py-2"
          >
            <option value="All">Dhammaan Fasallada</option>
            {classes.map((c) => (
              <option key={c.id} value={c.className}>
                {c.className}
              </option>
            ))}
          </select>
        </Card>

        <StatCard
          label="Maaddooyinka Guud"
          value={subjects.length}
          sublabel="Manhajka diiwaangashan"
          variant="brand"
          icon={<BookOpen className="w-4 h-4" />}
        />

        <StatCard
          label="Maaddooyinka Muuqda"
          value={filteredSubjects.length}
          sublabel={classFilter === 'All' ? 'Dhammaan fasallada' : `Fasalka ${classFilter}`}
          variant="success"
          icon={<FolderOpen className="w-4 h-4" />}
        />
      </div>

      {/* Grid of Subjects */}
      {filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => (
            <Card
              key={sub.id}
              className="flex flex-col justify-between hover:border-[var(--color-brand-border)] transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {sub.subjectName}
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
                      Code: {sub.subjectCode || 'N/A'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-brand)]">
                    {sub.className}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Macallinka:</span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {sub.teacherName || 'Lama meeleyn'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono tabular-nums text-[var(--color-text-muted)]">
                  {sub.createdAt}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(sub)}
                    className="p-1.5 rounded-md bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    title="Tafatir"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ id: sub.id, name: sub.subjectName })}
                    className="p-1.5 rounded-md bg-[var(--color-surface-muted)] hover:bg-[var(--color-danger-soft)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors"
                    title="Tirtir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="Maaddooyin ma jiraan"
            description="Guji 'Maaddo Cusub' si aad ugu darto maaddooyinka manhajka."
            action={
              classes.length > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={openAddModal}
                >
                  Maaddo Cusub
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {/* Subject Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSubject ? 'Tafatir Maaddada' : 'Abuur Maaddo Cusub'}
        description="Geli magaca maaddada, koodhka, fasalka, iyo macallinka dhiga."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Ka noqo
            </Button>
            <Button variant="primary" loading={loading} onClick={handleSubmit as any}>
              {editingSubject ? 'Cusbooneysii' : 'Abuur Maaddo'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--color-text-secondary)] block">
              Magaca Maaddada (Subject Name) *
            </label>
            <input
              type="text"
              placeholder="Tusaale: Mathematics ama Xisaab"
              value={form.subjectName}
              onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
              className="w-full ds-input"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Koodhka Maaddada (Subject Code)
              </label>
              <input
                type="text"
                placeholder="MATH-101"
                value={form.subjectCode}
                onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
                className="w-full ds-input font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Fasalka (Class) *
              </label>
              <select
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                className="w-full ds-input"
                required
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--color-text-secondary)] block">
              Macallinka Maaddada (Subject Teacher)
            </label>
            <input
              type="text"
              placeholder="Magaca macallinka..."
              value={form.teacherName}
              onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
              className="w-full ds-input"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Ma hubtaa inaad tirtirto maaddadan?"
        message={`Waxaad tirtireysaa maaddada "${confirmDelete?.name}".`}
        confirmLabel="Haa, Tirtir"
        loading={loading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageContainer>
  );
}
