import React from 'react';
import {
  Users,
  CheckSquare,
  Square,
  Phone,
  Eye,
  Edit2,
  RotateCcw,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Student } from '../../../types';
import { StudentFeeSummary } from './studentsExportUtils';

interface StudentsRosterTableProps {
  viewMode: 'table' | 'cards';
  paginatedStudents: Student[];
  filteredStudentsCount: number;
  selectedStudentIds: string[];
  isAllSelected: boolean;
  visibleColumns: Record<string, boolean>;
  currency: string;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onSetCurrentPage: (page: number | ((prev: number) => number)) => void;
  onSetPageSize: (size: number) => void;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  getStudentFeeStatus: (studentId: string) => StudentFeeSummary;
  onOpenProfile: (student: Student) => void;
  onOpenEditModal: (student: Student) => void;
  onQuickStatusChange: (student: Student, status: 'active' | 'inactive' | 'archived') => void;
  onDeleteStudentClick: (student: Student) => void;
}

export const StudentsRosterTable: React.FC<StudentsRosterTableProps> = ({
  viewMode,
  paginatedStudents,
  filteredStudentsCount,
  selectedStudentIds,
  isAllSelected,
  visibleColumns,
  currency,
  currentPage,
  pageSize,
  totalPages,
  onSetCurrentPage,
  onSetPageSize,
  onToggleSelectAll,
  onToggleSelectOne,
  getStudentFeeStatus,
  onOpenProfile,
  onOpenEditModal,
  onQuickStatusChange,
  onDeleteStudentClick
}) => {
  return (
    <>
      {viewMode === 'table' ? (
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#ffffff10] text-[10px] uppercase font-bold tracking-widest text-[#737373]">
                  <th className="px-4 py-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={onToggleSelectAll}
                      aria-label={isAllSelected ? 'Deselect All' : 'Select All on this Page'}
                      className="p-1 text-[#888888] hover:text-white transition-colors"
                      title={isAllSelected ? 'Deselect All' : 'Select All on this Page'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#7c3aed]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5">Ardayga / Student</th>
                  {visibleColumns.id !== false && <th className="px-4 py-3.5">ID / Roll No</th>}
                  {visibleColumns.class !== false && <th className="px-4 py-3.5">Fasalka / Class</th>}
                  {visibleColumns.gender !== false && <th className="px-4 py-3.5">Lab/Dhedig</th>}
                  {visibleColumns.guardian !== false && (
                    <th className="px-4 py-3.5">Waalidka / Guardian</th>
                  )}
                  {visibleColumns.fees !== false && <th className="px-4 py-3.5">Biilka Bisha</th>}
                  {visibleColumns.status !== false && <th className="px-4 py-3.5">Status</th>}
                  {visibleColumns.regDate !== false && <th className="px-4 py-3.5">Reg. Date</th>}
                  {visibleColumns.updated !== false && (
                    <th className="px-4 py-3.5">Last Updated</th>
                  )}
                  <th className="px-4 py-3.5 text-right">Hawlaha / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff08] text-xs">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Users className="w-10 h-10 text-[#333333]" />
                        <p className="text-sm font-semibold text-[#888888]">
                          Wax arday ah oo buuxiyey shuruudaha lama helin
                        </p>
                        <p className="text-xs text-[#555555]">
                          Isku day inaad beddesho erayada raadinta ama filter-yada aad dooratay.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    const feeInfo = getStudentFeeStatus(student.id);

                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-[#7c3aed]/10' : 'hover:bg-[#ffffff02]'
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => onToggleSelectOne(student.id)}
                            aria-label={`Select ${student.fullName}`}
                            className="p-1 text-[#888888] hover:text-white transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#7c3aed]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => onOpenProfile(student)}
                            title="Fiiri 360° Profile-ka Ardayga"
                          >
                            {student.photo ? (
                              <img
                                src={student.photo}
                                alt={student.fullName}
                                className="w-9 h-9 rounded-full object-cover border border-[#ffffff15] group-hover:border-[#7c3aed] transition-colors"
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                                  student.gender === 'Female'
                                    ? 'bg-[#ec4899]/15 border-[#ec4899]/30 text-[#f472b6]'
                                    : 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#60a5fa]'
                                }`}
                              >
                                {student.fullName.trim() ? student.fullName.trim().charAt(0) : '?'}
                              </div>
                            )}

                            <div>
                              <p className="font-bold text-[#f0f0f0] group-hover:text-[#c4b5fd] transition-colors flex items-center gap-1.5">
                                <span>{student.fullName}</span>
                              </p>
                              <p className="text-[10px] text-[#737373] font-mono">
                                {student.guardianName
                                  ? `Waalid: ${student.guardianName}`
                                  : `ID: ${student.id}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {visibleColumns.id !== false && (
                          <td className="px-4 py-3 font-mono text-[11px] text-[#a3a3a3]">
                            <div>
                              <span className="text-white font-semibold">{student.id}</span>
                              {student.rollNumber && (
                                <p className="text-[9px] text-[#737373] mt-0.5">
                                  Roll: {student.rollNumber}
                                </p>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.class !== false && (
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[#e5e5e5]">{student.class}</span>
                            {student.section && (
                              <span className="ml-1.5 text-[10px] text-[#888888] font-mono">
                                · Sec {student.section}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleColumns.gender !== false && (
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                student.gender === 'Female' ? 'text-[#f472b6]' : 'text-[#60a5fa]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  student.gender === 'Female' ? 'bg-[#ec4899]' : 'bg-[#3b82f6]'
                                }`}
                              />
                              {student.gender}
                            </span>
                          </td>
                        )}

                        {visibleColumns.guardian !== false && (
                          <td className="px-4 py-3">
                            {student.guardianPhone ? (
                              <a
                                href={`tel:${student.guardianPhone}`}
                                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#c4b5fd] hover:text-white hover:underline transition-colors"
                                title="Wac Telefoonka Waalidka"
                              >
                                <Phone className="w-3 h-3 text-[#7c3aed]" />
                                <span>{student.guardianPhone}</span>
                              </a>
                            ) : (
                              <span className="text-rose-400/80 font-mono text-[10px]">
                                Lama gelin
                              </span>
                            )}
                            {student.guardianName && (
                              <p className="text-[10px] text-[#737373] mt-0.5">
                                {student.guardianName}
                              </p>
                            )}
                          </td>
                        )}

                        {visibleColumns.fees !== false && (
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                                feeInfo.status === 'paid'
                                  ? 'text-emerald-400'
                                  : feeInfo.status === 'partial'
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {feeInfo.status}
                            </span>
                            {feeInfo.status !== 'paid' && feeInfo.balance > 0 && (
                              <p className="text-[9px] text-[#888888] font-mono mt-0.5">
                                Bal: {currency} {feeInfo.balance}
                              </p>
                            )}
                          </td>
                        )}

                        {visibleColumns.status !== false && (
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                                student.status === 'active'
                                  ? 'text-emerald-400'
                                  : student.status === 'archived'
                                  ? 'text-slate-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {student.status || 'active'}
                            </span>
                          </td>
                        )}

                        {visibleColumns.regDate !== false && (
                          <td className="px-4 py-3 font-mono text-[10px] text-[#a3a3a3]">
                            {student.createdAt || '-'}
                          </td>
                        )}

                        {visibleColumns.updated !== false && (
                          <td className="px-4 py-3 font-mono text-[10px] text-[#888888]">
                            {student.updatedAt
                              ? student.updatedAt.split('T')[0]
                              : student.createdAt || '-'}
                          </td>
                        )}

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenProfile(student)}
                              aria-label="360° Profile-ka Ardayga"
                              className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#c4b5fd] hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/30 transition-colors"
                              title="360° Profile-ka Ardayga"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenEditModal(student)}
                              aria-label="Tafatir Ardayga"
                              className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-white hover:bg-[#ffffff10] transition-colors"
                              title="Tafatir (Edit Student)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {student.status === 'archived' || student.status === 'inactive' ? (
                              <button
                                type="button"
                                onClick={() => onQuickStatusChange(student, 'active')}
                                aria-label="Ka dhig Active"
                                className="p-1.5 rounded-sm border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title="Ka dhig Active (Restore to Active)"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onQuickStatusChange(student, 'archived')}
                                aria-label="Kaydi Ardayga"
                                className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                title="Kaydi Ardayga (Archive Student)"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDeleteStudentClick(student)}
                              aria-label="Tirtir Ardayga"
                              className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedStudents.map((student) => {
            const isSelected = selectedStudentIds.includes(student.id);
            const feeInfo = getStudentFeeStatus(student.id);

            return (
              <div
                key={student.id}
                className={`bg-[#0f0f0f] border rounded-sm p-4.5 space-y-3 transition-all relative ${
                  isSelected
                    ? 'border-[#7c3aed] bg-[#7c3aed]/5'
                    : 'border-[#ffffff10] hover:border-[#ffffff25]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleSelectOne(student.id)}
                      aria-label={`Select ${student.fullName}`}
                      className="p-1 text-[#888888] hover:text-white"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#7c3aed]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    {student.photo ? (
                      <img
                        src={student.photo}
                        alt={student.fullName}
                        className="w-12 h-12 rounded-full object-cover border border-[#ffffff15]"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm uppercase border ${
                          student.gender === 'Female'
                            ? 'bg-[#ec4899]/15 border-[#ec4899]/30 text-[#f472b6]'
                            : 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#60a5fa]'
                        }`}
                      >
                        {student.fullName.trim() ? student.fullName.trim().charAt(0) : '?'}
                      </div>
                    )}
                    <div>
                      <h4
                        onClick={() => onOpenProfile(student)}
                        className="font-bold text-white hover:text-[#c4b5fd] cursor-pointer transition-colors"
                      >
                        {student.fullName}
                      </h4>
                      <p className="text-[10px] text-[#888888] font-mono">ID: {student.id}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${
                      student.status === 'active'
                        ? 'bg-[#7c3aed]/15 text-[#c4b5fd] border-[#7c3aed]/30'
                        : student.status === 'archived'
                        ? 'bg-slate-700/30 text-slate-300 border-slate-600/40'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {student.status || 'active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#ffffff08]">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">
                      Fasalka:
                    </span>
                    <span className="font-semibold text-[#e5e5e5]">
                      {student.class} {student.section ? `(${student.section})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">
                      Lab/Dhedig:
                    </span>
                    <span
                      className={student.gender === 'Female' ? 'text-[#f472b6]' : 'text-[#60a5fa]'}
                    >
                      {student.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">
                      Telefoonka:
                    </span>
                    {student.guardianPhone ? (
                      <a
                        href={`tel:${student.guardianPhone}`}
                        className="text-[#c4b5fd] hover:underline font-mono text-[11px]"
                      >
                        {student.guardianPhone}
                      </a>
                    ) : (
                      <span className="text-[#555555]">-</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#737373] block">
                      Biilka Bisha:
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        feeInfo.status === 'paid'
                          ? 'text-emerald-400'
                          : feeInfo.status === 'partial'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {feeInfo.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#ffffff08]">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(student)}
                    className="text-xs text-[#c4b5fd] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> 360° Profile
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(student)}
                      aria-label="Edit"
                      className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteStudentClick(student)}
                      aria-label="Delete"
                      className="p-1.5 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredStudentsCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-3.5">
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#737373]">
              Showing{' '}
              <strong className="text-white font-mono">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-white font-mono">
                {Math.min(currentPage * pageSize, filteredStudentsCount)}
              </strong>{' '}
              of <strong className="text-white font-mono">{filteredStudentsCount}</strong> students
            </p>
            <select
              value={pageSize}
              onChange={(e) => onSetPageSize(Number(e.target.value))}
              aria-label="Page size"
              className="bg-[#0a0a0a] text-[11px] font-mono text-[#cccccc] border border-[#ffffff15] px-2 py-1 rounded-sm"
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
              className="p-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-[#cccccc] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#ffffff05] transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-[#e5e5e5] px-3 py-1 bg-[#ffffff05] border border-[#ffffff10] rounded-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onSetCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next Page"
              className="p-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-[#cccccc] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#ffffff05] transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
