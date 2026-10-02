import React, { useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Printer,
  Trash2,
  CheckCircle2,
  Users
} from 'lucide-react';
import type { PayrollRecord } from '../../types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal
} from '../../components/ui/primitives';
import { formatMoney, exportToExcel, generatePayslipPDF } from './financeUtils';
import { apiFetch } from '../../lib/apiClient';

interface PayrollModuleProps {
  payroll: PayrollRecord[];
  teachers: any[];
  staff: any[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/60 transition-all';
const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5';

export const PayrollModule: React.FC<PayrollModuleProps> = ({
  payroll,
  teachers,
  staff,
  currency,
  schoolName,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
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
    employeeType: 'Teacher',
    employeeId: '',
    employeeName: '',
    roleOrDepartment: 'Teaching Staff',
    basicSalary: 200,
    allowances: 0,
    deductions: 0,
    paymentMethod: 'Bank',
    paymentDate: new Date().toISOString().split('T')[0],
    payrollPeriod: 'September 2026',
    status: 'Draft',
    notes: ''
  });

  const allEmployees = [
    ...teachers.map((t) => ({
      id: t.id,
      name: t.fullName || t.name,
      type: 'Teacher',
      role: t.specialization || 'Macallin'
    })),
    ...staff.map((s) => ({
      id: s.id,
      name: s.fullName || s.name,
      type: 'Staff',
      role: s.role || 'Shaqaale'
    }))
  ];

  const handleSelectEmployee = (id: string) => {
    const emp = allEmployees.find((e) => e.id === id);
    if (emp) {
      setForm((prev) => ({
        ...prev,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeType: emp.type as any,
        roleOrDepartment: emp.role
      }));
    }
  };

  const grossSalary = Number(form.basicSalary || 0) + Number(form.allowances || 0);
  const netSalary = Math.max(0, grossSalary - Number(form.deductions || 0));

  const filteredPayroll = payroll.filter((p) => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.employeeName?.toLowerCase().includes(q);
      const matchPeriod = p.payrollPeriod?.toLowerCase().includes(q);
      if (!matchName && !matchPeriod) return false;
    }
    return true;
  });

  const totalNet = filteredPayroll.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeName) {
      setConfirmState({
        isOpen: true,
        title: 'Dooro Shaqaalaha',
        message: 'Fadlan dooro shaqaalaha ama macallinka',
        onConfirm: () => setConfirmState((prev) => ({ ...prev, isOpen: false }))
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          grossSalary,
          netSalary
        })
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

  const handleMarkAsPaid = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Bixi Mushahaarka?',
      message:
        'Ma hubtaa inaad bixiso mushahaarkan? Tani waxay si toos ah u qori doontaa kharashka mushahaarka (Record as paid salary).',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/payroll/${id}/pay`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentDate: new Date().toISOString().split('T')[0] })
          });
          if (res.ok) onRefresh();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Tirtir Diiwaanka Mushahaarka?',
      message: 'Ma hubtaa inaad tirtirto diiwaankan?',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/payroll/${id}`, { method: 'DELETE' });
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
    const data = filteredPayroll.map((p) => ({
      Employee: p.employeeName,
      Type: p.employeeType,
      Role: p.roleOrDepartment,
      Period: p.payrollPeriod,
      'Basic Salary': p.basicSalary,
      Allowances: p.allowances,
      Deductions: p.deductions,
      'Gross Salary': p.grossSalary,
      'Net Salary': p.netSalary,
      Status: p.status,
      'Payment Date': p.paymentDate
    }));
    exportToExcel(`Payroll_${schoolName.replace(/\s+/g, '_')}`, 'Payroll', data);
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
              placeholder="Raadi macallin, shaqaale, ama xilli..."
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
            onClick={() => setShowModal(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Diyaari Mushahaar (Add Payroll)
          </Button>
        </div>
      </Card>

      {/* Summary Band */}
      <Card className="px-5 py-3 flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">
          Shaqaalaha Liiska ku jira:{' '}
          <strong className="text-[var(--text-primary)] font-mono">
            {filteredPayroll.length}
          </strong>{' '}
          qof
        </span>
        <span className="text-[var(--text-secondary)]">
          Wadarta Mushahaarka Saufiga ah:{' '}
          <strong className="text-emerald-500 font-mono text-sm ml-1">
            {formatMoney(totalNet, currency)}
          </strong>
        </span>
      </Card>

      {/* Payroll Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[11px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <th className="px-5 py-3.5">Shaqaalaha</th>
                <th className="px-5 py-3.5">Doorka / Nooca</th>
                <th className="px-5 py-3.5">Xilliga (Period)</th>
                <th className="px-5 py-3.5 text-right">Aasaasiga (Basic)</th>
                <th className="px-5 py-3.5 text-right">Gunno (Allow.)</th>
                <th className="px-5 py-3.5 text-right">Jarid (Deduct.)</th>
                <th className="px-5 py-3.5 text-right">Saufiga (Net)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ficillo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8">
                    <EmptyState
                      icon={Users}
                      title="Diiwaan Mushahaar Ma Jiro"
                      description="Wax diiwaan mushahaar ah ma jiraan."
                    />
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
                      {p.employeeName}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      <span className="text-xs font-medium">{p.roleOrDepartment}</span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        {p.employeeType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-secondary)]">
                      {p.payrollPeriod}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-primary)] text-right">
                      {formatMoney(p.basicSalary, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-500 text-right">
                      +{formatMoney(p.allowances, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-rose-500 text-right">
                      -{formatMoney(p.deductions, currency)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-500 text-right text-sm">
                      {formatMoney(p.netSalary, currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          p.status === 'Paid'
                            ? 'success'
                            : p.status === 'Approved'
                              ? 'info'
                              : 'warning'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      {p.status !== 'Paid' && (
                        <button
                          onClick={() => handleMarkAsPaid(p.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 inline-block cursor-pointer transition-colors"
                          title="Bixi Mushahaarka (Mark as Paid)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => generatePayslipPDF(schoolName, currency, p)}
                        className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] inline-block cursor-pointer transition-colors"
                        title="Daabac Payslip PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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

      {/* CREATE PAYROLL MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Diyaari Mushahaar (Prepare Payroll)"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Dooro Macallinka ama Shaqaalaha *</label>
            <select
              value={form.employeeId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">-- Dooro Qofka --</option>
              {allEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.type}: {emp.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Xilliga Mushahaarka (Period) *</label>
              <input
                type="text"
                value={form.payrollPeriod}
                onChange={(e) => setForm({ ...form, payrollPeriod: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Qaabka Bixinta *</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className={inputClass}
              >
                <option value="Bank">Bank</option>
                <option value="Cash">Cash</option>
                <option value="EVC Plus">EVC Plus</option>
                <option value="Zaad">Zaad</option>
              </select>
            </div>
          </div>

          {/* Salary Breakdown Inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Aasaasiga (Basic) *</label>
              <input
                type="number"
                min={0}
                value={form.basicSalary}
                onChange={(e) =>
                  setForm({ ...form, basicSalary: Number(e.target.value) })
                }
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Gunno (Allowances)</label>
              <input
                type="number"
                min={0}
                value={form.allowances}
                onChange={(e) =>
                  setForm({ ...form, allowances: Number(e.target.value) })
                }
                className={`${inputClass} font-mono text-emerald-500`}
              />
            </div>
            <div>
              <label className={labelClass}>Jarid (Deductions)</label>
              <input
                type="number"
                min={0}
                value={form.deductions}
                onChange={(e) =>
                  setForm({ ...form, deductions: Number(e.target.value) })
                }
                className={`${inputClass} font-mono text-rose-500`}
              />
            </div>
          </div>

          {/* Net Salary Preview */}
          <div className="p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Mushaharka Saufiga ah (Net Salary):
            </span>
            <span className="font-mono font-bold text-lg text-emerald-500">
              {formatMoney(netSalary, currency)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Taariikhda Bixinta</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Xaaladda (Status)</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                <option value="Draft">Draft (Qabyo)</option>
                <option value="Approved">Approved (La Ansixiyay)</option>
                <option value="Paid">Paid (La Bixiyay)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {submitting ? 'Kaydinaya...' : 'Save Payroll'}
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
