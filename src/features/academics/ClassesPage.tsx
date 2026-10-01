import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, Users, Search, GraduationCap } from 'lucide-react';
import { SchoolClass, Student } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Button,
  Card,
  StatCard,
  Modal,
  ConfirmDialog,
  EmptyState
} from '../../components/ui/primitives';

export interface ClassesViewProps {
  classes: SchoolClass[];
  students: Student[];
  onAddClass: (classData: Omit<SchoolClass, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateClass: (id: string, classData: Partial<SchoolClass>) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
  theme: 'light' | 'dark';
}

export default function ClassesPage({
  classes,
  students,
  onAddClass,
  onUpdateClass,
  onDeleteClass
}: ClassesViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [form, setForm] = useState({
    className: '',
    teacherName: '',
    roomNumber: '',
    description: ''
  });

  const openAddModal = () => {
    setEditingClass(null);
    setForm({
      className: '',
      teacherName: '',
      roomNumber: '',
      description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (cls: SchoolClass) => {
    setEditingClass(cls);
    setForm({
      className: cls.className,
      teacherName: cls.teacherName || '',
      roomNumber: cls.roomNumber || '',
      description: cls.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.className.trim()) return;

    setLoading(true);
    try {
      if (editingClass) {
        await onUpdateClass(editingClass.id, form);
      } else {
        await onAddClass(form);
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
      await onDeleteClass(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.teacherName && c.teacherName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.roomNumber && c.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const avgClassSize = classes.length ? Math.round(students.length / classes.length) : 0;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Academic' }, { label: 'Classes' }]}
        title="Fasallada Dugsiga (Classes)"
        description="Maamul fasallada dugsiga, qolalka waxbarashada, iyo macallimiinta mas'uulka ka ah"
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
          >
            Fasal Cusub (Add Class)
          </Button>
        }
      />

      {/* Metrics & Search Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="lg:col-span-2 flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi fasal, macallin, ama qol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ds-input pl-9 pr-4 py-2"
            />
          </div>
        </Card>

        <StatCard
          label="Fasallo Guud"
          value={classes.length}
          sublabel="Fasallada diiwaangashan"
          variant="brand"
          icon={<GraduationCap className="w-4 h-4" />}
        />

        <StatCard
          label="Celceliska Ardayda"
          value={avgClassSize}
          sublabel="Arday / Fasal"
          variant="success"
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* Grid of Classes */}
      {filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const classStudents = students.filter(
              (s) => s.class.toLowerCase() === cls.className.toLowerCase()
            );
            return (
              <Card
                key={cls.id}
                className="flex flex-col justify-between hover:border-[var(--color-brand-border)] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                        {cls.className}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
                        ID: {cls.id}
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[var(--color-brand)] font-semibold">
                      {classStudents.length} Arday
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-muted)]">Macallinka:</span>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {cls.teacherName || 'Lama meeleyn'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-muted)]">Qolka (Room):</span>
                      <span className="font-mono text-[var(--color-text-secondary)]">
                        {cls.roomNumber || 'N/A'}
                      </span>
                    </div>
                    {cls.description && (
                      <p className="text-[11px] text-[var(--color-text-secondary)] pt-2 border-t border-[var(--color-border-subtle)] line-clamp-2">
                        {cls.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-[var(--color-text-muted)]">
                    {cls.createdAt}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(cls)}
                      className="p-1.5 rounded-md bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      title="Tafatir"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ id: cls.id, name: cls.className })}
                      className="p-1.5 rounded-md bg-[var(--color-surface-muted)] hover:bg-[var(--color-danger-soft)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors"
                      title="Tirtir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Fasallo ma jiraan"
            description="Guji 'Fasal Cusub' si aad u bilowdo maamulka fasallada dugsiga."
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={openAddModal}
              >
                Fasal Cusub
              </Button>
            }
          />
        </Card>
      )}

      {/* Add / Edit Class Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingClass ? 'Tafatir Fasalka' : 'Abuur Fasal Cusub'}
        description="Geli magaca fasalka, macallinka mas'uulka ka ah, iyo lambarka qolka."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Ka noqo
            </Button>
            <Button
              variant="primary"
              loading={loading}
              onClick={handleSubmit as any}
            >
              {editingClass ? 'Cusbooneysii' : 'Abuur Fasal'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--color-text-secondary)] block">
              Magaca Fasalka (Class Name) *
            </label>
            <input
              type="text"
              placeholder="Tusaale: Form 1A ama Grade 8"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
              className="w-full ds-input"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Macallinka Fasalka (Class Teacher)
              </label>
              <input
                type="text"
                placeholder="Magaca macallinka..."
                value={form.teacherName}
                onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Qolka (Room Number)
              </label>
              <input
                type="text"
                placeholder="Room 101"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                className="w-full ds-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--color-text-secondary)] block">
              Faahfaahin Dheeraad ah (Description)
            </label>
            <textarea
              rows={3}
              placeholder="Qoraal kooban oo ku saabsan fasalkan..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full ds-input"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Ma hubtaa inaad tirtirto fasalkan?"
        message={`Waxaad tirtireysaa fasalka "${confirmDelete?.name}". Ficilkan dib looma soo celin karo.`}
        confirmLabel="Haa, Tirtir"
        loading={loading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageContainer>
  );
}
