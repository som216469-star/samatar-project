import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Users,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  Edit2,
  RotateCcw,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Student } from '../../../types';
import { Badge, Button, Card, EmptyState } from '../../../components/ui/primitives';

export interface StudentFeeSummary {
  status: 'paid' | 'partial' | 'unpaid' | string;
  totalBilled?: number;
  totalPaid?: number;
  amount?: number;
  paid?: number;
  balance: number;
}

export interface StudentsRosterTableProps {
  viewMode: 'table' | 'grid' | 'cards';
  paginatedStudents: Student[];
  filteredStudentsCount: number;
  selectedStudentIds: string[];
  allVisibleSelected?: boolean;
  isAllSelected?: boolean;
  visibleColumns?: Record<string, boolean>;
  copiedPhoneId?: string | null;
  hasActiveFilters?: boolean;
  currency: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  getStudentFeeStatus: (studentId: string) => StudentFeeSummary;
  onToggleSelectAllVisible?: () => void;
  onToggleSelectAll?: () => void;
  onToggleSelectOne: (id: string) => void;
  onCopyPhone?: (phone: string, id: string) => void;
  onOpenProfile: (student: Student) => void;
  onOpenEditModal: (student: Student) => void;
  onQuickStatusChange: (student: Student, status: 'active' | 'inactive' | 'archived') => void;
  onDeleteStudentClick: (student: Student) => void;
  onClearAllFilters?: () => void;
  onOpenAddModal?: () => void;
  onSetPageSize: (size: number) => void;
  onSetCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export const StudentsRosterTable: React.FC<StudentsRosterTableProps> = ({
  viewMode = 'table',
  paginatedStudents = [],
  filteredStudentsCount = 0,
  selectedStudentIds = [],
  allVisibleSelected,
  isAllSelected,
  copiedPhoneId: externalCopiedPhoneId,
  hasActiveFilters = false,
  currency = '$',
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  getStudentFeeStatus,
  onToggleSelectAllVisible,
  onToggleSelectAll,
  onToggleSelectOne,
  onCopyPhone,
  onOpenProfile,
  onOpenEditModal,
  onQuickStatusChange,
  onDeleteStudentClick,
  onClearAllFilters,
  onOpenAddModal,
  onSetPageSize,
  onSetCurrentPage
}) => {
  const [localCopiedId, setLocalCopiedId] = useState<string | null>(null);
  const resolvedCopiedId = externalCopiedPhoneId ?? localCopiedId;
  const resolvedAllSelected = Boolean(allVisibleSelected ?? isAllSelected);
  const handleSelectAll = onToggleSelectAllVisible || onToggleSelectAll || (() => {});
  const columns = {
    id: visibleColumns?.id ?? true,
    class: visibleColumns?.class ?? true,
    gender: visibleColumns?.gender ?? true,
    guardian: visibleColumns?.guardian ?? true,
    status: visibleColumns?.status ?? true,
    fees: visibleColumns?.fees ?? true,
    regDate: visibleColumns?.regDate ?? true,
    updated: visibleColumns?.updated ?? true,
    actions: visibleColumns?.actions ?? true
  };
  const tableColumnCount =
    3 +
    Number(columns.class) +
    Number(columns.gender) +
    Number(columns.guardian) +
    Number(columns.fees) +
    Number(columns.status) +
    Number(columns.regDate) +
    Number(columns.updated) +
    Number(columns.actions);

  const handleCopyPhone = (phone: string, id: string) => {
    if (onCopyPhone) {
      onCopyPhone(phone, id);
      return;
    }
    try {
      navigator.clipboard?.writeText(phone);
      setLocalCopiedId(id);
      setTimeout(() => setLocalCopiedId(null), 1800);
    } catch {}
  };

  return (
    <div className="space-y-4">
      {viewMode === 'table' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      aria-label={
                        resolvedAllSelected ? 'Deselect all students' : 'Select all visible students'
                      }
                      className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      {resolvedAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--color-brand)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 w-10" scope="col">#</th>
                  <th className="px-4 py-3" scope="col">Ardayga (Student)</th>
                  {columns.class && <th className="px-4 py-3" scope="col">Fasalka</th>}
                  {columns.gender && <th className="px-4 py-3" scope="col">Jinsiga</th>}
                  {columns.guardian && (
                    <th className="px-4 py-3" scope="col">Waalidka & Telefoonka</th>
                  )}
                  {columns.fees && <th className="px-4 py-3" scope="col">Biilka</th>}
                  {columns.status && <th className="px-4 py-3" scope="col">Status</th>}
                  {columns.regDate && <th className="px-4 py-3" scope="col">Diiwaangelin</th>}
                  {columns.updated && <th className="px-4 py-3" scope="col">La cusbooneysiiyey</th>}
                  {columns.actions && (
                    <th className="px-4 py-3 text-right" scope="col">Ficilada (Actions)</th>
                  )}
                </tr>
              </thead>
              <tbody className="text-xs">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumnCount} className="py-10">
                      <EmptyState
                        icon={<Users className="w-6 h-6" />}
                        title="Wax arday ah lama helin"
                        description={
                          hasActiveFilters
                            ? 'Ma jiraan arday waafaqsan shaandhaynta aad dooratay.'
                            : 'Weli wax arday ah laguma darin diiwaanka dugsiga.'
                        }
                        action={
                          (hasActiveFilters && onClearAllFilters) || onOpenAddModal ? (
                            <div className="flex items-center gap-2">
                              {hasActiveFilters && onClearAllFilters && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={onClearAllFilters}
                                >
                                  Masax Shaandhaynta
                                </Button>
                              )}
                              {onOpenAddModal && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                                  onClick={onOpenAddModal}
                                >
                                  Arday Cusub
                                </Button>
                              )}
                            </div>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, idx) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    const feeInfo = getStudentFeeStatus
                      ? getStudentFeeStatus(student.id)
                      : { status: 'unpaid', balance: 0 };
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const fullName = student.fullName || 'Unnamed';

                    return (
                      <tr
                        key={student.id}
                        className={isSelected ? 'bg-[var(--color-brand-soft)]' : ''}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onToggleSelectOne(student.id)}
                            aria-label={`Select ${fullName}`}
                            className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--color-brand)]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-3 text-[var(--color-text-muted)] font-mono tabular-nums">
                          {rowNumber}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {student.photo ? (
                              <img
                                src={student.photo}
                                alt={fullName}
                                className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0 cursor-pointer"
                                onClick={() => onOpenProfile(student)}
                              />
                            ) : (
                              <div
                                onClick={() => onOpenProfile(student)}
                                className="w-9 h-9 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] text-[var(--color-brand)] flex items-center justify-center font-bold text-xs uppercase shrink-0 cursor-pointer"
                              >
                                {fullName.trim() ? fullName.trim().charAt(0) : '?'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onOpenProfile(student)}
                                className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand)] transition-colors text-left block truncate max-w-[200px] cursor-pointer"
                              >
                                {fullName}
                              </button>
                              {columns.id && (
                                <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] font-mono">
                                  <span>{student.id}</span>
                                  {student.rollNumber && (
                                    <>
                                      <span>·</span>
                                      <span>Roll #{student.rollNumber}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant="neutral">
                            {student.class}
                            {student.section ? ` (${student.section})` : ''}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant={student.gender === 'Female' ? 'brand' : 'info'}>
                            {student.gender === 'Female' ? 'Dhedig' : 'Lab'}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          {student.guardianPhone || student.guardianName ? (
                            <div className="space-y-0.5">
                              {student.guardianName && (
                                <p className="text-[var(--color-text-primary)] font-medium text-xs truncate max-w-[160px]">
                                  {student.guardianName}
                                </p>
                              )}
                              {student.guardianPhone ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`tel:${student.guardianPhone}`}
                                    className="font-mono text-[11px] text-[var(--color-brand)] hover:underline"
                                  >
                                    {student.guardianPhone}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPhone(student.guardianPhone, student.id)}
                                    aria-label={`Copy phone for ${fullName}`}
                                    className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                                    title="Koobiye Telefoonka"
                                  >
                                    {resolvedCopiedId === student.id ? (
                                      <Check className="w-3 h-3 text-[var(--color-success)]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[var(--color-warning)] flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Telefoon ma jiro
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
                              <AlertTriangle className="w-3 h-3" /> Lama diiwaangelin
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <Badge
                              variant={
                                feeInfo.status === 'paid'
                                  ? 'success'
                                  : feeInfo.status === 'partial'
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {feeInfo.status === 'paid'
                                ? 'La Bixiyey'
                                : feeInfo.status === 'partial'
                                ? 'Qayb'
                                : 'Aan Bixinin'}
                            </Badge>
                            {feeInfo.balance > 0 && (
                              <p className="text-[10px] font-mono tabular-nums text-[var(--color-danger)]">
                                Baaqi: {currency} {feeInfo.balance}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            dot
                            variant={
                              student.status === 'active'
                                ? 'success'
                                : student.status === 'archived'
                                ? 'neutral'
                                : 'danger'
                            }
                          >
                            {student.status === 'active'
                              ? 'Active'
                              : student.status === 'archived'
                              ? 'Archived'
                              : 'Inactive'}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenProfile(student)}
                              aria-label="360° Profile-ka Ardayga"
                              className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] hover:border-[var(--color-brand-border)] transition-colors cursor-pointer"
                              title="360° Profile-ka Ardayga"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenEditModal(student)}
                              aria-label="Tafatir Ardayga"
                              className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                              title="Tafatir (Edit Student)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {student.status === 'archived' || student.status === 'inactive' ? (
                              <button
                                type="button"
                                onClick={() => onQuickStatusChange(student, 'active')}
                                aria-label="Ka dhig Active"
                                className="p-1.5 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-soft)] text-[var(--color-success)] transition-colors cursor-pointer"
                                title="Ka dhig Active (Restore to Active)"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onQuickStatusChange(student, 'archived')}
                                aria-label="Kaydi Ardayga"
                                className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-warning)] transition-colors cursor-pointer"
                                title="Kaydi Ardayga (Archive Student)"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDeleteStudentClick(student)}
                              aria-label="Tirtir Ardayga"
                              className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                              title="Tirtir (Delete Student)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedStudents.map((student) => {
            const isSelected = selectedStudentIds.includes(student.id);
            const feeInfo = getStudentFeeStatus
              ? getStudentFeeStatus(student.id)
              : { status: 'unpaid', balance: 0 };
            const fullName = student.fullName || 'Unnamed';

            return (
              <Card
                key={student.id}
                className={`space-y-3 transition-all ${
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleSelectOne(student.id)}
                      aria-label={`Select ${fullName}`}
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--color-brand)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    {student.photo ? (
                      <img
                        src={student.photo}
                        alt={fullName}
                        className="w-11 h-11 rounded-lg object-cover border border-[var(--color-border)]"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] text-[var(--color-brand)] flex items-center justify-center font-bold text-sm uppercase">
                        {fullName.trim() ? fullName.trim().charAt(0) : '?'}
                      </div>
                    )}
                    <div>
                      <h4
                        onClick={() => onOpenProfile(student)}
                        className="font-bold text-sm text-[var(--color-text-primary)] hover:text-[var(--color-brand)] cursor-pointer transition-colors"
                      >
                        {fullName}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] font-mono">
                        ID: {student.id}
                      </p>
                    </div>
                  </div>

                  <Badge
                    dot
                    variant={
                      student.status === 'active'
                        ? 'success'
                        : student.status === 'archived'
                        ? 'neutral'
                        : 'danger'
                    }
                  >
                    {student.status || 'active'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--color-border)]">
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] block">
                      Fasalka
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {student.class} {student.section ? `(${student.section})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] block">
                      Lab/Dhedig
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {student.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] block">
                      Telefoonka
                    </span>
                    {student.guardianPhone ? (
                      <a
                        href={`tel:${student.guardianPhone}`}
                        className="text-[var(--color-brand)] hover:underline font-mono text-[11px]"
                      >
                        {student.guardianPhone}
                      </a>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] block">
                      Biilka Bisha
                    </span>
                    <Badge
                      variant={
                        feeInfo.status === 'paid'
                          ? 'success'
                          : feeInfo.status === 'partial'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {feeInfo.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(student)}
                    className="text-xs text-[var(--color-brand)] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> 360° Profile
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(student)}
                      aria-label="Edit"
                      className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteStudentClick(student)}
                      aria-label="Delete"
                      className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {filteredStudentsCount > 0 && (
        <Card padding="sm" className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Showing{' '}
              <strong className="text-[var(--color-text-primary)] font-mono tabular-nums">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-[var(--color-text-primary)] font-mono tabular-nums">
                {Math.min(currentPage * pageSize, filteredStudentsCount)}
              </strong>{' '}
              of{' '}
              <strong className="text-[var(--color-text-primary)] font-mono tabular-nums">
                {filteredStudentsCount}
              </strong>{' '}
              students
            </p>
            <select
              value={pageSize}
              onChange={(e) => onSetPageSize(Number(e.target.value))}
              aria-label="Page size"
              className="ds-input py-1 px-2 text-xs font-mono"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSetCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous Page"
              className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono tabular-nums text-[var(--color-text-primary)] px-3 py-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-md">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onSetCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next Page"
              className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};
