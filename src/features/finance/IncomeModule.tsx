import React, { useState } from 'react';
import { Plus, Search, Download, Trash2, TrendingUp } from 'lucide-react';
import type { IncomeRecord } from '../../types';
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

interface IncomeModuleProps {
  incomeList: IncomeRecord[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
  showCreateModalDefault?: boolean;
}

const INCOME_CATEGORIES = [
  'Student Fees',
  'Admission Fees',
  'Exam Fees',
  'Transport Fees',
  'Library Fees',
  'Donations',
  'Grants',
  'Other Income'
];

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/60 transition-all';
const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5';

export const IncomeModule: React.FC<IncomeModuleProps> = ({
  incomeList,
  currency,
  schoolName,
  onRefresh,
  showCreateModalDefault = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showModal, setShowModal] = useState(showCreateModalDefault);
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
    category: 'Donations',
    description: '',
    amount: 100,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank',
    reference: '',
    payer: '',
    notes: ''
  });

  const filteredIncome = incomeList.filter((inc) => {
    if (categoryFilter !== 'All' && inc.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = inc.description?.toLowerCase().includes(q);
      const matchPayer = inc.payer?.toLowerCase().includes(q);
      const matchRef = inc.reference?.toLowerCase().includes(q);
      if (!matchDesc && !matchPayer && !matchRef) return false;
    }
    return true;
  });

  const totalIncome = filteredIncome.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Tirtir Dakhliga?',
      message: 'Ma hubtaa inaad tirtirto dakhligan? (Delete income)',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/income/${id}`, { method: 'DELETE' });
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
    const exportData = filteredIncome.map((inc) => ({
      'Income ID': inc.incomeId,
      Category: inc.category,
      Description: inc.description,
      Amount: inc.amount,
      Date: inc.date,
      'Payment Method': inc.paymentMethod,
      Payer: inc.payer,
      Reference: inc.reference,
      Notes: inc.notes
    }));
    exportToExcel(`Income_${schoolName.replace(/\s+/g, '_')}`, 'Income', exportData);
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
              placeholder="Raadi dakhli, qofka bixiyey, ama tixraac..."
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
            {INCOME_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
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
            onClick={() => setShowModal(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Qor Dakhli (Add Income)
          </Button>
        </div>
      </Card>

      {/* Summary Banner */}
      <Card className="px-5 py-3 flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">
          Diiwaanka Dakhliga:{' '}
          <strong className="text-[var(--text-primary)] font-mono">
            {filteredIncome.length}
          </strong>{' '}
          xabbo
        </span>
        <span className="text-[var(--text-secondary)]">
          Wadarta Dakhliga:{' '}
          <strong className="text-emerald-500 font-mono text-sm ml-1">
            {formatMoney(totalIncome, currency)}
          </strong>
        </span>
      </Card>

      {/* Income Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[11px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <th className="px-5 py-3.5">ID #</th>
                <th className="px-5 py-3.5">Qaybta (Category)</th>
                <th className="px-5 py-3.5">Qeexidda (Description)</th>
                <th className="px-5 py-3.5">Bixiyaha (Payer)</th>
                <th className="px-5 py-3.5 text-right">Cadadka</th>
                <th className="px-5 py-3.5">Taariikh</th>
                <th className="px-5 py-3.5">Qaabka</th>
                <th className="px-5 py-3.5 text-right">Ficillo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {filteredIncome.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      icon={TrendingUp}
                      title="Dakhli Ma Jiro"
                      description="Wax dakhli ah oo diiwaangashan ma jiraan."
                    />
                  </td>
                </tr>
              ) : (
                filteredIncome.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-[var(--text-secondary)]">
                      {inc.incomeId}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="info">{inc.category}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[var(--text-primary)]">
                      {inc.description}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {inc.payer || 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-500 text-right">
                      {formatMoney(inc.amount, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-muted)]">
                      {inc.date}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {inc.paymentMethod}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(inc.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 inline-block cursor-pointer transition-colors"
                        title="Tirtir Dakhliga"
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

      {/* ADD INCOME MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Diiwaangeli Dakhli Cusub (Record Income)"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Qaybta Dakhliga *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {INCOME_CATEGORIES.map((cat) => (
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
            <label className={labelClass}>Qeexidda Dakhliga *</label>
            <input
              type="text"
              placeholder="e.g. Deeq laga helay Hay'adda Al-Khayr"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Qofka / Hay'adda Bixisay (Payer)</label>
              <input
                type="text"
                placeholder="e.g. Shariif Axmed"
                value={form.payer}
                onChange={(e) => setForm({ ...form, payer: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Qaabka Bixinta</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className={inputClass}
              >
                <option value="Bank">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="EVC Plus">EVC Plus</option>
                <option value="Zaad">Zaad</option>
                <option value="Sahal">Sahal</option>
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
              <label className={labelClass}>Tixraac / Tx ID</label>
              <input
                type="text"
                placeholder="e.g. BNK-2026-081"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {submitting ? 'Kaydinaya...' : 'Save Income'}
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
