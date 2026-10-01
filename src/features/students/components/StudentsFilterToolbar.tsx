import React from 'react';
import {
  Search,
  X,
  Filter,
  Layers,
  RotateCcw,
  Download,
  Archive,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SchoolClass } from '../../../types';
import { StudentSubSection } from '../../../app/navigationConfig';

interface StudentsFilterToolbarProps {
  subSection: StudentSubSection;
  classes: SchoolClass[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedClassFilter: string;
  setSelectedClassFilter: (val: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (val: string) => void;
  selectedGenderFilter: string;
  setSelectedGenderFilter: (val: string) => void;
  selectedRegDateFilter: string;
  setSelectedRegDateFilter: (val: string) => void;
  selectedFeeFilter: string;
  setSelectedFeeFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: any) => void;
  activeFilterCount: number;
  onOpenFiltersDrawer: () => void;
  showColumnConfig: boolean;
  setShowColumnConfig: (val: boolean) => void;
  visibleColumns: Record<string, boolean>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onResetAllFilters: () => void;
  filteredStudentsCount: number;
  selectedStudentIds: string[];
  onClearSelection: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  onOpenBulkChangeClass: () => void;
  onOpenBulkChangeStatus: () => void;
  onBulkExportSelected: () => void;
  onOpenBulkArchive: () => void;
  onOpenBulkDelete: () => void;
}

export const StudentsFilterToolbar: React.FC<StudentsFilterToolbarProps> = ({
  subSection,
  classes,
  searchQuery,
  setSearchQuery,
  selectedClassFilter,
  setSelectedClassFilter,
  selectedStatusFilter,
  setSelectedStatusFilter,
  selectedGenderFilter,
  setSelectedGenderFilter,
  selectedRegDateFilter,
  setSelectedRegDateFilter,
  selectedFeeFilter,
  setSelectedFeeFilter,
  sortBy,
  setSortBy,
  activeFilterCount,
  onOpenFiltersDrawer,
  showColumnConfig,
  setShowColumnConfig,
  visibleColumns,
  setVisibleColumns,
  onResetAllFilters,
  filteredStudentsCount,
  selectedStudentIds,
  onClearSelection,
  pageSize,
  setPageSize,
  onOpenBulkChangeClass,
  onOpenBulkChangeStatus,
  onBulkExportSelected,
  onOpenBulkArchive,
  onOpenBulkDelete
}) => {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedClassFilter !== 'all' ||
    selectedStatusFilter !== 'all' ||
    selectedGenderFilter !== 'all' ||
    selectedFeeFilter !== 'all' ||
    selectedRegDateFilter !== 'all';

  return (
    <>
      {/* 3. ADVANCED SEARCH, FILTER & ACTION BAR */}
      <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ku raadi Magac, ID, Fasal, Taleefanka waalidka, Roll Number..."
              aria-label="Search students"
              className="w-full pl-10 pr-9 py-2 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed] placeholder-[#555555]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-1 text-[#737373] hover:text-white"
                title="Clear Search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Filter Drawer Trigger + Quick Filters */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={onOpenFiltersDrawer}
              className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#ffffff15] rounded-sm text-xs text-[#e5e5e5] flex items-center justify-center gap-2 font-semibold"
            >
              <Filter className="w-3.5 h-3.5 text-[#7c3aed]" />
              <span>Filter & Sort</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 bg-[#7c3aed] text-white text-[10px] font-mono rounded-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="px-3 py-2 bg-[#0a0a0a] border border-[#ffffff15] rounded-sm text-xs text-[#cccccc] flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[#c4b5fd]" />
              <span>Cols</span>
            </button>
          </div>

          {/* Desktop Quick Filters */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {/* Class Filter */}
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              aria-label="Filter by Class"
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Dhammaan Fasallada (All Classes)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.className}>
                  {c.className}
                </option>
              ))}
            </select>

            {/* Status Filter (Only shown on 'all' subsection) */}
            {subSection === 'all' && (
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                aria-label="Filter by Status"
                className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
              >
                <option value="all">Dhammaan Xaaladaha (All Status)</option>
                <option value="active">Active (Firfircoon)</option>
                <option value="inactive">Inactive (Aan Firfircoonayn)</option>
                <option value="archived">Archived (La Kaydiyey)</option>
              </select>
            )}

            {/* Gender Filter */}
            <select
              value={selectedGenderFilter}
              onChange={(e) => setSelectedGenderFilter(e.target.value)}
              aria-label="Filter by Gender"
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Lab & Dhedig (All Genders)</option>
              <option value="Male">Wiilal (Male)</option>
              <option value="Female">Gabdho (Female)</option>
            </select>

            {/* Registration Date Filter */}
            <select
              value={selectedRegDateFilter}
              onChange={(e) => setSelectedRegDateFilter(e.target.value)}
              aria-label="Filter by Registration Date"
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Taariikhda Qorista (All Dates)</option>
              <option value="today">Maanta La Qoray (Today)</option>
              <option value="this_month">Bishan La Qoray (This Month)</option>
              <option value="this_year">Sanadkan (This Year)</option>
            </select>

            {/* Fee / Attention Filter */}
            <select
              value={selectedFeeFilter}
              onChange={(e) => setSelectedFeeFilter(e.target.value)}
              aria-label="Filter by Fee Status"
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="all">Biilka Bisha (All Fee Status)</option>
              <option value="paid">Lacagta La Bixiyey (Paid)</option>
              <option value="partial">Qabyo (Partial)</option>
              <option value="unpaid">Aan La Bixin (Unpaid)</option>
              <option value="attention">U Baahan Fiiro (Needs Attention)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort Students"
              className="px-3 py-2 bg-[#0a0a0a] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm focus:outline-none focus:border-[#7c3aed]"
            >
              <option value="name_asc">Magaca (A - Z)</option>
              <option value="name_desc">Magaca (Z - A)</option>
              <option value="id_asc">Student ID (A - Z)</option>
              <option value="date_desc">Taariikhda Qorista (Newest)</option>
              <option value="date_asc">Taariikhda Qorista (Oldest)</option>
              <option value="updated_desc">Ugu Dambeeyey Cusbooneysiin</option>
              <option value="class">Fasalka (Class)</option>
            </select>

            {/* Column Visibility Control */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className="px-3 py-2 bg-[#0a0a0a] hover:bg-[#ffffff08] text-xs text-[#cccccc] border border-[#ffffff10] rounded-sm flex items-center gap-1.5"
                title="Customize Table Columns"
              >
                <Layers className="w-3.5 h-3.5 text-[#c4b5fd]" />
                <span className="hidden sm:inline">Tiirarka (Columns)</span>
              </button>
              {showColumnConfig && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#141414] border border-[#ffffff15] rounded-sm shadow-2xl p-3 z-40 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-[#ffffff10] pb-1.5">
                    <span className="text-[10px] font-mono uppercase text-[#888888] font-bold">
                      Muujinta Tiirarka
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowColumnConfig(false)}
                      className="text-[#737373] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {[
                    { key: 'id', label: 'Student ID & Roll' },
                    { key: 'class', label: 'Fasalka (Class)' },
                    { key: 'gender', label: 'Jinsiga (Gender)' },
                    { key: 'guardian', label: 'Waalidka (Guardian)' },
                    { key: 'fees', label: 'Biilka Bisha (Fees)' },
                    { key: 'status', label: 'Xaaladda (Status)' },
                    { key: 'regDate', label: 'Registration Date' },
                    { key: 'updated', label: 'Last Updated' }
                  ].map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer text-[#d4d4d4] hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key] !== false}
                        onChange={(e) =>
                          setVisibleColumns((prev: any) => ({
                            ...prev,
                            [col.key]: e.target.checked
                          }))
                        }
                        className="rounded-xs accent-[#7c3aed]"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetAllFilters}
                className="px-2.5 py-2 text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 bg-rose-500/10 rounded-sm flex items-center gap-1"
                title="Reset All Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Results Summary & Page Size */}
        <div className="flex items-center justify-between text-[11px] text-[#737373] pt-2 border-t border-[#ffffff08]">
          <div className="flex items-center gap-2">
            <span>
              Waxaa la helay <strong className="text-white font-mono">{filteredStudentsCount}</strong>{' '}
              arday
            </span>
            {selectedStudentIds.length > 0 && (
              <span className="text-[#c4b5fd] font-bold">
                ({selectedStudentIds.length} la doortay)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Boggii:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Page Size"
                className="bg-[#0a0a0a] text-[11px] text-[#cccccc] border border-[#ffffff15] px-1.5 py-0.5 rounded-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BULK ACTIONS TOOLBAR (Appears when items are selected) */}
      <AnimatePresence>
        {selectedStudentIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#1e1435] border border-[#7c3aed]/40 rounded-sm p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#7c3aed] text-white flex items-center justify-center font-bold text-xs font-mono">
                {selectedStudentIds.length}
              </span>
              <div>
                <p className="text-xs font-bold text-white">
                  Arday ayaa la doortay (Students Selected)
                </p>
                <p className="text-[10px] text-[#c4b5fd]">
                  Dooro hawsha aad rabto inaad wadajir ugu fuliso
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Change Class */}
              <button
                type="button"
                onClick={onOpenBulkChangeClass}
                className="px-3 py-1.5 rounded-sm bg-[#ffffff10] hover:bg-[#ffffff20] text-xs font-semibold text-white transition-colors"
              >
                U wareeji Fasal Cusub
              </button>

              {/* Bulk Change Status */}
              <button
                type="button"
                onClick={onOpenBulkChangeStatus}
                className="px-3 py-1.5 rounded-sm bg-[#ffffff10] hover:bg-[#ffffff20] text-xs font-semibold text-white transition-colors"
              >
                Beddel Status
              </button>

              {/* Bulk Export Selected */}
              <button
                type="button"
                onClick={onBulkExportSelected}
                className="px-3 py-1.5 rounded-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Dhoofi kuwa la doortay
              </button>

              {/* Bulk Archive */}
              <button
                type="button"
                onClick={onOpenBulkArchive}
                className="px-3 py-1.5 rounded-sm bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Kaydi (Archive)
              </button>

              {/* Bulk Delete */}
              <button
                type="button"
                onClick={onOpenBulkDelete}
                className="px-3 py-1.5 rounded-sm bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tirtir (Delete)
              </button>

              {/* Clear Selection */}
              <button
                type="button"
                onClick={onClearSelection}
                className="p-1.5 text-[#a3a3a3] hover:text-white"
                title="Clear Selection"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
