import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  FileText,
  Trash2,
  ArrowRight,
  Plus,
  X
} from 'lucide-react';
import { Admission, SchoolClass } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Card,
  StatCard,
  Button,
  Badge,
  EmptyState,
  ConfirmDialog
} from '../../components/ui/primitives';

interface AdmissionsViewProps {
  admissions: Admission[];
  classes: SchoolClass[];
  onAddAdmission: (app: Omit<Admission, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateAdmission: (id: string, app: Partial<Admission>) => Promise<void>;
  onDeleteAdmission: (id: string) => Promise<void>;
  onEnrollApplicant: (id: string) => Promise<void>;
  theme?: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function AdmissionsPage({
  admissions,
  classes,
  onAddAdmission,
  onUpdateAdmission,
  onDeleteAdmission,
  onEnrollApplicant
}: AdmissionsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState<Admission | null>(null);
  const [pendingEnrollApp, setPendingEnrollApp] = useState<Admission | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    applicantName: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: 'Father',
    desiredClass: classes[0]?.className || 'Class 1',
    gender: 'Male' as 'Male' | 'Female',
    dateOfBirth: '',
    status: 'Pending' as Admission['status'],
    notes: ''
  });

  const filtered = admissions.filter((a) => {
    const matchesSearch =
      a.applicantName.toLowerCase().includes(search.toLowerCase()) ||
      a.guardianName.toLowerCase().includes(search.toLowerCase()) ||
      a.guardianPhone.includes(search);
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: admissions.length,
    pending: admissions.filter((a) => a.status === 'Pending').length,
    approved: admissions.filter((a) => a.status === 'Approved').length,
    enrolled: admissions.filter((a) => a.status === 'Enrolled').length
  };

  const handleOpenAdd = () => {
    setEditingApp(null);
    setFormData({
      applicantName: '',
      guardianName: '',
      guardianPhone: '',
      guardianRelationship: 'Father',
      desiredClass: classes[0]?.className || 'Class 1',
      gender: 'Male',
      dateOfBirth: '',
      status: 'Pending',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (app: Admission) => {
    setEditingApp(app);
    setFormData({
      applicantName: app.applicantName,
      guardianName: app.guardianName,
      guardianPhone: app.guardianPhone,
      guardianRelationship: app.guardianRelationship || 'Father',
      desiredClass: app.desiredClass,
      gender: app.gender || 'Male',
      dateOfBirth: app.dateOfBirth || '',
      status: app.status,
      notes: app.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      admissionDate:
        editingApp?.admissionDate || new Date().toISOString().split('T')[0]
    };
    if (editingApp) {
      await onUpdateAdmission(editingApp.id, payload);
    } else {
      await onAddAdmission(payload);
    }
    setShowModal(false);
  };

  const handleQuickStatus = async (app: Admission, status: Admission['status']) => {
    await onUpdateAdmission(app.id, { status });
  };

  const getStatusBadgeVariant = (status: Admission['status']) => {
    switch (status) {
      case 'Enrolled':
        return 'success' as const;
      case 'Approved':
        return 'info' as const;
      case 'Rejected':
        return 'danger' as const;
      default:
        return 'warning' as const;
    }
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Qabashada Ardayda Cusub (Admissions & Enrollment)"
        subtitle="Diiwaangeli codsiyada ardayda cusub, qiimee, oo u gudbi liiska ardayda rasmiga ah."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            Codsi Cusub (New Application)
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Wadarta Codsiyada"
          value={stats.total}
          icon={<FileText className="w-4 h-4" />}
          tone="default"
        />
        <StatCard
          label="Sugaya (Pending)"
          value={stats.pending}
          icon={<Clock className="w-4 h-4" />}
          tone="warning"
        />
        <StatCard
          label="La Aqbalay (Approved)"
          value={stats.approved}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="info"
        />
        <StatCard
          label="La Diiwaangeliyay (Enrolled)"
          value={stats.enrolled}
          icon={<UserPlus className="w-4 h-4" />}
          tone="emerald"
        />
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Raadi magaca ardayga, waalidka ama telefoonka..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'Pending', 'Approved', 'Enrolled', 'Rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {st === 'ALL' ? 'Dhammaan' : st}
            </button>
          ))}
        </div>
      </Card>

      {/* Applications Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="w-6 h-6" />}
            title="Codsiyo lama helin (No applications found)"
            description="Riix 'Codsi Cusub' si aad u diiwaangeliso arday cusub oo doonaya dugsiga."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Codsi Cusub (New Application)
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  <th className="py-3.5 px-4">Ardayga (Applicant)</th>
                  <th className="py-3.5 px-4">Waalidka & Telefoonka</th>
                  <th className="py-3.5 px-4">Fasalka La Codsaday</th>
                  <th className="py-3.5 px-4">Taariikhda</th>
                  <th className="py-3.5 px-4">Xaaladda (Status)</th>
                  <th className="py-3.5 px-4 text-right">Ficillo (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-sm">
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--color-text-primary)]">
                        {app.applicantName}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {app.gender} {app.dateOfBirth ? `• DOB: ${app.dateOfBirth}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[var(--color-text-primary)] font-medium">
                        {app.guardianName || '—'}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        {app.guardianPhone || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="neutral">{app.desiredClass}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-[var(--color-text-secondary)]">
                      {app.admissionDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(app.status)} dot>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {app.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(app, 'Approved')}
                              className="px-2.5 py-1 bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Aqbal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(app, 'Rejected')}
                              className="p-1.5 text-[var(--color-text-secondary)] hover:text-rose-500 rounded-lg"
                              title="Diid (Reject)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(app.status === 'Approved' || app.status === 'Pending') && (
                          <button
                            type="button"
                            onClick={() => setPendingEnrollApp(app)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                          >
                            Enroll <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(app)}
                          className="px-2.5 py-1 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(app.id)}
                          className="p-1.5 text-[var(--color-text-secondary)] hover:text-rose-500 rounded-lg"
                          title="Tirtir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ds-surface-elevated rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editingApp
                  ? 'Wax ka beddel Codsiga'
                  : 'Diiwaangeli Codsi Arday Cusub'}
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
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Magaca Ardayga (Applicant Full Name)
                </label>
                <input
                  type="text"
                  required
                  value={formData.applicantName}
                  onChange={(e) =>
                    setFormData({ ...formData, applicantName: e.target.value })
                  }
                  placeholder="Tusaale: Axmed Cali Maxamed"
                  className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Magaca Waalidka (Guardian)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guardianName}
                    onChange={(e) =>
                      setFormData({ ...formData, guardianName: e.target.value })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Telefoonka Waalidka
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guardianPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, guardianPhone: e.target.value })
                    }
                    placeholder="+252..."
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Fasalka La Rabo
                  </label>
                  <select
                    value={formData.desiredClass}
                    onChange={(e) =>
                      setFormData({ ...formData, desiredClass: e.target.value })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.className}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Jinsiga (Gender)
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gender: e.target.value as 'Male' | 'Female'
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="Male">Lab (Male)</option>
                    <option value="Female">Dheddig (Female)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Xaaladda (Status)
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Admission['status']
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Enrolled">Enrolled</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Faahfaahin Dheeraad ah (Notes)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl p-3 text-sm text-[var(--color-text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Jooji
                </Button>
                <Button variant="primary" type="submit">
                  Kaydi Codsiga
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Confirmation */}
      <ConfirmDialog
        open={pendingEnrollApp !== null}
        title="Diiwaangeli Ardayga (Enroll Applicant)"
        description={
          pendingEnrollApp
            ? `Ma hubtaa inaad "${pendingEnrollApp.applicantName}" u gudbiso liiska ardayda rasmiga ah ee fasalka ${pendingEnrollApp.desiredClass}?`
            : ''
        }
        confirmLabel="Haa, Enroll"
        variant="primary"
        isLoading={isProcessing}
        onCancel={() => setPendingEnrollApp(null)}
        onConfirm={async () => {
          if (!pendingEnrollApp) return;
          setIsProcessing(true);
          try {
            await onEnrollApplicant(pendingEnrollApp.id);
          } finally {
            setIsProcessing(false);
            setPendingEnrollApp(null);
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Tirtir Codsiga (Delete Application)"
        description="Ma hubtaa inaad tirtirto codsigan?"
        confirmLabel="Haa, Tirtir"
        variant="danger"
        isLoading={isProcessing}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId === null) return;
          setIsProcessing(true);
          try {
            await onDeleteAdmission(pendingDeleteId);
          } finally {
            setIsProcessing(false);
            setPendingDeleteId(null);
          }
        }}
      />
    </PageContainer>
  );
}
