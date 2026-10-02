import React from 'react';
import {
  Search,
  X,
  PhoneCall,
  List,
  LayoutGrid,
  ArrowRightLeft,
  Activity,
  Archive,
  Trash2,
  Download
} from 'lucide-react';
import { SchoolClass } from '../../../types';
import { StudentSubSection } from '../../../app/navigationConfig';
import { Button, Card } from '../../../components/ui/primitives';

export interface StudentsFilterToolbarProps {
  subSection?: StudentSubSection;
  searchQuery: string;
  onSearchChange?: (val: string) => void;
  setSearchQuery?: (val: string) => void;
  classFilter?: string;
  selectedClassFilter?: string;
  onClassFilterChange?: (val: string) => void;
  setSelectedClassFilter?: (val: string) => void;
  selectedStatusFilter?: string;
  setSelectedStatusFilter?: (val: string) => void;
  genderFilter?: string;
  selectedGenderFilter?: string;
  onGenderFilterChange?: (val: any) => void;
  setSelectedGenderFilter?: (val: any) => void;
  selectedRegDateFilter?: string;
  setSelectedRegDateFilter?: (val: string) => void;
  feeStatusFilter?: string;
  selectedFeeFilter?: string;
  onFeeStatusFilterChange?: (val: any) => void;
  setSelectedFeeFilter?: (val: any) => void;
  missingGuardianOnly?: boolean;
  onToggleMissingGuardian?: () => void;
  sortBy: string;
  onSortByChange?: (val: any) => void;
  setSortBy?: (val: any) => void;
  viewMode?: 'table' | 'grid' | 'cards';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
  onClearAllFilters?: () => void;
  onResetAllFilters?: () => void;
  onOpenFiltersDrawer?: () => void;
  showColumnConfig?: boolean;
  setShowColumnConfig?: (val: boolean) => void;
  visibleColumns?: any;
  setVisibleColumns?: (val: any) => void;
  filteredStudentsCount?: number;
  classes: SchoolClass[];
  selectedStudentIdsCount?: number;
  selectedStudentIds?: string[];
  onClearSelection: () => void;
  pageSize?: number;
  setPageSize?: (val: number) => void;
  onOpenBulkAction?: (action: 'change_class' | 'change_status' | 'archive' | 'delete') => void;
  onOpenBulkChangeClass?: () => void;
  onOpenBulkChangeStatus?: () => void;
  onBulkExportSelected?: () => void;
  onOpenBulkArchive?: () => void;
  onOpenBulkDelete?: () => void;
  canBulkManage?: boolean;
  canDeleteStudents?: boolean;
  canUpdateStudents?: boolean;
  canViewFinance?: boolean;
}

export const StudentsFilterToolbar: React.FC<StudentsFilterToolbarProps> = ({
  searchQuery = '',
  onSearchChange,
  setSearchQuery,
  classFilter,
  selectedClassFilter,
  onClassFilterChange,
  setSelectedClassFilter,
  genderFilter,
  selectedGenderFilter,
  onGenderFilterChange,
  setSelectedGenderFilter,
  feeStatusFilter,
  selectedFeeFilter,
  onFeeStatusFilterChange,
  setSelectedFeeFilter,
  missingGuardianOnly = false,
  onToggleMissingGuardian,
  sortBy = 'name_asc',
  onSortByChange,
  setSortBy,
  viewMode = 'table',
  onViewModeChange,
  hasActiveFilters,
  activeFilterCount = 0,
  onClearAllFilters,
  onResetAllFilters,
  classes = [],
  selectedStudentIdsCount,
  selectedStudentIds,
  onClearSelection,
  onOpenBulkAction,
  onOpenBulkChangeClass,
  onOpenBulkChangeStatus,
  onBulkExportSelected,
  onOpenBulkArchive,
  onOpenBulkDelete,
  canBulkManage = true,
  canDeleteStudents = true,
  canUpdateStudents = true,
  canViewFinance = true
}) => {
  const resolvedSearchChange = onSearchChange || setSearchQuery || (() => {});
  const resolvedClass = classFilter ?? selectedClassFilter ?? 'all';
  const resolvedClassChange = onClassFilterChange || setSelectedClassFilter || (() => {});
  const resolvedGender = genderFilter ?? selectedGenderFilter ?? 'all';
  const resolvedGenderChange = onGenderFilterChange || setSelectedGenderFilter || (() => {});
  const resolvedFee = feeStatusFilter ?? selectedFeeFilter ?? 'all';
  const resolvedFeeChange = onFeeStatusFilterChange || setSelectedFeeFilter || (() => {});
  const resolvedSortChange = onSortByChange || setSortBy || (() => {});
  const resolvedClearAll = onClearAllFilters || onResetAllFilters || (() => {});
  const resolvedHasFilters = Boolean(hasActiveFilters ?? activeFilterCount > 0);
  const resolvedSelectedCount =
    selectedStudentIdsCount ?? (Array.isArray(selectedStudentIds) ? selectedStudentIds.length : 0);

  const triggerBulkAction = (action: 'change_class' | 'change_status' | 'archive' | 'delete') => {
    if (onOpenBulkAction) {
      onOpenBulkAction(action);
      return;
    }
    if (action === 'change_class' && onOpenBulkChangeClass) onOpenBulkChangeClass();
    else if (action === 'change_status' && onOpenBulkChangeStatus) onOpenBulkChangeStatus();
    else if (action === 'archive' && onOpenBulkArchive) onOpenBulkArchive();
    else if (action === 'delete' && onOpenBulkDelete) onOpenBulkDelete();
  };

  return (
    <div className="space-y-3">
      <Card padding="sm" className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Ku raadi magac, ID, waalid, ama telefoon..."
              value={searchQuery}
              onChange={(e) => resolvedSearchChange(e.target.value)}
              className="w-full ds-input pl-9 pr-8 py-2"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => resolvedSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Class Filter */}
          <div className="lg:col-span-2">
            <select
              value={resolvedClass}
              onChange={(e) => resolvedClassChange(e.target.value)}
              aria-label="Filter by class"
              className="w-full ds-input py-2"
            >
              <option value="all">Dhammaan Fasallada</option>
              {classes.map((c) => (
                <option key={c.id} value={c.className}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div className="lg:col-span-2">
            <select
              value={resolvedGender}
              onChange={(e) => resolvedGenderChange(e.target.value)}
              aria-label="Filter by gender"
              className="w-full ds-input py-2"
            >
              <option value="all">Lab & Dhedig (All)</option>
              <option value="Male">Lab (Male)</option>
              <option value="Female">Dhedig (Female)</option>
            </select>
          </div>

          {canViewFinance && (
                      {/* Fee Status Filter */}
                      <div className="lg:col-span-2">
                        <select
                          value={resolvedFee}
                          onChange={(e) => resolvedFeeChange(e.target.value)}
                          aria-label="Filter by fee status"
                          className="w-full ds-input py-2"
                        >
                          <option value="all">Xaaladda Lacagta (All)</option>
                          <option value="paid">La Bixiyey (Paid)</option>
                          <option value="partial">Qayb Dhiman (Partial)</option>
                          <option value="unpaid">Aan Bixinin (Unpaid)</option>
                        </select>
                      </div>


          )}

          {/* Sort By */}
          <div className="lg:col-span-2 flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => resolvedSortChange(e.target.value)}
              aria-label="Sort students"
              className="w-full ds-input py-2"
            >
              <option value="name_asc">Magaca (A → Z)</option>
              <option value="name_desc">Magaca (Z → A)</option>
              <option value="date_desc">Kuwii Ugu Dambeeyey</option>
              <option value="date_asc">Kuwii Ugu Horreeyey</option>
              <option value="class">Fasalka (A → Z)</option>
            </select>

            {onViewModeChange && (
              <div className="flex items-center bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-md p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewModeChange('table')}
                  aria-label="Table view"
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('grid')}
                  aria-label="Grid view"
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode !== 'table'
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Pills */}
        {resolvedHasFilters && (
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[var(--color-text-muted)] font-medium mr-1">
                Shaandhaynta Firfircoon:
              </span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)] border border-[var(--color-brand-border)]">
                  Raadin: &ldquo;{searchQuery}&rdquo;
                  <button type="button" onClick={() => resolvedSearchChange('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {resolvedClass !== 'All' && resolvedClass !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                  Fasal: {resolvedClass}
                  <button type="button" onClick={() => resolvedClassChange('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {resolvedGender !== 'All' && resolvedGender !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                  Jinsi: {resolvedGender}
                  <button type="button" onClick={() => resolvedGenderChange('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {resolvedFee !== 'All' && resolvedFee !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning-border)]">
                  Lacagta: {resolvedFee}
                  <button type="button" onClick={() => resolvedFeeChange('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {missingGuardianOnly && onToggleMissingGuardian && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning-border)]">
                  <PhoneCall className="w-3 h-3" /> Waalid La&apos;aan
                  <button type="button" onClick={onToggleMissingGuardian}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resolvedClearAll}
              className="text-xs text-[var(--color-danger)] hover:underline font-semibold cursor-pointer"
            >
              Masax Dhammaan (Reset)
            </button>
          </div>
        )}
      </Card>

      {/* Bulk Action Bar */}
      {resolvedSelectedCount > 0 && (
        <div className="bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] rounded-lg px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-[var(--color-brand)] text-white font-mono text-xs font-bold tabular-nums">
              {resolvedSelectedCount}
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              Arday ayaa la xulay (Selected)
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline cursor-pointer"
            >
              Ka noqo xulashada
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canBulkManage && (
              <>
                <Button
                  size="xs"
                  variant="secondary"
                  leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                  onClick={() => triggerBulkAction('change_class')}
                >
                  Beddel Fasalka
                </Button>

                <Button
                  size="xs"
                  variant="secondary"
                  leftIcon={<Activity className="w-3.5 h-3.5" />}
                  onClick={() => triggerBulkAction('change_status')}
                >
                  Beddel Status
                </Button>
              </>
            )}

            {onBulkExportSelected && (
              <Button
                size="xs"
                variant="secondary"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={onBulkExportSelected}
              >
                Dhoofi (Export)
              </Button>
            )}

            {canUpdateStudents && (
              <Button
                size="xs"
                variant="secondary"
                leftIcon={<Archive className="w-3.5 h-3.5" />}
                onClick={() => triggerBulkAction('archive')}
              >
                Kaydi (Archive)
              </Button>
            )}

            {canDeleteStudents && (
              <Button
                size="xs"
                variant="danger"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => triggerBulkAction('delete')}
              >
                Tirtir (Delete)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
