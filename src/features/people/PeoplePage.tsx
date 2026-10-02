import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Download,
  GraduationCap,
  Briefcase,
  Users,
  ShieldCheck
} from 'lucide-react';
import { Teacher, StaffMember, Guardian, SchoolClass, SchoolSubject } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import { Button, Card, ConfirmDialog, StatCard } from '../../components/ui/primitives';
import { apiFetch } from '../../lib/apiClient';
import { exportTeachersToPDF, exportTeachersToExcel } from './peopleExportUtils';
import {
  TeachersDirectoryGrid,
  StaffDirectoryTable,
  GuardiansDirectoryGrid
} from './PeopleDirectoryViews';
import { PeopleModals } from './PeopleModals';

interface PeopleViewProps {
  teachers: Teacher[];
  staff: StaffMember[];
  guardians: Guardian[];
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  students?: any[];
  onAddTeacher: (data: any) => Promise<void>;
  onUpdateTeacher: (id: string, data: any) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  onAddStaff: (data: any) => Promise<void>;
  onUpdateStaff: (id: string, data: any) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  onAddGuardian: (data: any) => Promise<void>;
  onUpdateGuardian: (id: string, data: any) => Promise<void>;
  onDeleteGuardian: (id: string) => Promise<void>;
  currency?: string;
  theme: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  subSection?: 'teachers' | 'staff' | 'guardians';
  onNavigateSubSection?: (sub: 'teachers' | 'staff' | 'guardians') => void;
}

export default function PeopleView({
  teachers,
  staff,
  guardians,
  classes,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onAddGuardian,
  onUpdateGuardian,
  onDeleteGuardian,
  currency = '$',
  showToast = () => {},
  subSection,
  onNavigateSubSection
}: PeopleViewProps) {
  const [activeSubTab, setActiveSubTabState] = useState<'teachers' | 'staff' | 'guardians'>(
    subSection || 'teachers'
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (subSection && subSection !== activeSubTab) {
      setActiveSubTabState(subSection);
    }
  }, [subSection]);

  const setActiveSubTab = (tab: 'teachers' | 'staff' | 'guardians') => {
    setActiveSubTabState(tab);
    if (onNavigateSubSection) {
      onNavigateSubSection(tab);
    }
  };
  const [filterRole, setFilterRole] = useState('All');
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
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

  const handleResendInvitation = async (teacher: Teacher) => {
    if (!teacher.email || !teacher.email.includes('@')) {
      showToast('Macallinkani ma laha email sax ah.', 'error');
      return;
    }
    setResendingId(teacher.id);
    try {
      const res = await apiFetch(`/api/teachers/${teacher.id}/resend-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Casuumaadda dib looma diri karin.', 'error');
      } else {
        showToast(data.message || `Casuumaad cusub waxaa loo diray ${teacher.email}`);
        if (data.activationLink && navigator.clipboard) {
          navigator.clipboard.writeText(data.activationLink).catch(() => {});
        }
      }
    } catch {
      showToast('Cilad farsamo ayaa dhacday casuumaadda.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyActivationLink = async (teacher: Teacher) => {
    try {
      const baseUrl = window.location.origin;
      let link = '';
      if (teacher.invitationToken) {
        link = `${baseUrl}/activate-teacher?token=${teacher.invitationToken}`;
      } else {
        const res = await apiFetch(`/api/teachers/${teacher.id}/resend-invitation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        link = data.activationLink || `${baseUrl}/activate-teacher`;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        showToast('Link-ga casuumaadda waxaa lagu koobiyeeyay clipboard-kaaga!');
      } else {
        showToast(`Link: ${link}`, 'info');
      }
    } catch {
      showToast('Ma suurtogalin in link-ga la koobiyeeyo.', 'error');
    }
  };

  const handleToggleStatus = (teacher: Teacher) => {
    const newStatus = teacher.status === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
    const actionLabel = newStatus === 'ACTIVE' ? 'Dib u howlgeli' : 'Haki (Deactivate)';
    setConfirmState({
      isOpen: true,
      title: `${actionLabel} Akoonka Macallinka?`,
      message: `Ma hubtaa inaad ${actionLabel} akoonka macallinka ${teacher.name}?`,
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/teachers/${teacher.id}/toggle-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
            teacher.status = newStatus;
            showToast(`Akoonka macallinka ${teacher.name} waxaa laga dhigay: ${newStatus}`);
          } else {
            showToast('Cilad ayaa dhacday beddelidda xaaladda.', 'error');
          }
        } catch {
          showToast('Cilad farsamo ayaa dhacday.', 'error');
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Male' as 'Male' | 'Female',
    qualification: '',
    specialization: '',
    employmentStatus: 'Full-Time' as
      | 'Full-Time'
      | 'Part-Time'
      | 'Contract'
      | 'On Leave'
      | 'Terminated',
    salary: 0,
    hireDate: new Date().toISOString().split('T')[0],
    address: '',
    emergencyContact: '',
    notes: '',
    assignedClasses: [] as string[],
    assignedSubjects: [] as string[]
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: 'Staff' as any,
    department: 'Administration',
    phone: '',
    email: '',
    salary: 0,
    employmentStatus: 'Full-Time' as
      | 'Full-Time'
      | 'Part-Time'
      | 'Contract'
      | 'On Leave'
      | 'Terminated',
    hireDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [guardianForm, setGuardianForm] = useState({
    name: '',
    relationship: 'Father' as any,
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    occupation: '',
    emergencyContact: '',
    notes: ''
  });

  const openAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm({
      name: '',
      phone: '',
      email: '',
      gender: 'Male',
      qualification: 'Bachelor in Education',
      specialization: 'General',
      employmentStatus: 'Full-Time',
      salary: 350,
      hireDate: new Date().toISOString().split('T')[0],
      address: '',
      emergencyContact: '',
      notes: '',
      assignedClasses: [],
      assignedSubjects: []
    });
    setShowTeacherModal(true);
  };

  const openEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setTeacherForm({
      name: t.name,
      phone: t.phone,
      email: t.email || '',
      gender: t.gender || 'Male',
      qualification: t.qualification || '',
      specialization: t.specialization || '',
      employmentStatus: t.employmentStatus || 'Full-Time',
      salary: t.salary || 0,
      hireDate: t.hireDate || '',
      address: t.address || '',
      emergencyContact: t.emergencyContact || '',
      notes: t.notes || '',
      assignedClasses: t.assignedClasses || [],
      assignedSubjects: t.assignedSubjects || []
    });
    setShowTeacherModal(true);
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name.trim() || !teacherForm.phone.trim()) {
      showToast('Magaca iyo taleefanka macallinka waa khasab', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingTeacher) {
        await onUpdateTeacher(editingTeacher.id, teacherForm);
        showToast('Macallinka si guul leh ayaa loo cusbooneysiiyey');
      } else {
        await onAddTeacher(teacherForm);
        showToast('Macallin cusub ayaa si guul leh loogu daray');
      }
      setShowTeacherModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Khalad ayaa dhacay', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({
      name: '',
      role: 'Staff',
      department: 'Administration',
      phone: '',
      email: '',
      salary: 250,
      employmentStatus: 'Full-Time',
      hireDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowStaffModal(true);
  };

  const openEditStaff = (s: StaffMember) => {
    setEditingStaff(s);
    setStaffForm({
      name: s.name,
      role: s.role,
      department: s.department || '',
      phone: s.phone || '',
      email: s.email || '',
      salary: s.salary || 0,
      employmentStatus: s.employmentStatus || 'Full-Time',
      hireDate: s.hireDate || '',
      notes: s.notes || ''
    });
    setShowStaffModal(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.phone.trim()) {
      showToast('Magaca iyo taleefanka shaqaalaha waa khasab', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingStaff) {
        await onUpdateStaff(editingStaff.id, staffForm);
        showToast('Shaqaalaha si guul leh ayaa loo cusbooneysiiyey');
      } else {
        await onAddStaff(staffForm);
        showToast('Shaqaale cusub ayaa si guul leh loogu daray');
      }
      setShowStaffModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Khalad ayaa dhacay', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddGuardian = () => {
    setEditingGuardian(null);
    setGuardianForm({
      name: '',
      relationship: 'Father',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      occupation: '',
      emergencyContact: '',
      notes: ''
    });
    setShowGuardianModal(true);
  };

  const openEditGuardian = (g: Guardian) => {
    setEditingGuardian(g);
    setGuardianForm({
      name: g.name,
      relationship: g.relationship,
      phone: g.phone,
      whatsapp: g.whatsapp || g.phone,
      email: g.email || '',
      address: g.address || '',
      occupation: g.occupation || '',
      emergencyContact: g.emergencyContact || '',
      notes: g.notes || ''
    });
    setShowGuardianModal(true);
  };

  const handleGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianForm.name.trim() || !guardianForm.phone.trim()) {
      showToast('Magaca iyo taleefanka waalidka waa khasab', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingGuardian) {
        await onUpdateGuardian(editingGuardian.id, guardianForm);
        showToast('Waalidka si guul leh ayaa loo cusbooneysiiyey');
      } else {
        await onAddGuardian(guardianForm);
        showToast('Waalid cusub ayaa si guul leh loogu daray');
      }
      setShowGuardianModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Khalad ayaa dhacay', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      (t.specialization && t.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredStaff = staff.filter((s) => {
    const matchQuery =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery);
    const matchRole = filterRole === 'All' || s.role === filterRole;
    return matchQuery && matchRole;
  });

  const filteredGuardians = guardians.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phone.includes(searchQuery) ||
      (g.whatsapp && g.whatsapp.includes(searchQuery))
  );

  const exportTeachersPDF = () => exportTeachersToPDF(filteredTeachers, currency);
  const exportTeachersExcel = () => exportTeachersToExcel(filteredTeachers);

  const activeTeachersCount = teachers.filter((t) => t.status !== 'DEACTIVATED').length;
  const totalTeacherPayroll = teachers.reduce((sum, t) => sum + (Number(t.salary) || 0), 0);
  const totalStaffPayroll = staff.reduce((sum, s) => sum + (Number(s.salary) || 0), 0);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'People & HR' },
          {
            label:
              activeSubTab === 'teachers'
                ? 'Teachers'
                : activeSubTab === 'staff'
                ? 'Staff'
                : 'Guardians'
          }
        ]}
        title="Maamulka Shaqaalaha & Waalidiinta (People)"
        description="Macallimiinta, shaqaalaha maamulka, iyo xogta waalidiinta iskuulka"
        actions={
          <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('teachers');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'teachers'
                  ? 'bg-[var(--color-brand)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Macallimiinta ({teachers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('staff');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'staff'
                  ? 'bg-[var(--color-brand)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Shaqaalaha ({staff.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('guardians');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'guardians'
                  ? 'bg-[var(--color-brand)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Waalidiinta ({guardians.length})
            </button>
          </div>
        }
      />

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Macallimiinta"
          value={teachers.length}
          sublabel={`${activeTeachersCount} firfircoon`}
          variant="brand"
          icon={<GraduationCap className="w-4 h-4" />}
          onClick={() => setActiveSubTab('teachers')}
        />
        <StatCard
          label="Shaqaalaha Maamulka"
          value={staff.length}
          sublabel="Waaxaha iskuulka"
          variant="info"
          icon={<Briefcase className="w-4 h-4" />}
          onClick={() => setActiveSubTab('staff')}
        />
        <StatCard
          label="Waalidiinta"
          value={guardians.length}
          sublabel="Diiwaanka mas'uuliyiinta"
          variant="success"
          icon={<Users className="w-4 h-4" />}
          onClick={() => setActiveSubTab('guardians')}
        />
        <StatCard
          label="Mushaharka Bisha"
          value={`${currency} ${(totalTeacherPayroll + totalStaffPayroll).toLocaleString()}`}
          sublabel="Macallin & Shaqaale"
          variant="warning"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      {/* Control Bar: Search, Filters, Add Button, Exports */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeSubTab === 'teachers'
                    ? 'Raadi macallin magaciisa ama taleefanka...'
                    : activeSubTab === 'staff'
                    ? 'Raadi shaqaale...'
                    : 'Raadi waalid...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ds-input pl-9 pr-3 py-2 text-xs"
              />
            </div>

            {activeSubTab === 'staff' && (
              <select
                aria-label="Filter staff by role"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="ds-input px-3 py-2 text-xs max-w-[180px]"
              >
                <option value="All">All Roles</option>
                <option value="Principal">Principal</option>
                <option value="Vice Principal">Vice Principal</option>
                <option value="Accountant">Accountant</option>
                <option value="Administrator">Administrator</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Librarian">Librarian</option>
                <option value="Staff">Staff</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeSubTab === 'teachers' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5 text-[var(--color-brand)]" />}
                  onClick={exportTeachersPDF}
                >
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5 text-[var(--color-success)]" />}
                  onClick={exportTeachersExcel}
                >
                  Excel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={openAddTeacher}
                >
                  Ku dar Macallin
                </Button>
              </>
            )}

            {activeSubTab === 'staff' && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={openAddStaff}
              >
                Ku dar Shaqaale
              </Button>
            )}

            {activeSubTab === 'guardians' && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={openAddGuardian}
              >
                Ku dar Waalid
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Content Displays */}
      {activeSubTab === 'teachers' && (
        <TeachersDirectoryGrid
          teachers={filteredTeachers}
          currency={currency}
          resendingId={resendingId}
          onResendInvitation={handleResendInvitation}
          onCopyActivationLink={handleCopyActivationLink}
          onToggleStatus={handleToggleStatus}
          onEditTeacher={openEditTeacher}
          onDeleteTeacherClick={(t) =>
            setConfirmState({
              isOpen: true,
              title: 'Tirtir Macallinka?',
              message: `Ma hubtaa inaad tirtirto macallinka ${t.name}?`,
              onConfirm: async () => {
                await onDeleteTeacher(t.id);
                setConfirmState((prev) => ({ ...prev, isOpen: false }));
              }
            })
          }
        />
      )}

      {activeSubTab === 'staff' && (
        <StaffDirectoryTable
          staff={filteredStaff}
          currency={currency}
          onEditStaff={openEditStaff}
          onDeleteStaffClick={(s) =>
            setConfirmState({
              isOpen: true,
              title: 'Tirtir Shaqaalaha?',
              message: `Ma hubtaa inaad tirtirto shaqaalaha ${s.name}?`,
              onConfirm: async () => {
                await onDeleteStaff(s.id);
                setConfirmState((prev) => ({ ...prev, isOpen: false }));
              }
            })
          }
        />
      )}

      {activeSubTab === 'guardians' && (
        <GuardiansDirectoryGrid
          guardians={filteredGuardians}
          onEditGuardian={openEditGuardian}
          onDeleteGuardianClick={(g) =>
            setConfirmState({
              isOpen: true,
              title: 'Tirtir Waalidka?',
              message: `Ma hubtaa inaad tirtirto waalidka ${g.name}?`,
              onConfirm: async () => {
                await onDeleteGuardian(g.id);
                setConfirmState((prev) => ({ ...prev, isOpen: false }));
              }
            })
          }
        />
      )}

      <PeopleModals
        showTeacherModal={showTeacherModal}
        onCloseTeacherModal={() => setShowTeacherModal(false)}
        editingTeacher={editingTeacher}
        teacherForm={teacherForm}
        setTeacherForm={setTeacherForm}
        onSubmitTeacher={handleTeacherSubmit}
        classes={classes}
        showStaffModal={showStaffModal}
        onCloseStaffModal={() => setShowStaffModal(false)}
        editingStaff={editingStaff}
        staffForm={staffForm}
        setStaffForm={setStaffForm}
        onSubmitStaff={handleStaffSubmit}
        showGuardianModal={showGuardianModal}
        onCloseGuardianModal={() => setShowGuardianModal(false)}
        editingGuardian={editingGuardian}
        guardianForm={guardianForm}
        setGuardianForm={setGuardianForm}
        onSubmitGuardian={handleGuardianSubmit}
        currency={currency}
        loading={loading}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </PageContainer>
  );
}
