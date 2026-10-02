import React, { useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  CreditCard
} from 'lucide-react';
import type { ExpenseRecord } from '../../types';
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

interface ExpensesModuleProps {
  expenses: ExpenseRecord[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
  showCreateModalDefault?: boolean;
}

const EXPENSE_CATEGORIES = [
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
  'Marketing',
  'Events',
  'Other'
];

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/60 transition-all';
const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5';

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  expenses,
  currency,
  schoolName,
  onRefresh,
  showCreateModalDefault = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showModal, setShowModal] = useState(showCreateModalDefault);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
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
    category: 'Office Supplies',
    description: '',
    amount: 50,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    vendorPayee: '',
    referenceNumber: '',
    notes: '',
    status: 'Paid'
  });

  const filteredExpenses = expenses.filter((exp) => {
    if (categoryFilter !== 'All' && exp.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && exp.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = exp.description?.toLowerCase().includes(q);
      const matchVendor = exp.vendorPayee?.toLowerCase().includes(q);
      const matchId = exp.expenseId?.toLowerCase().includes(q);
      if (!matchDesc && !matchVendor && !matchId) return false;
    }
    return true;
  });

  const totalFilteredAmount = filteredExpenses.reduce(
    (sum, exp) => sum + (exp.amount || 0),
    0
  );

  const openAddModal = () => {
    setEditingExpense(null);
    setForm({
      category: 'Office Supplies',
      description: '',
      amount: 50,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      vendorPayee: '',
      referenceNumber: '',
      notes: '',
      status: 'Paid'
    });
    setShowModal(true);
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setForm({
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      date: exp.date,
      paymentMethod: exp.paymentMethod,
      vendorPayee: exp.vendorPayee || '',
      referenceNumber: exp.referenceNumber || '',
      notes: exp.notes || '',
      status: exp.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingExpense) {
        await apiFetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      } else {
        await apiFetch('/api/expenses', {
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

  const handleApprove = async (id: string) => {
    try {
      const res = await apiFetch(`/api/expenses/${id}/approve`, { method: 'PUT' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Tirtir Kharashka?',
      message: 'Ma hubtaa inaad tirtirto kharashkan? (Delete expense)',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
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
    const exportData = filteredExpenses.map((exp) => ({
      'Expense ID': exp.expenseId,
      Category: exp.category,
      Description: exp.description,
      Amount: exp.amount,
      Date: exp.date,
      'Payment Method': exp.paymentMethod,
      Vendor: exp.vendorPayee,
      Reference: exp.referenceNumber,
      Status: exp.status,
      Notes: exp.notes
    }));
    exportToExcel(`Expenses_${schoolName.replace(/\s+/g, '_')}`, 'Expenses', exportData);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi kharash, bixiye, ama faahfaahin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            <option value="All">Dhammaan Qeybaha</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Approved">Approved</option>
            <option value="Draft">Draft</option>
          </select>
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
            Qor Kharash (New Expense)
          </Button>
        </div>
      </Card>

      {/* Summary Band */}
      <Card className="px-5 py-3 flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">
          Wadarta Kharashaadka Muuqda:{' '}
          <strong className="text-[var(--text-primary)] font-mono">
            {filteredExpenses.length}
          </strong>{' '}
          xabbo
        </span>
        <span className="text-[var(--text-secondary)]">
          Wadarta Guud:{' '}
          <strong className="text-rose-500 font-mono text-sm ml-1">
            {formatMoney(totalFilteredAmount, currency)}
          </strong>
        </span>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[11px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <th className="px-5 py-3.5">ID #</th>
                <th className="px-5 py-3.5">Qaybta (Category)</th>
                <th className="px-5 py-3.5">Faahfaahinta (Description)</th>
                <th className="px-5 py-3.5">Bixiyaha / Vendor</th>
                <th className="px-5 py-3.5 text-right">Cadadka</th>
                <th className="px-5 py-3.5">Taariikh</th>
                <th className="px-5 py-3.5">Qaabka</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ficillo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8">
                    <EmptyState
                      icon={CreditCard}
                      title="Kharashyo Ma Jiraan"
                      description="Wax kharashyo ah oo la helay ma jiraan."
                    />
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-[var(--text-secondary)] font-semibold">
                      {exp.expenseId}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="danger">{exp.category}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[var(--text-primary)] max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {exp.vendorPayee || 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-rose-500 text-right">
                      {formatMoney(exp.amount, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-muted)]">
                      {exp.date}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {exp.paymentMethod}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          exp.status === 'Paid'
                            ? 'success'
                            : exp.status === 'Approved'
                              ? 'info'
                              : 'warning'
                        }
                      >
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      {exp.status === 'Draft' && (
                        <button
                          onClick={() => handleApprove(exp.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 inline-block cursor-pointer transition-colors"
                          title="Ansixi (Approve)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(exp)}
                        className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] inline-block cursor-pointer transition-colors"
                        title="Wax ka beddel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 inline-block cursor-pointer transition-colors"
                        title="Tirtir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          editingExpense ? 'Wax ka beddel Kharashka' : 'Qor Kharash Cusub (Record Expense)'
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Qaybta Kharashka (Category) *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
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

          <div>
            <label className={labelClass}>Faahfaahinta Kharashka (Description) *</label>
            <input
              type="text"
              placeholder="e.g. Dayactirka kuraasta fasalka 2aad"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Shirkadda / Bixiyaha (Vendor/Payee)</label>
              <input
                type="text"
                placeholder="e.g. Hormuud / Najaax Store"
                value={form.vendorPayee}
                onChange={(e) => setForm({ ...form, vendorPayee: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Qaabka Bixinta (Payment Method)</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className={inputClass}
              >
                <option value="Cash">Cash</option>
                <option value="EVC Plus">EVC Plus</option>
                <option value="Zaad">Zaad</option>
                <option value="Sahal">Sahal</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Taariikhda *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className={inputClass}
              >
                <option value="Paid">Paid (La Bixiyay)</option>
                <option value="Approved">Approved (La Ansixiyay)</option>
                <option value="Draft">Draft (Qabyo)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Tixraac / Lambarka Rasiidka</label>
            <input
              type="text"
              placeholder="e.g. REC-9921 ama EVC-482"
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {submitting ? 'Kaydinaya...' : 'Save Expense'}
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
