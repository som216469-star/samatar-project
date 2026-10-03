import React from 'react';
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Clock3,
  UserRoundSearch,
  School,
  BarChart3,
  FileBarChart2
} from 'lucide-react';
import { AttendanceSubSection } from '../../../app/navigationConfig';

interface AttendanceWorkspaceNavProps {
  activeSection: AttendanceSubSection;
  onChange: (section: AttendanceSubSection) => void;
  canManage: boolean;
  totalRecords: number;
}

const items: Array<{
  id: AttendanceSubSection;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  manageOnly?: boolean;
}> = [
  { id: 'overview', label: 'Overview', subLabel: 'Today at a glance', icon: LayoutDashboard },
  { id: 'take', label: 'Take Attendance', subLabel: 'Mark roll call', icon: ListChecks, manageOnly: true },
  { id: 'daily', label: 'Daily Register', subLabel: 'Class-by-class', icon: CalendarDays },
  { id: 'history', label: 'History', subLabel: 'Past sessions', icon: Clock3 },
  { id: 'students', label: 'Students', subLabel: 'Individual records', icon: UserRoundSearch },
  { id: 'classes', label: 'Classes', subLabel: 'Class performance', icon: School },
  { id: 'analytics', label: 'Analytics', subLabel: 'Trends & patterns', icon: BarChart3 },
  { id: 'reports', label: 'Reports', subLabel: 'Export & summaries', icon: FileBarChart2 }
];

export const AttendanceWorkspaceNav: React.FC<AttendanceWorkspaceNavProps> = ({
  activeSection,
  onChange,
  canManage,
  totalRecords
}) => {
  const visibleItems = items.filter((item) => !item.manageOnly || canManage);

  return (
    <div className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-2 shadow-sm">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={[
                'group min-w-[148px] flex-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                active
                  ? 'border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] shadow-sm'
                  : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]'
              ].join(' ')}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    active
                      ? 'border-[var(--color-brand)]/20 bg-[var(--color-brand)]/10 text-[var(--color-brand)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-[var(--color-text-primary)]">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-[var(--color-text-muted)]">
                    {item.subLabel}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 border-t border-[var(--color-border)] px-2 pt-2 text-[10px] font-medium text-[var(--color-text-muted)]">
        {totalRecords.toLocaleString()} recorded attendance entries
      </div>
    </div>
  );
};
