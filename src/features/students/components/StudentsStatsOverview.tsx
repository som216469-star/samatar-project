import React from 'react';
import {
  Users,
  CheckCircle2,
  UserX,
  Archive,
  Sparkles,
  PhoneCall,
  Wallet
} from 'lucide-react';
import { Student } from '../../../types';
import { StudentSubSection } from '../../../app/navigationConfig';
import { StatCard } from '../../../components/ui/primitives';

export interface StudentComputedStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  newThisMonth?: number;
  newlyRegistered?: number;
  maleCount?: number;
  femaleCount?: number;
  male?: number;
  female?: number;
  missingGuardian?: number;
  missingGuardianCount?: number;
  needsAttention?: number;
  unpaidStudentsCount?: number;
  unpaidFeesCount?: number;
  classBreakdown?: Record<string, number>;
  byClass?: Array<{ className: string; count: number }>;
  recentlyAdded?: Student[];
  recentlyUpdated?: Student[];
}

export interface StudentsStatsOverviewProps {
  stats: StudentComputedStats;
  subSection?: StudentSubSection;
  missingGuardianOnly?: boolean;
  feeStatusFilter?: string;
  classFilter?: string;
  onSubSectionChange?: (sub: StudentSubSection) => void;
  onNavigateSubSection?: (sub: StudentSubSection) => void;
  onToggleMissingGuardian?: () => void;
  onToggleUnpaidFilter?: () => void;
  onToggleClassFilter?: (className: string) => void;
  setSelectedStatusFilter?: (val: string) => void;
  selectedRegDateFilter?: string;
  setSelectedRegDateFilter?: (val: string) => void;
  selectedFeeFilter?: string;
  setSelectedFeeFilter?: (val: string) => void;
  selectedClassFilter?: string;
  setSelectedClassFilter?: (val: string) => void;
  showDashboardDetails?: boolean;
  setShowDashboardDetails?: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenProfile?: (student: Student) => void;
  canViewFinance?: boolean;
}

export const StudentsStatsOverview: React.FC<StudentsStatsOverviewProps> = ({
  stats,
  subSection = 'all',
  missingGuardianOnly = false,
  feeStatusFilter,
  classFilter,
  onSubSectionChange,
  onNavigateSubSection,
  onToggleMissingGuardian,
  onToggleUnpaidFilter,
  onToggleClassFilter,
  setSelectedStatusFilter,
  selectedRegDateFilter,
  setSelectedRegDateFilter,
  selectedFeeFilter,
  setSelectedFeeFilter,
  selectedClassFilter,
  setSelectedClassFilter,
  canViewFinance = true
}) => {
  const safeStats = stats || {
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0
  };

  const maleCount = safeStats.maleCount ?? safeStats.male ?? 0;
  const femaleCount = safeStats.femaleCount ?? safeStats.female ?? 0;
  const newThisMonth = safeStats.newThisMonth ?? safeStats.newlyRegistered ?? 0;
  const missingGuardian =
    safeStats.missingGuardianCount ?? safeStats.missingGuardian ?? safeStats.needsAttention ?? 0;
  const unpaidCount = safeStats.unpaidStudentsCount ?? safeStats.unpaidFeesCount ?? 0;

  const activeClassFilter = classFilter ?? selectedClassFilter ?? 'all';
  const activeFeeFilter = feeStatusFilter ?? selectedFeeFilter ?? 'all';

  const handleNavigateSub = (target: StudentSubSection) => {
    if (onSubSectionChange) onSubSectionChange(target);
    else if (onNavigateSubSection) onNavigateSubSection(target);
    if (setSelectedStatusFilter) {
      setSelectedStatusFilter(target === 'all' ? 'all' : target);
    }
  };

  const handleClassClick = (cls: string) => {
    if (onToggleClassFilter) {
      onToggleClassFilter(cls);
    } else if (setSelectedClassFilter) {
      setSelectedClassFilter(cls === 'All' ? 'all' : activeClassFilter === cls ? 'all' : cls);
    }
  };

  const handleUnpaidClick = () => {
    if (onToggleUnpaidFilter) {
      onToggleUnpaidFilter();
    } else if (setSelectedFeeFilter) {
      setSelectedFeeFilter(activeFeeFilter === 'unpaid' ? 'all' : 'unpaid');
    }
  };

  const handleAttentionClick = () => {
    if (onToggleMissingGuardian) {
      onToggleMissingGuardian();
    } else if (setSelectedFeeFilter) {
      setSelectedFeeFilter(activeFeeFilter === 'unpaid' ? 'all' : 'unpaid');
    }
  };

  const handleNewThisMonthClick = () => {
    if (setSelectedRegDateFilter) {
      setSelectedRegDateFilter(selectedRegDateFilter === 'this_month' ? 'all' : 'this_month');
    }
  };

  // Normalize class entries from either stats.classBreakdown or stats.byClass safely
  const classEntries: Array<[string, number]> = React.useMemo(() => {
    if (safeStats.classBreakdown && typeof safeStats.classBreakdown === 'object') {
      return Object.entries(safeStats.classBreakdown);
    }
    if (Array.isArray(safeStats.byClass)) {
      return safeStats.byClass.map((item) => [item.className, item.count]);
    }
    return [];
  }, [safeStats.classBreakdown, safeStats.byClass]);

  const isAllClassesActive =
    activeClassFilter === 'All' || activeClassFilter === 'all' || !activeClassFilter;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          label="Wadarta Ardayda"
          value={safeStats.total ?? 0}
          sublabel={`${maleCount} Lab · ${femaleCount} Dhedig`}
          tone="brand"
          icon={<Users className="w-4 h-4" />}
          onClick={() => handleNavigateSub('all')}
        />

        <StatCard
          label="Active"
          value={safeStats.active ?? 0}
          sublabel={subSection === 'active' ? 'Waa la xulay' : 'Ardayda dhigata'}
          tone="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          onClick={() => handleNavigateSub('active')}
        />

        <StatCard
          label="Inactive"
          value={safeStats.inactive ?? 0}
          sublabel={subSection === 'inactive' ? 'Waa la xulay' : 'Hakad ku jira'}
          tone="danger"
          icon={<UserX className="w-4 h-4" />}
          onClick={() => handleNavigateSub('inactive')}
        />

        <StatCard
          label="Archived"
          value={safeStats.archived ?? 0}
          sublabel={subSection === 'archived' ? 'Waa la xulay' : 'La kaydiyey'}
          tone="neutral"
          icon={<Archive className="w-4 h-4" />}
          onClick={() => handleNavigateSub('archived')}
        />

        <StatCard
          label="Cusub Bishan"
          value={newThisMonth}
          sublabel={selectedRegDateFilter === 'this_month' ? 'Filter Active' : 'Bishan'}
          tone="info"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={handleNewThisMonthClick}
        />

        <StatCard
          label="Telefoonka Waalidka"
          value={missingGuardian}
          sublabel={missingGuardianOnly ? 'Filter Active' : 'Telefoon maqan'}
          tone="warning"
          icon={<PhoneCall className="w-4 h-4" />}
          onClick={handleAttentionClick}
        />

        {canViewFinance && (
        <StatCard
          label="Baaqi Lacageed"
          value={unpaidCount}
          sublabel={activeFeeFilter === 'unpaid' ? 'Filter Active' : 'Biil aan la bixin'}
          tone="danger"
          icon={<Wallet className="w-4 h-4" />}
          onClick={handleUnpaidClick}
        />
        )}

      </div>

      {/* Quick Class Breakdown Strip */}
      {classEntries.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] shrink-0 mr-1">
            Fasallada:
          </span>
          <button
            type="button"
            onClick={() => handleClassClick('All')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 border cursor-pointer ${
              isAllClassesActive
                ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Dhammaan ({safeStats.total ?? 0})
          </button>
          {classEntries.map(([cls, count]) => (
            <button
              key={cls}
              type="button"
              onClick={() => handleClassClick(cls)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                activeClassFilter === cls
                  ? 'bg-[var(--color-brand-soft)] border-[var(--color-brand-border)] text-[var(--color-brand)] font-semibold'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <span>{cls}</span>
              <span className="px-1.5 py-0.2 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] font-bold tabular-nums text-[10px]">
                {count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
