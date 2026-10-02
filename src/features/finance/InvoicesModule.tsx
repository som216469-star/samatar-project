import React, { useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Send,
  Trash2,
  CreditCard,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import type { Invoice, FeeStructure } from '../../types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal
} from '../../components/ui/primitives';
import { formatMoney, exportToExcel, generateInvoicePDF, openWhatsApp } from './financeUtils';
import { apiFetch } from '../../lib/apiClient';

interface InvoicesModuleProps {
  invoices: Invoice[];
  students: any[];
  classes: any[];
  feeStructures: FeeStructure[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
  onRecordPayment: (invoice: Invoice) => void;
  showCreateModalDefault?: boolean;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/60 transition-all';
const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5';

export const InvoicesModule: React.FC<InvoicesModuleProps> = ({
  invoices,
  students,
  classes,
  currency,
  schoolName,
  onRefresh,
  onRecordPayment,
  showCreateModalDefault = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');

  const [showCreateModal, setShowCreateModal] = useState(showCreateModalDefault);
  const [showBulkModal, setShowBulkModal] = useState(false);
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

  const [singleForm, setSingleForm] = useState({
    studentId: '',
    title: 'Waxbarasho / Tuition',
    category: 'Monthly Tuition',
    amount: 50,
    discount: 0,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: ''
  });

  const [bulkForm, setBulkForm] = useState({
    targetClass: 'All',
    selectedFeeStructureIds: [] as string[],
    month: 'September',
    year: new Date().getFullYear(),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    customAmount: 50
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'All' && inv.status.toLowerCase() !== statusFilter.toLowerCase())
      return false;
    if (classFilter !== 'All' && inv.className !== classFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchName = inv.studentName?.toLowerCase().includes(q);
      const matchPhone = inv.guardianPhone?.includes(q);
      if (!matchNum && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.studentId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleForm)
      });
      if (res.ok) {
        setShowCreateModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/invoices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetClass: bulkForm.targetClass,
          feeStructureIds: bulkForm.selectedFeeStructureIds,
          month: bulkForm.month,
          year: bulkForm.year,
          dueDate: bulkForm.dueDate,
          customAmount: bulkForm.customAmount
        })
      });
      if (res.ok) {
        setShowBulkModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Tirtir Biilka?',
      message: 'Ma hubtaa inaad tirtirto biilkan? (Confirm invoice deletion)',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' });
          if (res.ok) onRefresh();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSendWhatsApp = (inv: Invoice) => {
    const student = students.find((s) => s.id === inv.studentId);
    const phone = inv.guardianPhone || student?.guardianPhone;
    if (!phone) {
      setConfirmState({
        isOpen: true,
        title: 'Telefoon Lama Helin',
        message: 'Waalidka telefoonkiisa lama hayo (No guardian phone number on record).',
        onConfirm: () => setConfirmState((prev) => ({ ...prev, isOpen: false }))
      });
      return;
    }
    const message = `Salaamu Calaykum. Waxaan ku ogeysiinaynaa in biilka waxbarashada ee ardayga: ${inv.studentName} uu diyaar yahay.\nBiilka #: ${inv.invoiceNumber}\nCadadka Guud: ${currency} ${inv.total}\nBaaqiga Hada: ${currency} ${inv.balance}\nXilliga Bixinta: ${inv.dueDate}\nMahadsanidin.`;
    openWhatsApp(phone, message);
  };

  const handleExportExcel = () => {
    const exportData = filteredInvoices.map((inv) => ({
      'Invoice Number': inv.invoiceNumber,
      Student: inv.studentName,
      Class: inv.className,
      'Guardian Phone': inv.guardianPhone,
      'Total Amount': inv.total,
      'Paid Amount': inv.paidAmount,
      Balance: inv.balance,
      Status: inv.status,
      'Issue Date': inv.issueDate,
      'Due Date': inv.dueDate
    }));
    exportToExcel(`Invoices_${schoolName.replace(/\s+/g, '_')}`, 'Invoices', exportData);
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
              placeholder="Raadi biil, arday, ama tel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            <option value="All">All Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            <option value="All">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.className}>
                {c.className}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBulkModal(true)}
            icon={<Layers className="w-3.5 h-3.5 text-emerald-500" />}
          >
            Bulk Generate
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSingleForm({
                studentId: students[0]?.id || '',
                title: 'Waxbarasho / Tuition',
                category: 'Monthly Tuition',
                amount: 50,
                discount: 0,
                dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                notes: ''
              });
              setShowCreateModal(true);
            }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Invoice
          </Button>
        </div>
      </Card>

      {/* Invoices Table Card */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[11px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <th className="px-5 py-3.5">Biilka #</th>
                <th className="px-5 py-3.5">Ardayga (Student)</th>
                <th className="px-5 py-3.5">Fasalka</th>
                <th className="px-5 py-3.5 text-right">Cadadka</th>
                <th className="px-5 py-3.5 text-right">Bixiyay</th>
                <th className="px-5 py-3.5 text-right">Baaqi</th>
                <th className="px-5 py-3.5">Xilliga (Due)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ficillo (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8">
                    <EmptyState
                      icon={FileSpreadsheet}
                      title="Biilal Ma Jiraan"
                      description="Wax biilal ah oo diiwaangashan ma jiraan."
                    />
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-[var(--text-secondary)] font-semibold">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
                      <div>{inv.studentName}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-normal">
                        {inv.guardianPhone || 'No Phone'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">{inv.className}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-[var(--text-primary)] text-right">
                      {formatMoney(inv.total, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-500 text-right">
                      {formatMoney(inv.paidAmount, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-amber-500 text-right">
                      {formatMoney(inv.balance, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-muted)]">
                      {inv.dueDate}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          inv.status === 'Paid'
                            ? 'success'
                            : inv.status === 'Partially Paid'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      {inv.balance > 0 && (
                        <button
                          onClick={() => onRecordPayment(inv)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 inline-block cursor-pointer transition-colors"
                          title="Qabo Lacag (Record Payment)"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => generateInvoicePDF(schoolName, currency, inv)}
                        className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] inline-block cursor-pointer transition-colors"
                        title="Dhoofi PDF Invoice"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendWhatsApp(inv)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 inline-block cursor-pointer transition-colors"
                        title="Ku dir WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 inline-block cursor-pointer transition-colors"
                        title="Tirtir Biilka"
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

      {/* SINGLE INVOICE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Abuur Biil Cusub (Create Single Invoice)"
        size="md"
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Dooro Ardayga (Select Student) *</label>
            <select
              value={singleForm.studentId}
              onChange={(e) => setSingleForm({ ...singleForm, studentId: e.target.value })}
              className={inputClass}
              required
            >
              <option value="">-- Dooro Arday --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.class})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nooca Khidmadda (Category) *</label>
              <select
                value={singleForm.category}
                onChange={(e) => setSingleForm({ ...singleForm, category: e.target.value })}
                className={inputClass}
              >
                <option value="Monthly Tuition">Monthly Tuition</option>
                <option value="Term Fee">Term Fee</option>
                <option value="Admission Fee">Admission Fee</option>
                <option value="Exam Fee">Exam Fee</option>
                <option value="Transport Fee">Transport Fee</option>
                <option value="Library Fee">Library Fee</option>
                <option value="Other Fee">Other Fee</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Qeexid / Title *</label>
              <input
                type="text"
                value={singleForm.title}
                onChange={(e) => setSingleForm({ ...singleForm, title: e.target.value })}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Cadadka ({currency}) *</label>
              <input
                type="number"
                value={singleForm.amount}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, amount: Number(e.target.value) })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Sicir-dhimis ({currency})</label>
              <input
                type="number"
                value={singleForm.discount}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, discount: Number(e.target.value) })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Xilliga Bixinta (Due Date) *</label>
              <input
                type="date"
                value={singleForm.dueDate}
                onChange={(e) => setSingleForm({ ...singleForm, dueDate: e.target.value })}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {submitting ? 'Abuuraya...' : 'Save Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* BULK INVOICE MODAL */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Abuur Biilal Wadajir ah (Bulk Invoice Generation)"
        subtitle="Si toos ah ugu samee biil dhammaan ardayda fasal ama dugsiga oo dhan"
        size="md"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fasalka La Beegsanayo (Target Class) *</label>
              <select
                value={bulkForm.targetClass}
                onChange={(e) => setBulkForm({ ...bulkForm, targetClass: e.target.value })}
                className={inputClass}
              >
                <option value="All">Dhammaan Fasallada (All Classes)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cadadka Khidmadda ({currency}) *</label>
              <input
                type="number"
                value={bulkForm.customAmount}
                onChange={(e) =>
                  setBulkForm({ ...bulkForm, customAmount: Number(e.target.value) })
                }
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Bisha (Month) *</label>
              <select
                value={bulkForm.month}
                onChange={(e) => setBulkForm({ ...bulkForm, month: e.target.value })}
                className={inputClass}
              >
                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December'
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sanadka (Year) *</label>
              <input
                type="number"
                value={bulkForm.year}
                onChange={(e) => setBulkForm({ ...bulkForm, year: Number(e.target.value) })}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Xilliga Bixinta Ugu Dambaysa (Due Date) *</label>
            <input
              type="date"
              value={bulkForm.dueDate}
              onChange={(e) => setBulkForm({ ...bulkForm, dueDate: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" type="button" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {submitting ? 'Abuuraya...' : 'Generate Bulk Invoices'}
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
