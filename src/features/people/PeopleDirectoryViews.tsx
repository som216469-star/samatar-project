import React from 'react';
import {
  Users,
  Edit2,
  Trash2,
  Phone,
  Mail,
  GraduationCap,
  ExternalLink,
  Send,
  Copy,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { Teacher, StaffMember, Guardian } from '../../types';
import { Badge, Card, EmptyState } from '../../components/ui/primitives';

interface TeachersDirectoryGridProps {
  teachers: Teacher[];
  currency: string;
  resendingId: string | null;
  onResendInvitation: (teacher: Teacher) => void;
  onCopyActivationLink: (teacher: Teacher) => void;
  onToggleStatus: (teacher: Teacher) => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacherClick: (teacher: Teacher) => void;
}

export const TeachersDirectoryGrid: React.FC<TeachersDirectoryGridProps> = ({
  teachers,
  currency,
  resendingId,
  onResendInvitation,
  onCopyActivationLink,
  onToggleStatus,
  onEditTeacher,
  onDeleteTeacherClick
}) => {
  if (teachers.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="Ma jiraan macallimiin la helay"
          description="Guji batoonka kore si aad ugu darto macallin cusub"
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teachers.map((t) => (
        <Card
          key={t.id}
          className="flex flex-col justify-between hover:border-[var(--color-brand)] transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand)] font-bold text-sm font-mono shrink-0">
                  {t.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight truncate">
                    {t.name}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
                    {t.teacherId} • {t.gender}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge
                  variant={
                    t.status === 'INVITED'
                      ? 'warning'
                      : t.status === 'DEACTIVATED'
                      ? 'danger'
                      : 'success'
                  }
                >
                  {t.status === 'INVITED'
                    ? 'Casuuman'
                    : t.status === 'DEACTIVATED'
                    ? 'Hakiyey'
                    : 'Firfircoon'}
                </Badge>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {t.employmentStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-[var(--color-border)]">
              <div>
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">
                  Takhasus
                </span>
                <span className="text-[var(--color-text-primary)] font-medium truncate block">
                  {t.specialization || 'General'}
                </span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">
                  Mushahar
                </span>
                <span className="text-[var(--color-brand)] font-bold font-mono">
                  {currency} {t.salary}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs pt-2 text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <span className="font-mono text-[11px]">{t.phone}</span>
              </div>
              {t.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span className="truncate text-[11px]">{t.email}</span>
                </div>
              )}
            </div>

            {t.assignedClasses && t.assignedClasses.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                  Fasallada
                </span>
                <div className="flex flex-wrap gap-1">
                  {t.assignedClasses.map((cls, idx) => (
                    <Badge key={idx} variant="neutral">
                      {cls}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1.5">
              {t.email && (
                <>
                  <button
                    type="button"
                    onClick={() => onResendInvitation(t)}
                    disabled={resendingId === t.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--color-brand-soft)] text-[var(--color-brand)] border border-[var(--color-brand-border)] hover:opacity-90 transition disabled:opacity-50"
                    title="Dib ugu dir casuumaadda email-ka macallinka"
                  >
                    {resendingId === t.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">Casuumaad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyActivationLink(t)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)] transition"
                    title="Koobi garee Link-ga casuumaadda"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">Link</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleStatus(t)}
                aria-label={
                  t.status === 'DEACTIVATED'
                    ? 'Dib u howlgeli macallinka'
                    : 'Haki akoonka macallinka'
                }
                className={`p-1.5 rounded-md transition-colors ${
                  t.status === 'DEACTIVATED'
                    ? 'text-[var(--color-success)] hover:bg-[var(--color-success-soft)]'
                    : 'text-[var(--color-warning)] hover:bg-[var(--color-warning-soft)]'
                }`}
                title={
                  t.status === 'DEACTIVATED'
                    ? 'Dib u howlgeli macallinka'
                    : 'Haki akoonka macallinka'
                }
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onEditTeacher(t)}
                aria-label={`Edit teacher ${t.name}`}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                title="Tafatir"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteTeacherClick(t)}
                aria-label={`Delete teacher ${t.name}`}
                className="p-1.5 rounded-md text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
                title="Tirtir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

interface StaffDirectoryTableProps {
  staff: StaffMember[];
  currency: string;
  onEditStaff: (staffMember: StaffMember) => void;
  onDeleteStaffClick: (staffMember: StaffMember) => void;
}

export const StaffDirectoryTable: React.FC<StaffDirectoryTableProps> = ({
  staff,
  currency,
  onEditStaff,
  onDeleteStaffClick
}) => {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="py-3 px-4">ID / Magaca</th>
              <th className="py-3 px-4">Doorka (Role)</th>
              <th className="py-3 px-4">Waaxda (Dept)</th>
              <th className="py-3 px-4">Xiriirka (Contact)</th>
              <th className="py-3 px-4">Mushahar</th>
              <th className="py-3 px-4">Xaaladda</th>
              <th className="py-3 px-4 text-right">Hawlaha</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10">
                  <EmptyState
                    title="Ma jiraan shaqaale la helay"
                    description="Guji batoonka sare si aad ugu darto shaqaale cusub."
                  />
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--color-text-primary)]">{s.name}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                      {s.employeeId}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="brand">{s.role}</Badge>
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                    {s.department || '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <div className="text-[var(--color-text-primary)]">{s.phone}</div>
                    {s.email && (
                      <div className="text-[10px] text-[var(--color-text-muted)]">{s.email}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[var(--color-text-primary)]">
                    {currency} {s.salary}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={s.employmentStatus === 'Full-Time' ? 'success' : 'warning'}>
                      {s.employmentStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEditStaff(s)}
                        aria-label={`Edit staff ${s.name}`}
                        className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                        title="Tafatir"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStaffClick(s)}
                        aria-label={`Delete staff ${s.name}`}
                        className="p-1.5 rounded-md text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                        title="Tirtir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

interface GuardiansDirectoryGridProps {
  guardians: Guardian[];
  onEditGuardian: (guardian: Guardian) => void;
  onDeleteGuardianClick: (guardian: Guardian) => void;
}

export const GuardiansDirectoryGrid: React.FC<GuardiansDirectoryGridProps> = ({
  guardians,
  onEditGuardian,
  onDeleteGuardianClick
}) => {
  if (guardians.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Ma jiraan waalidiin diiwaangashan"
          description="Guji batoonka sare si aad ugu darto waalid"
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {guardians.map((g) => (
        <Card
          key={g.id}
          className="flex flex-col justify-between hover:border-[var(--color-brand)] transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">
                  {g.name}
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
                  {g.guardianId} • {g.relationship}
                </p>
              </div>
              {g.whatsapp && (
                <a
                  href={`https://wa.me/${g.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] bg-[var(--color-success-soft)] border border-[var(--color-success-border)] text-[var(--color-success)] px-2.5 py-1 rounded-md hover:opacity-90 transition-opacity font-medium"
                  title="Ku fur WhatsApp"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-1 text-xs pt-2.5 border-t border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <span className="font-mono text-[11px]">{g.phone}</span>
              </div>
              {g.address && (
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">📍 {g.address}</p>
              )}
              {g.occupation && (
                <p className="text-[11px] text-[var(--color-text-muted)]">💼 {g.occupation}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-4 mt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => onEditGuardian(g)}
              aria-label={`Edit guardian ${g.name}`}
              className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Tafatir"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteGuardianClick(g)}
              aria-label={`Delete guardian ${g.name}`}
              className="p-1.5 rounded-md text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
              title="Tirtir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
};
