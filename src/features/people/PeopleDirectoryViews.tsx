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
      <div className="col-span-full py-16 text-center border border-dashed border-[#ffffff10] rounded-sm">
        <GraduationCap className="w-10 h-10 text-[#525252] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#a3a3a3]">Ma jiraan macallimiin la helay</p>
        <p className="text-xs text-[#525252] mt-1">
          Guji batoonka kore si aad ugu darto macallin cusub
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teachers.map((t) => (
        <div
          key={t.id}
          className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-5 flex flex-col justify-between hover:border-[#7c3aed]/50 transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center text-[#c4b5fd] font-bold text-sm font-mono">
                  {t.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f5f5f5] leading-tight">{t.name}</h3>
                  <p className="text-[10px] text-[#737373] font-mono mt-0.5">
                    {t.teacherId} • {t.gender}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase ${
                    t.status === 'INVITED'
                      ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                      : t.status === 'DEACTIVATED'
                      ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                      : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  {t.status === 'INVITED'
                    ? 'Casuuman'
                    : t.status === 'DEACTIVATED'
                    ? 'Hakiyey'
                    : 'Firfircoon'}
                </span>
                <span className="text-[9px] text-[#737373] font-mono">{t.employmentStatus}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#ffffff05]">
              <div>
                <span className="text-[#525252] block text-[10px] uppercase font-mono">
                  Takhasus
                </span>
                <span className="text-[#d4d4d4] font-medium truncate block">
                  {t.specialization || 'General'}
                </span>
              </div>
              <div>
                <span className="text-[#525252] block text-[10px] uppercase font-mono">
                  Mushahar
                </span>
                <span className="text-[#c4b5fd] font-bold font-mono">
                  {currency} {t.salary}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs pt-2 text-[#a3a3a3]">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#525252]" />
                <span className="font-mono text-[11px]">{t.phone}</span>
              </div>
              {t.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#525252]" />
                  <span className="truncate text-[11px]">{t.email}</span>
                </div>
              )}
            </div>

            {t.assignedClasses && t.assignedClasses.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] text-[#525252] uppercase tracking-wider block mb-1">
                  Fasallada
                </span>
                <div className="flex flex-wrap gap-1">
                  {t.assignedClasses.map((cls, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-[#ffffff05] border border-[#ffffff10] px-2 py-0.5 rounded-sm text-[#d4d4d4]"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#ffffff05]">
            <div className="flex items-center gap-1.5">
              {t.email && (
                <>
                  <button
                    type="button"
                    onClick={() => onResendInvitation(t)}
                    disabled={resendingId === t.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium bg-[#7c3aed]/20 text-[#c4b5fd] border border-[#7c3aed]/40 hover:bg-[#7c3aed]/30 transition disabled:opacity-50"
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
                    className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium bg-[#ffffff05] text-[#d4d4d4] border border-[#ffffff10] hover:bg-[#ffffff10] transition"
                    title="Koobi garee Link-ga casuumaadda"
                  >
                    <Copy className="w-3 h-3 text-[#a3a3a3]" />
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
                className={`p-1.5 rounded-sm transition-colors ${
                  t.status === 'DEACTIVATED'
                    ? 'text-emerald-400 hover:bg-emerald-950/30'
                    : 'text-amber-400 hover:bg-amber-950/30'
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
                className="p-1.5 rounded-sm text-[#a3a3a3] hover:text-white hover:bg-[#ffffff05] transition-colors"
                title="Tafatir"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteTeacherClick(t)}
                aria-label={`Delete teacher ${t.name}`}
                className="p-1.5 rounded-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
                title="Tirtir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
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
    <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#0a0a0a] text-[10px] uppercase font-mono tracking-wider text-[#737373] border-b border-[#ffffff10]">
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
        <tbody className="divide-y divide-[#ffffff05] text-[#d4d4d4]">
          {staff.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-[#525252]">
                Ma jiraan shaqaale la helay
              </td>
            </tr>
          ) : (
            staff.map((s) => (
              <tr key={s.id} className="hover:bg-[#ffffff02] transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-[#f5f5f5]">{s.name}</div>
                  <div className="text-[10px] text-[#525252] font-mono">{s.employeeId}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 bg-[#7c3aed]/10 border border-[#7c3aed]/30 text-[#c4b5fd] rounded-sm text-[10px] font-semibold">
                    {s.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#a3a3a3]">{s.department || '-'}</td>
                <td className="py-3 px-4 font-mono text-[11px]">
                  <div>{s.phone}</div>
                  {s.email && <div className="text-[10px] text-[#525252]">{s.email}</div>}
                </td>
                <td className="py-3 px-4 font-mono font-bold text-[#f5f5f5]">
                  {currency} {s.salary}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold ${
                      s.employmentStatus === 'Full-Time'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                    }`}
                  >
                    {s.employmentStatus}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditStaff(s)}
                      aria-label={`Edit staff ${s.name}`}
                      className="p-1 rounded-sm text-[#a3a3a3] hover:text-white hover:bg-[#ffffff05]"
                      title="Tafatir"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteStaffClick(s)}
                      aria-label={`Delete staff ${s.name}`}
                      className="p-1 rounded-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
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
      <div className="col-span-full py-16 text-center border border-dashed border-[#ffffff10] rounded-sm">
        <Users className="w-10 h-10 text-[#525252] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#a3a3a3]">
          Ma jiraan waalidiin diiwaangashan
        </p>
        <p className="text-xs text-[#525252] mt-1">
          Guji batoonka sare si aad ugu darto waalid
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {guardians.map((g) => (
        <div
          key={g.id}
          className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-5 flex flex-col justify-between hover:border-[#7c3aed]/50 transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#f5f5f5] leading-tight">{g.name}</h3>
                <p className="text-[10px] text-[#737373] font-mono mt-0.5">
                  {g.guardianId} • {g.relationship}
                </p>
              </div>
              {g.whatsapp && (
                <a
                  href={`https://wa.me/${g.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 px-2 py-1 rounded-sm hover:bg-emerald-900/50 transition-colors"
                  title="Ku fur WhatsApp"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-1 text-xs pt-2 border-t border-[#ffffff05] text-[#a3a3a3]">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#525252]" />
                <span className="font-mono text-[11px]">{g.phone}</span>
              </div>
              {g.address && <p className="text-[11px] text-[#737373] mt-1">📍 {g.address}</p>}
              {g.occupation && <p className="text-[11px] text-[#737373]">💼 {g.occupation}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[#ffffff05]">
            <button
              type="button"
              onClick={() => onEditGuardian(g)}
              aria-label={`Edit guardian ${g.name}`}
              className="p-1.5 rounded-sm text-[#a3a3a3] hover:text-white hover:bg-[#ffffff05] transition-colors"
              title="Tafatir"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteGuardianClick(g)}
              aria-label={`Delete guardian ${g.name}`}
              className="p-1.5 rounded-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
              title="Tirtir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
