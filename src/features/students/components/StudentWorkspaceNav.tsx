import React from 'react';
import { Users, UserPlus, UserCheck, UserX, Archive, Upload, Download } from 'lucide-react';
import { StudentSubSection, getStudentPermissions } from '../../../app/navigationConfig';
import { Badge } from '../../../components/ui/primitives';

interface StudentWorkspaceNavProps {
  active: StudentSubSection;
  onNavigate: (subSection: StudentSubSection) => void;
  counts: { total?: number; active?: number; inactive?: number; archived?: number };
  role?: string | null;
}

const ITEMS: Array<{
  id: StudentSubSection;
  label: string;
  description: string;
  icon: React.ElementType;
  countKey?: 'total' | 'active' | 'inactive' | 'archived';
  tone?: 'brand' | 'success' | 'warning' | 'neutral';
}> = [
  { id: 'all', label: 'All Students', description: 'Full roster', icon: Users, countKey: 'total', tone: 'brand' },
  { id: 'add', label: 'Add Student', description: 'New enrollment', icon: UserPlus },
  { id: 'active', label: 'Active', description: 'Currently enrolled', icon: UserCheck, countKey: 'active', tone: 'success' },
  { id: 'inactive', label: 'Inactive', description: 'On hold / paused', icon: UserX, countKey: 'inactive', tone: 'warning' },
  { id: 'archived', label: 'Archived', description: 'Historical records', icon: Archive, countKey: 'archived', tone: 'neutral' },
  { id: 'import', label: 'Import', description: 'Excel / CSV', icon: Upload },
  { id: 'export', label: 'Export', description: 'Reports & files', icon: Download }
];

export const StudentWorkspaceNav: React.FC<StudentWorkspaceNavProps> = ({
  active,
  onNavigate,
  counts,
  role
}) => {
  const permissions = getStudentPermissions(role || 'admin');
  const allowed = ITEMS.filter((item) => {
    if (item.id === 'add') return permissions.canCreate;
    if (item.id === 'import') return permissions.canBulkManage;
    if (item.id === 'export') return permissions.canExport;
    return permissions.canView;
  });

  return (
    <div className="ds-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/45">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand)] shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]">Student Workspace</p>
            <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">Directory, enrollment & records</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex text-[10px] font-mono text-[var(--color-text-muted)]">{counts.total ?? 0} records</span>
      </div>
      <div className="p-2.5 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {allowed.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const count = item.countKey ? counts[item.countKey] : undefined;
            const tone =
              item.tone === 'success'
                ? 'text-[var(--color-success)] bg-[var(--color-success-soft)] border-[var(--color-success-border)]'
                : item.tone === 'warning'
                ? 'text-[var(--color-warning)] bg-[var(--color-warning-soft)] border-[var(--color-warning-border)]'
                : item.tone === 'neutral'
                ? 'text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)] border-[var(--color-border)]'
                : 'text-[var(--color-brand)] bg-[var(--color-brand-soft)] border-[var(--color-brand-border)]';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left min-w-[150px] transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white shadow-md shadow-[var(--color-brand)]/20'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] hover:-translate-y-px'
                }`}
              >
                <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/12 border-white/15 text-white' : tone
                }`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[11px] font-bold truncate ${
                    isActive ? 'text-white' : 'text-[var(--color-text-primary)]'
                  }`}>{item.label}</span>
                  <span className={`block text-[10px] truncate ${
                    isActive ? 'text-white/70' : 'text-[var(--color-text-muted)]'
                  }`}>{item.description}</span>
                </span>
                {count !== undefined && (
                  <Badge dot={false} variant={isActive ? 'neutral' : (item.tone || 'neutral')} className={isActive ? 'bg-white/12 border-white/15 text-white' : ''}>
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentWorkspaceNav;
