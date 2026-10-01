import React, { useState, useEffect } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import { Teacher, StaffMember, Guardian, SchoolClass, SchoolSubject } from '../../types';
import { ConfirmDialog } from '../../components/ui/primitives';
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
  subjects,
  students = [],
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
      showToast("Macallinkani ma laha email sax ah.", "error");
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
        showToast(data.error || "Casuumaadda dib looma diri karin.", "error");
      } else {
        showToast(data.message || `Casuumaad cusub waxaa loo diray ${teacher.email}`);
        if (data.activationLink && navigator.clipboard) {
          navigator.clipboard.writeText(data.activationLink).catch(() => {});
        }
      }
    } catch (err: any) {
      showToast("Cilad farsamo ayaa dhacday casuumaadda.", "error");
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyActivationLink = async (teacher: Teacher) => {
    try {
      const baseUrl = window.location.origin;
      let link = "";
      if (teacher.invitationToken) {
        link = `${baseUrl}/activate-teacher?token=${teacher.invitationToken}`;
      } else {
        // Generate or get new link via resend
        const res = await apiFetch(`/api/teachers/${teacher.id}/resend-invitation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        link = data.activationLink || `${baseUrl}/activate-teacher`;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        showToast("Link-ga casuumaadda waxaa lagu koobiyeeyay clipboard-kaaga!");
      } else {
        showToast(`Link: ${link}`, "info");
      }
    } catch (e) {
      showToast("Ma suurtogalin in link-ga la koobiyeeyo.", "error");
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
            showToast("Cilad ayaa dhacday beddelidda xaaladda.", "error");
          }
        } catch {
          showToast("Cilad farsamo ayaa dhacday.", "error");
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Modals
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Male' as 'Male' | 'Female',
    qualification: '',
    specialization: '',
    employmentStatus: 'Full-Time' as 'Full-Time' | 'Part-Time' | 'Contract' | 'On Leave' | 'Terminated',
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
    employmentStatus: 'Full-Time' as 'Full-Time' | 'Part-Time' | 'Contract' | 'On Leave' | 'Terminated',
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

  // Open Teacher Modal
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
      showToast("Magaca iyo taleefanka macallinka waa khasab", "error");
      return;
    }
    setLoading(true);
    try {
      if (editingTeacher) {
        await onUpdateTeacher(editingTeacher.id, teacherForm);
        showToast("Macallinka si guul leh ayaa loo cusbooneysiiyey");
      } else {
        await onAddTeacher(teacherForm);
        showToast("Macallin cusub ayaa si guul leh loogu daray");
      }
      setShowTeacherModal(false);
    } catch (err: any) {
      showToast(err?.message || "Khalad ayaa dhacay", "error");
    } finally {
      setLoading(false);
    }
  };

  // Open Staff Modal
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
      showToast("Magaca iyo taleefanka shaqaalaha waa khasab", "error");
      return;
    }
    setLoading(true);
    try {
      if (editingStaff) {
        await onUpdateStaff(editingStaff.id, staffForm);
        showToast("Shaqaalaha si guul leh ayaa loo cusbooneysiiyey");
      } else {
        await onAddStaff(staffForm);
        showToast("Shaqaale cusub ayaa si guul leh loogu daray");
      }
      setShowStaffModal(false);
    } catch (err: any) {
      showToast(err?.message || "Khalad ayaa dhacay", "error");
    } finally {
      setLoading(false);
    }
  };

  // Open Guardian Modal
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
      showToast("Magaca iyo taleefanka waalidka waa khasab", "error");
      return;
    }
    setLoading(true);
    try {
      if (editingGuardian) {
        await onUpdateGuardian(editingGuardian.id, guardianForm);
        showToast("Waalidka si guul leh ayaa loo cusbooneysiiyey");
      } else {
        await onAddGuardian(guardianForm);
        showToast("Waalid cusub ayaa si guul leh loogu daray");
      }
      setShowGuardianModal(false);
    } catch (err: any) {
      showToast(err?.message || "Khalad ayaa dhacay", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone.includes(searchQuery) ||
    (t.specialization && t.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredStaff = staff.filter(s => {
    const matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery);
    const matchRole = filterRole === 'All' || s.role === filterRole;
    return matchQuery && matchRole;
  });

  const filteredGuardians = guardians.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.phone.includes(searchQuery) ||
    (g.whatsapp && g.whatsapp.includes(searchQuery))
  );

  const exportTeachersPDF = () => exportTeachersToPDF(filteredTeachers, currency);
  const exportTeachersExcel = () => exportTeachersToExcel(filteredTeachers);

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-serif italic text-[#f5f5f5]">
            Maamulka Shaqaalaha & Waalidiinta (People)
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-[#737373] mt-1">
            Macallimiinta, shaqaalaha maamulka, iyo xogta waalidiinta iskuulka
          </p>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center gap-1 bg-[#0f0f0f] border border-[#ffffff10] p-1 rounded-sm">
          <button
            onClick={() => { setActiveSubTab('teachers'); setSearchQuery(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
              activeSubTab === 'teachers' 
                ? 'bg-[#7c3aed] text-white' 
                : 'text-[#a3a3a3] hover:text-white'
            }`}
          >
            Macallimiinta ({teachers.length})
          </button>
          <button
            onClick={() => { setActiveSubTab('staff'); setSearchQuery(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
              activeSubTab === 'staff' 
                ? 'bg-[#7c3aed] text-white' 
                : 'text-[#a3a3a3] hover:text-white'
            }`}
          >
            Shaqaalaha ({staff.length})
          </button>
          <button
            onClick={() => { setActiveSubTab('guardians'); setSearchQuery(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
              activeSubTab === 'guardians' 
                ? 'bg-[#7c3aed] text-white' 
                : 'text-[#a3a3a3] hover:text-white'
            }`}
          >
            Waalidiinta ({guardians.length})
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Add Button, Exports */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0f0f0f] border border-[#ffffff10] p-4 rounded-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'teachers' 
                  ? "Raadi macallin magaciisa ama taleefanka..." 
                  : activeSubTab === 'staff' 
                    ? "Raadi shaqaale..." 
                    : "Raadi waalid..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm pl-9 pr-3 py-2 text-xs text-[#f5f5f5] placeholder-[#525252] focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          {activeSubTab === 'staff' && (
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-xs text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
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
              <button
                onClick={exportTeachersPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#ffffff10] text-xs font-semibold text-[#a3a3a3] hover:text-white hover:bg-[#ffffff05] transition-colors"
                title="Dhoofi PDF"
              >
                <Download className="w-3.5 h-3.5 text-[#c4b5fd]" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={exportTeachersExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#ffffff10] text-xs font-semibold text-[#a3a3a3] hover:text-white hover:bg-[#ffffff05] transition-colors"
                title="Dhoofi Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={openAddTeacher}
                className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#7c3aed] text-white text-xs font-semibold hover:bg-[#6d28d9] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Ku dar Macallin</span>
              </button>
            </>
          )}

          {activeSubTab === 'staff' && (
            <button
              onClick={openAddStaff}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#7c3aed] text-white text-xs font-semibold hover:bg-[#6d28d9] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ku dar Shaqaale</span>
            </button>
          )}

          {activeSubTab === 'guardians' && (
            <button
              onClick={openAddGuardian}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#7c3aed] text-white text-xs font-semibold hover:bg-[#6d28d9] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ku dar Waalid</span>
            </button>
          )}
        </div>
      </div>

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
    </div>
  );
}
