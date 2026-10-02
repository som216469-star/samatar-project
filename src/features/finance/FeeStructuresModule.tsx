import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Layers, Download } from 'lucide-react';
import type { FeeStructure } from '../../types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal
} from '../../components/ui/primitives';
import { formatMoney, exportToExcel } from './financeUtils';
import { apiFetch } from '../../lib/apiClient';

interface FeeStructuresModuleProps {
  feeStructures: FeeStructure[];
  classes: any[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
}

const CATEGORIES = [
  'Monthly Tuition',
  'Term Fee',
  'Admission Fee',
  'Exam Fee',
  'Transport Fee',
  'Library Fee',
  'Uniform Fee',
  'Other Fee'
];

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/60 transition-all';
const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5';

export const FeeStructuresModule: React.FC<FeeStructuresModuleProps> = ({
  feeStructures,
  classes,
  currency,
  schoolName,
  onRefresh
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [form, setForm] = useState({
    name: 'Lacagta Bishan',
    category: 'Monthly Tuition',
    amount: 50,
    className: 'All Classes',
    academicYear: '2026-2027',
    term: 'All Terms',
    description: 'Fiiga caadiga ah ee bishii'
  });

  const openAddModal = () => {
    setEditingFee(null);
    setForm({
      name: 'Lacagta Bishan',
      category: 'Monthly Tuition',
      amount: 50,
      className: 'All Classes',
      academicYear: '2026-2027',
      term: 'All Terms',
      description: 'Fiiga caadiga ah ee bishii'
    });
    setShowModal(true);
  };

  const openEditModal = (fs: FeeStructure) => {
    setEditingFee(fs);
    setForm({
      name: fs.name,
      category: fs.category,
      amount: fs.amount,
      className: fs.className,
      academicYear: fs.academicYear,
      term: fs.term || 'All Terms',
      description: fs.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingFee) {
        await apiFetch(`/api/fee-structures/${editingFee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      } else {
        await apiFetch('/api/fee-structures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      }
      setShowModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Tirtir Qaab-dhismeedka Fiiga?',
      message: 'Ma hubtaa inaad tirtirto qaab-dhismeedkan fiiga?',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/fee-structures/${id}`, { method: 'DELETE' });
          if (res.ok) onRefresh();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleExportExcel = () => {
    const data = feeStructures.map((f) => ({
      Name: f.name,
      Category: f.category,
      Amount: f.amount,
      Class: f.className,
      'Academic Year': f.academicYear,
      Term: f.term,
      Description: f.description
    }));
    exportToExcel(
      `Fee_Structures_${schoolName.replace(/\s+/g, '_')}`,
      'FeeStructures',
      data
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
            Qaab-dhismeedka Fiiga (Fee Structures)
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Habee khidmadaha kala duwan ee fasallada, xilliyada, iyo sannad-dugsiyeedka
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Kudar Fi Cusub (Add Structure)
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeStructures.length === 0 ? (
          <Card className="col-span-full p-8">
            <EmptyState
              icon={Layers}
              title="Qaab-dhismeed Fi Ma Jiro"
              description="Wali lama abuurin qaab-dhismeedka fiiga fasallada."
            />
          </Card>
        ) : (
          feeStructures.map((fs) => (
            <Card key={fs.id} className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[var(--text-primary)] block mb-1">
                    {fs.name}
                  </span>
                  <Badge variant="success">{fs.category}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(fs)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(fs.id)}
                    className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-2xl font-bold font-mono text-emerald-500">
                {formatMoney(fs.amount, currency)}
              </div>

              <div className="text-xs text-[var(--text-secondary)] space-y-1.5 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex justify-between">
                  <span>Fasalka:</span>
                  <span className="text-[var(--text-primary)] font-semibold">
                    {fs.className}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sanad-dugsiyeedka:</span>
                  <span className="text-[var(--text-primary)]">{fs.academicYear}</span>
                </div>
                <div className="flex justify-between">
                  <span>Xilliga (Term):</span>
                  <span className="text-[var(--text-primary)]">{fs.term}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingFee ? 'Wax ka beddel Fiiga' : 'Kudar Qaab-dhismeed Fi Cusub'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Magaca Fiiga (Fee Name) *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nooca (Category) *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cadadka ({currency}) *</label>
              <input
                type="number"
                min={1}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className={`${inputClass} font-mono font-bold`}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fasalka *</label>
              <select
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                className={inputClass}
              >
                <option value="All Classes">Dhammaan Fasallada (All)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Xilliga (Term)</label>
              <select
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                className={inputClass}
              >
                <option value="All Terms">All Terms</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Sanad-Dugsiyeedka *</label>
            <input
              type="text"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {submitting ? 'Kaydinaya...' : 'Save Structure'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
