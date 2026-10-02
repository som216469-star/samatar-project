import React, { useState } from 'react';
import { Search, Download, Send, Receipt } from 'lucide-react';
import type { PaymentTransaction, Invoice } from '../../types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal
} from '../../components/ui/primitives';
import { formatMoney, exportToExcel, generateReceiptPDF, openWhatsApp } from './financeUtils';
import { apiFetch } from '../../lib/apiClient';

interface PaymentsModuleProps {
  payments: PaymentTransaction[];
  invoices: Invoice[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
  activeInvoiceForPayment?: Invoice | null;
  onClosePaymentModal: () => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/60 transition-all';
const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5';

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({
  payments,
  invoices,
  currency,
  schoolName,
  onRefresh,
  activeInvoiceForPayment,
  onClosePaymentModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');

  const [selectedInvoiceId] = useState(activeInvoiceForPayment?.id || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(
    activeInvoiceForPayment?.balance || 50
  );
  const [paymentMethod, setPaymentMethod] = useState('EVC Plus');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedBy] = useState('Accountant');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
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

  const activeInv = invoices.find(
    (inv) => inv.id === (selectedInvoiceId || activeInvoiceForPayment?.id)
  );

  const filteredPayments = payments.filter((p) => {
    if (methodFilter !== 'All' && p.paymentMethod !== methodFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRec = p.receiptNumber?.toLowerCase().includes(q);
      const matchName = p.studentName?.toLowerCase().includes(q);
      const matchInv = p.invoiceNumber?.toLowerCase().includes(q);
      const matchRef = p.reference?.toLowerCase().includes(q);
      if (!matchRec && !matchName && !matchInv && !matchRef) return false;
    }
    return true;
  });

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInv) {
      setConfirmState({
        isOpen: true,
        title: 'Dooro Biilka',
        message: 'Fadlan dooro biilka (Please select an invoice)',
        onConfirm: () => setConfirmState((prev) => ({ ...prev, isOpen: false }))
      });
      return;
    }
    if (paymentAmount <= 0) {
      setConfirmState({
        isOpen: true,
        title: 'Cadadka Lacagta',
        message: 'Cadadka lacagtu waa inuu ka bataa 0 (Amount must be > 0)',
        onConfirm: () => setConfirmState((prev) => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: activeInv.id,
          amount: paymentAmount,
          paymentMethod,
          paymentDate,
          reference,
          receivedBy,
          notes
        })
      });

      if (res.ok) {
        onClosePaymentModal();
        onRefresh();
      } else {
        const data = await res.json();
        setConfirmState({
          isOpen: true,
          title: 'Khalad',
          message: data.error || 'Khalad ayaa dhacay intii lacagta la qabanayay',
          onConfirm: () => setConfirmState((prev) => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsAppReceipt = (p: PaymentTransaction) => {
    const inv = invoices.find((i) => i.id === p.invoiceId);
    const phone = inv?.guardianPhone;
    if (!phone) {
      setConfirmState({
        isOpen: true,
        title: 'Telefoon Lama Helin',
        message: 'Telefoonka waalidka lama hayo (No phone number available)',
        onConfirm: () => setConfirmState((prev) => ({ ...prev, isOpen: false }))
      });
      return;
    }
    const message = `Mahadsanid! Waxaan xaqiijinaynaa in la qabtay lacag bixintaada ee ardayga: ${p.studentName}.\nRasiidka #: ${p.receiptNumber}\nCadadka: ${currency} ${p.amount}\nHabka: ${p.paymentMethod}\nTaariikh: ${p.paymentDate}\nBaaqiga Hada: ${currency} ${p.remainingBalance ?? 0}\nMahadsanidin.`;
    openWhatsApp(phone, message);
  };

  const handleExportExcel = () => {
    const exportData = filteredPayments.map((p) => ({
      'Receipt Number': p.receiptNumber,
      'Invoice Number': p.invoiceNumber,
      Student: p.studentName,
      Class: p.className,
      Amount: p.amount,
      'Payment Method': p.paymentMethod,
      Reference: p.reference,
      'Payment Date': p.paymentDate,
      'Received By': p.receivedBy,
      'Remaining Balance': p.remainingBalance
    }));
    exportToExcel(`Receipts_${schoolName.replace(/\s+/g, '_')}`, 'Receipts', exportData);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi rasiid, arday, ama tixraac..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            <option value="All">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="EVC Plus">EVC Plus</option>
            <option value="Zaad">Zaad</option>
            <option value="Sahal">Sahal</option>
            <option value="Bank">Bank</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportExcel}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Excel Receipts
        </Button>
      </Card>

      {/* Receipts Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[11px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <th className="px-5 py-3.5">Rasiid #</th>
                <th className="px-5 py-3.5">Biilka #</th>
                <th className="px-5 py-3.5">Ardayga (Student)</th>
                <th className="px-5 py-3.5">Qaabka (Method)</th>
                <th className="px-5 py-3.5 text-right">Cadadka (Amount)</th>
                <th className="px-5 py-3.5 text-right">Baaqi Kadib</th>
                <th className="px-5 py-3.5">Taariikh</th>
                <th className="px-5 py-3.5 text-right">Ficillo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      icon={Receipt}
                      title="Rasiidyo Ma Jiraan"
                      description="Wax rasiidyo ah oo diiwaangashan ma jiraan."
                    />
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => (
                  <tr
                    key={pay.id}
                    className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-emerald-500 font-bold">
                      {pay.receiptNumber}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-secondary)]">
                      {pay.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
                      <div>{pay.studentName}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-normal">
                        {pay.className}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="neutral">{pay.paymentMethod}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-500 text-right">
                      {formatMoney(pay.amount, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-amber-500 text-right">
                      {formatMoney(pay.remainingBalance ?? 0, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-muted)]">
                      {pay.paymentDate}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => generateReceiptPDF(schoolName, currency, pay)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 inline-block cursor-pointer transition-colors"
                        title="Dhoofi Rasiid PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendWhatsAppReceipt(pay)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 inline-block cursor-pointer transition-colors"
                        title="Ku dir WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={Boolean(activeInvoiceForPayment)}
        onClose={onClosePaymentModal}
        title="Qabo Lacag Bixin (Record Payment)"
        size="md"
      >
        {activeInvoiceForPayment && (
          <>
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3.5 rounded-xl mb-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Ardayga:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {activeInvoiceForPayment.studentName} ({activeInvoiceForPayment.className})
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Biilka #:</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {activeInvoiceForPayment.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Wadarta Biilka:</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {formatMoney(activeInvoiceForPayment.total, currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Baaqiga Hada (Balance):</span>
                <span className="font-mono font-bold text-amber-500">
                  {formatMoney(activeInvoiceForPayment.balance, currency)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Cadadka La Bixinayo ({currency}) *</label>
                  <input
                    type="number"
                    max={activeInvoiceForPayment.balance}
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className={`${inputClass} font-mono font-bold`}
                    required
                  />
                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(activeInvoiceForPayment.balance)}
                      className="text-[11px] font-semibold text-emerald-500 hover:underline"
                    >
                      Bixi Dhammaan ({formatMoney(activeInvoiceForPayment.balance, currency)})
                    </button>
                    {activeInvoiceForPayment.balance > 10 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentAmount(Math.round(activeInvoiceForPayment.balance / 2))
                        }
                        className="text-[11px] text-[var(--text-muted)] hover:underline"
                      >
                        Nus (50%)
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Qaabka Bixinta (Payment Method) *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={inputClass}
                  >
                    <option value="EVC Plus">EVC Plus</option>
                    <option value="Zaad">Zaad</option>
                    <option value="Sahal">Sahal</option>
                    <option value="Cash">Cash (Kaash)</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tixraaca Bixinta (Tx ID / Ref)</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN994812"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Taariikhda Bixinta *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Qoraal / Notes</label>
                <input
                  type="text"
                  placeholder="Fiiro gaar ah..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button variant="secondary" type="button" onClick={onClosePaymentModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={submitting}>
                  {submitting ? 'Qabanaya...' : 'Confirm & Issue Receipt'}
                </Button>
              </div>
            </form>
          </>
        )}
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
