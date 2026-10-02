import React, { useState } from 'react';
import {
  Plus,
  Download,
  Trash2,
  Edit2,
  PieChart,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import type { BudgetRecord } from '../../types';
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

interface BudgetsModuleProps {
  budgets: BudgetRecord[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
}

const BUDGET_CATEGORIES = [
  'Salaries',
  'Rent',
  'Electricity',
  'Water',
  'Internet',
  'Office Supplies',
  'Books',
  'Transportation',
  'Maintenance',
  'Equipment',
  'Cleaning',
  'Security',
  'Student Fees',
  'Donations',
  'Other'
];

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/60 transition-all';
const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5';

export const BudgetsModule: React.FC<BudgetsModuleProps> = ({
  budgets,
  currency,
  schoolName,
  onRefresh
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
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
    academicYear: '2026-2027',
    period: 'Annual',
    category: 'Salaries',
    type: 'Expense',
    plannedAmount: 1000,
    notes: ''
  });

  const openAddModal = () => {
    setEditingBudget(null);
    setForm({
      academicYear: '2026-2027',
      period: 'Annual',
      category: 'Salaries',
      type: 'Expense',
      plannedAmount: 1000,
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (b: BudgetRecord) => {
    setEditingBudget(b);
    setForm({
      academicYear: b.academicYear,
      period: b.period,
      category: b.category,
      type: b.type,
      plannedAmount: b.plannedAmount,
      notes: b.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBudget) {
        await apiFetch(`/api/budgets/${editingBudget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      } else {
        await apiFetch('/api/budgets', {
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
      title: 'Tirtir Miisaaniyadda?',
      message: 'Ma hubtaa inaad tirtirto miisaaniyaddan?',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/budgets/${id}`, { method: 'DELETE' });
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
    const data = budgets.map((b) => ({
      Category: b.category,
      Type: b.type,
      'Academic Year': b.academicYear,
      Period: b.period,
      'Planned Amount': b.plannedAmount,
      'Actual Amount': b.actualAmount,
      'Remaining Amount': b.remainingAmount,
      'Variance %': b.variance ? `${b.variance}%` : '0%'
    }));
    exportToExcel(`Budgets_${schoolName.replace(/\s+/g, '_')}`, 'Budgets', data);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
            Maareynta Miisaaniyadda (Budget Management)
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Deji miisaaniyad sanadle ah ama bille ah, la soco inta ka baxday
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
            Deji Miisaaniyad (Add Budget)
          </Button>
        </div>
      </Card>

      {/* Budgets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.length === 0 ? (
          <Card className="col-span-full p-8">
            <EmptyState
              icon={PieChart}
              title="Miisaaniyad Lama Dejin"
              description='Wali wax miisaaniyado ah lama dejin. Guji "Deji Miisaaniyad" si aad u bilowdo.'
            />
          </Card>
        ) : (
          budgets.map((b) => {
            const spentPct =
              b.plannedAmount > 0
                ? Math.min(100, Math.round(((b.actualAmount || 0) / b.plannedAmount) * 100))
                : 0;
            const isOver = (b.actualAmount || 0) > b.plannedAmount;

            return (
              <Card key={b.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-[var(--text-primary)] block">
                      {b.category}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {b.academicYear} • {b.period}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">La Isticmaalay:</span>
                    <span
                      className={`font-mono font-bold ${
                        isOver ? 'text-rose-500' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {formatMoney(b.actualAmount || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Qorshaha (Planned):</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {formatMoney(b.plannedAmount, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Harsan (Remaining):</span>
                    <span className="font-mono font-bold text-emerald-500">
                      {formatMoney(
                        b.remainingAmount ?? b.plannedAmount - (b.actualAmount || 0),
                        currency
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      style={{ width: `${spentPct}%` }}
                      className={`h-full rounded-full ${
                        isOver
                          ? 'bg-rose-500'
                          : spentPct > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)]">
                    <span>Isticmaal: {spentPct}%</span>
                    {isOver ? (
                      <Badge variant="danger">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Dhaafsiisan
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Xakamaysan
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBudget ? 'Wax ka beddel Miisaaniyadda' : 'Deji Miisaaniyad Cusub'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Qaybta (Category) *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nooca (Type) *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className={inputClass}
              >
                <option value="Expense">Expense (Kharash)</option>
                <option value="Income">Income (Dakhli)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cadadka Qorshaysan ({currency}) *</label>
              <input
                type="number"
                min={1}
                value={form.plannedAmount}
                onChange={(e) =>
                  setForm({ ...form, plannedAmount: Number(e.target.value) })
                }
                className={`${inputClass} font-mono font-bold`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Muddada (Period) *</label>
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value as any })}
                className={inputClass}
              >
                <option value="Annual">Annual (Sanadle)</option>
                <option value="Monthly">Monthly (Bille)</option>
                <option value="Term">Term (Xilliyeed)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Sanad-Dugsiyeedka (Academic Year) *</label>
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
              {submitting ? 'Kaydinaya...' : 'Save Budget'}
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
