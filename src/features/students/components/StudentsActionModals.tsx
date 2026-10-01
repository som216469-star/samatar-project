import React from 'react';
import {
  Filter,
  X,
  AlertTriangle,
  RefreshCw,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { Student, SchoolClass } from '../../../types';
import { StudentSubSection } from '../../../app/navigationConfig';

interface StudentsActionModalsProps {
  showFiltersDrawer: boolean;
  onCloseFiltersDrawer: () => void;
  subSection: StudentSubSection;
  classes: SchoolClass[];
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
  onResetAllFilters: () => void;
  filteredStudentsCount: number;

  showImportModal: boolean;
  onCloseImportModal: () => void;
  importStep: 'upload' | 'preview' | 'importing';
  setImportStep: (step: 'upload' | 'preview' | 'importing') => void;
  importRows: any[];
  importValidCount: number;
  importErrorCount: number;
  importFilterTab: 'all' | 'valid' | 'invalid';
  setImportFilterTab: (tab: 'all' | 'valid' | 'invalid') => void;
  importProgress: number;
  onDownloadTemplate: () => void;
  onExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCommitImport: () => void;

  bulkActionModal: {
    isOpen: boolean;
    action: 'change_class' | 'change_status' | 'archive' | 'delete' | null;
    targetValue?: string;
  };
  onCloseBulkActionModal: () => void;
  selectedStudentIdsCount: number;
  bulkTargetClass: string;
  setBulkTargetClass: (val: string) => void;
  bulkTargetStatus: 'active' | 'inactive' | 'archived';
  setBulkTargetStatus: (val: 'active' | 'inactive' | 'archived') => void;
  bulkOperating: boolean;
  onExecuteBulkAction: () => void;

  deleteConfirmStudent: Student | null;
  onCloseDeleteConfirm: () => void;
  onQuickArchiveFromDelete: (student: Student) => Promise<void>;
  onConfirmDeleteStudent: (student: Student) => Promise<void>;
}

export const StudentsActionModals: React.FC<StudentsActionModalsProps> = ({
  showFiltersDrawer,
  onCloseFiltersDrawer,
  subSection,
  classes,
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
  onResetAllFilters,
  filteredStudentsCount,

  showImportModal,
  onCloseImportModal,
  importStep,
  setImportStep,
  importRows,
  importValidCount,
  importErrorCount,
  importFilterTab,
  setImportFilterTab,
  importProgress,
  onDownloadTemplate,
  onExcelUpload,
  onCommitImport,

  bulkActionModal,
  onCloseBulkActionModal,
  selectedStudentIdsCount,
  bulkTargetClass,
  setBulkTargetClass,
  bulkTargetStatus,
  setBulkTargetStatus,
  bulkOperating,
  onExecuteBulkAction,

  deleteConfirmStudent,
  onCloseDeleteConfirm,
  onQuickArchiveFromDelete,
  onConfirmDeleteStudent
}) => {
  return (
    <>
      {showFiltersDrawer && (
        <div
          className="fixed inset-0 z-50 md:hidden flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Filter & Sort Students"
        >
          <div className="w-full max-w-xs bg-[#0f0f0f] border-l border-[#ffffff15] h-full flex flex-col justify-between p-5 overflow-y-auto shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#7c3aed]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Filter & Sort Students
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onCloseFiltersDrawer}
                  aria-label="Close filter drawer"
                  className="p-1.5 text-[#737373] hover:text-white rounded-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                  Fasalka (Class)
                </label>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff12] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="all">Dhammaan Fasallada (All Classes)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.className}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              {subSection === 'all' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    Xaaladda (Status)
                  </label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff12] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="all">Dhammaan Xaaladaha (All Status)</option>
                    <option value="active">Active (Firfircoon)</option>
                    <option value="inactive">Inactive (Aan Firfircoonayn)</option>
                    <option value="archived">Archived (La Kaydiyey)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                  Jinsiga (Gender)
                </label>
                <select
                  value={selectedGenderFilter}
                  onChange={(e) => setSelectedGenderFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff12] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="all">Lab & Dhedig (All Genders)</option>
                  <option value="Male">Wiilal (Male)</option>
                  <option value="Female">Gabdho (Female)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                  Taariikhda Diiwaangelinta (Registration Date)
                </label>
                <select
                  value={selectedRegDateFilter}
                  onChange={(e) => setSelectedRegDateFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff12] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="all">Dhammaan Taariikhaha (All Dates)</option>
                  <option value="today">Maanta La Qoray (Today)</option>
                  <option value="this_month">Bishan La Qoray (This Month)</option>
                  <option value="this_year">Sanadkan (This Year)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                  Biilka Bisha (Fee Status)
                </label>
                <select
                  value={selectedFeeFilter}
                  onChange={(e) => setSelectedFeeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff12] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="all">Dhammaan (All Fee Status)</option>
                  <option value="paid">Lacagta La Bixiyey (Paid)</option>
                  <option value="partial">Qabyo (Partial)</option>
                  <option value="unpaid">Aan La Bixin (Unpaid)</option>
                  <option value="attention">U Baahan Fiiro (Needs Attention)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                  Kala Hormarinta (Sort By)
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] text-xs text-[#e5e5e5] border border-[#ffffff12] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="name_asc">Magaca (A - Z)</option>
                  <option value="name_desc">Magaca (Z - A)</option>
                  <option value="id_asc">Student ID (A - Z)</option>
                  <option value="date_desc">Taariikhda Qorista (Newest)</option>
                  <option value="date_asc">Taariikhda Qorista (Oldest)</option>
                  <option value="updated_desc">Ugu Dambeeyey Cusbooneysiin</option>
                  <option value="class">Fasalka (Class)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#ffffff10] flex items-center gap-2">
              <button
                type="button"
                onClick={onResetAllFilters}
                className="flex-1 py-2.5 bg-[#141414] hover:bg-[#1f1f1f] text-xs font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20 rounded-sm"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onCloseFiltersDrawer}
                className="flex-1 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-xs font-bold uppercase tracking-wider text-white rounded-sm"
              >
                Apply ({filteredStudentsCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Soo Gelinta Ardayda (Bulk Excel Import)"
        >
          <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm w-full max-w-3xl shadow-2xl relative my-8 overflow-hidden">
            <div className="bg-[#141414] border-b border-[#ffffff10] p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-serif italic text-white">
                    Soo Gelinta Ardayda (Bulk Excel Import)
                  </h2>
                  <p className="text-[10px] text-[#888888] uppercase tracking-widest mt-0.5">
                    Ku dar boqolaal arday hal mar adigoo isticmaalaya faylka Excel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseImportModal}
                aria-label="Close import modal"
                className="p-2 text-[#737373] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {importStep === 'upload' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm space-y-1">
                      <span className="text-[10px] font-mono text-[#7c3aed] font-bold">
                        TALLAABADA 1
                      </span>
                      <p className="font-bold text-white">Soo Dejiso Template-ka</p>
                      <p className="text-[11px] text-[#888888]">
                        Ka bilow template-ka rasmiga ah ee nidaamka ku diyaarsan.
                      </p>
                      <button
                        type="button"
                        onClick={onDownloadTemplate}
                        className="mt-2 text-xs text-[#c4b5fd] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3 h-3" /> Soo Dejiso Hada
                      </button>
                    </div>

                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm space-y-1">
                      <span className="text-[10px] font-mono text-[#7c3aed] font-bold">
                        TALLAABADA 2
                      </span>
                      <p className="font-bold text-white">Buuxi Macluumaadka</p>
                      <p className="text-[11px] text-[#888888]">
                        Geli magacyada, fasallada saxda ah, iyo telefoonada waalidiinta.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff08] rounded-sm space-y-1">
                      <span className="text-[10px] font-mono text-[#7c3aed] font-bold">
                        TALLAABADA 3
                      </span>
                      <p className="font-bold text-white">Soo Geli oo Baar</p>
                      <p className="text-[11px] text-[#888888]">
                        Nidaamku wuxuu xaqiijinayaa khaladaadka ka hor inta uusan kaydin.
                      </p>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-[#ffffff20] hover:border-[#7c3aed] rounded-sm p-8 text-center bg-[#0a0a0a] transition-colors flex flex-col items-center justify-center gap-3">
                    <div className="p-3 rounded-full bg-[#7c3aed]/10 text-[#c4b5fd]">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Dooro ama ku soo tuur faylka Excel (.xlsx, .xls)
                      </p>
                      <p className="text-xs text-[#737373] mt-1">
                        Xajmiga ugu sarreeya ee faylku waa 10MB
                      </p>
                    </div>
                    <label className="mt-2 px-5 py-2.5 rounded-sm bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-colors">
                      Baar Kombuyutarka (Browse File)
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={onExcelUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {importStep === 'preview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[#0a0a0a] border border-[#ffffff10] rounded-sm">
                      <span className="text-[9px] uppercase tracking-widest text-[#888888] font-bold block">
                        Wadarta Safafka
                      </span>
                      <span className="text-xl font-bold font-mono text-white">
                        {importRows.length}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                      <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold block">
                        Kuwa Saxda ah
                      </span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {importValidCount}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-sm">
                      <span className="text-[9px] uppercase tracking-widest text-rose-400 font-bold block">
                        Kuwa Ciladaysan
                      </span>
                      <span className="text-xl font-bold font-mono text-rose-400">
                        {importErrorCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-b border-[#ffffff10] pb-2">
                    <button
                      type="button"
                      onClick={() => setImportFilterTab('all')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        importFilterTab === 'all'
                          ? 'bg-[#ffffff15] text-white'
                          : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Dhammaan ({importRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportFilterTab('valid')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        importFilterTab === 'valid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Sax Kaliya ({importValidCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportFilterTab('invalid')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        importFilterTab === 'invalid'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Khaladaad leh ({importErrorCount})
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-[#ffffff10] rounded-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0a0a0a] text-[9px] uppercase tracking-widest text-[#737373] sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Magaca</th>
                          <th className="px-3 py-2">Fasalka</th>
                          <th className="px-3 py-2">Telefoonka</th>
                          <th className="px-3 py-2">Natiijada Hubinta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ffffff08]">
                        {importRows
                          .filter((r) =>
                            importFilterTab === 'all'
                              ? true
                              : importFilterTab === 'valid'
                              ? r.isValid
                              : !r.isValid
                          )
                          .map((row, idx) => (
                            <tr
                              key={idx}
                              className={row.isValid ? 'hover:bg-[#ffffff02]' : 'bg-rose-500/5'}
                            >
                              <td className="px-3 py-2 font-mono text-[10px] text-[#888888]">
                                #{row.rowNum}
                              </td>
                              <td className="px-3 py-2 font-bold text-white">
                                {row.data.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-[#cccccc]">{row.data.class || '-'}</td>
                              <td className="px-3 py-2 font-mono text-[#888888]">
                                {row.data.guardianPhone || '-'}
                              </td>
                              <td className="px-3 py-2">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-3 h-3" /> Sax (Valid)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rose-400 font-medium">
                                    ⚠️ {row.errors.join(', ')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importStep === 'importing' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <RefreshCw className="w-10 h-10 text-[#7c3aed] animate-spin" />
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Fadlan sug, ardayda ayaa la gelinayaa...
                    </h3>
                    <p className="text-xs text-[#888888] mt-1">
                      Ha xirin daaqadda inta hawshu socoto.
                    </p>
                  </div>
                  <div className="w-64 bg-[#1e1e1e] h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${importProgress}%` }}
                      className="bg-[#7c3aed] h-full transition-all duration-300"
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#c4b5fd]">
                    {importProgress}%
                  </span>
                </div>
              )}
            </div>

            {importStep !== 'importing' && (
              <div className="bg-[#141414] border-t border-[#ffffff10] p-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (importStep === 'preview') setImportStep('upload');
                    else onCloseImportModal();
                  }}
                  className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
                >
                  {importStep === 'preview' ? 'Dib u dooro fayl' : 'Xir (Close)'}
                </button>

                {importStep === 'preview' && (
                  <button
                    type="button"
                    onClick={onCommitImport}
                    disabled={importValidCount === 0}
                    className="px-5 py-2 rounded-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    <span>Soo Geli Kuwa Saxda ah ({importValidCount} Arday)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {bulkActionModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Bulk Action Confirmation"
        >
          <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
              <h3 className="text-lg font-bold text-white">
                {bulkActionModal.action === 'change_class' && 'U wareeji Fasal Cusub'}
                {bulkActionModal.action === 'change_status' && 'Beddel Status-ka Ardayda'}
                {bulkActionModal.action === 'archive' && 'Kaydi Ardayda (Archive)'}
                {bulkActionModal.action === 'delete' && 'Tirtir Ardayda (Delete)'}
              </h3>
              <button
                type="button"
                onClick={onCloseBulkActionModal}
                aria-label="Close bulk modal"
                className="p-1 text-[#888888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#cccccc]">
              Waxaad dooratay{' '}
              <strong className="text-white font-mono">{selectedStudentIdsCount}</strong> arday.
            </p>

            {bulkActionModal.action === 'change_class' && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                  Dooro Fasalka Cusub
                </label>
                <select
                  value={bulkTargetClass}
                  onChange={(e) => setBulkTargetClass(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] text-xs text-white border border-[#ffffff15] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.className}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bulkActionModal.action === 'change_status' && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                  Dooro Xaaladda Cusub
                </label>
                <select
                  value={bulkTargetStatus}
                  onChange={(e) => setBulkTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] text-xs text-white border border-[#ffffff15] rounded-sm focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="active">Active (Firfircoon)</option>
                  <option value="inactive">Inactive (Aan firfircoonayn)</option>
                  <option value="archived">Archived (La kaydiyey)</option>
                </select>
              </div>
            )}

            {bulkActionModal.action === 'archive' && (
              <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-sm text-xs text-slate-300">
                Ardayda la kaydiyo kama muuqan doonaan liisaska firfircoon laakiin taariikhdooda
                imtixaanaadka iyo lacagaha waa la dhowri doonaa.
              </div>
            )}

            {bulkActionModal.action === 'delete' && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-sm text-xs text-rose-300 space-y-1">
                <p className="font-bold">⚠️ Digniin Weyn:</p>
                <p>
                  Hawshani waxay tirtiri doontaa dhammaan xogta {selectedStudentIdsCount} arday,
                  biilashooda, iyo xaadirkooda. Tani dib uma noqonayso!
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCloseBulkActionModal}
                className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
              >
                Ka noqo
              </button>
              <button
                type="button"
                onClick={onExecuteBulkAction}
                disabled={bulkOperating}
                className={`px-5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 ${
                  bulkActionModal.action === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
                }`}
              >
                {bulkOperating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xaqiiji Hawsha (Confirm)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Ma hubtaa inaad tirtirto?"
        >
          <div className="bg-[#0f0f0f] border border-rose-500/30 rounded-sm w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Ma hubtaa inaad tirtirto?</h3>
            </div>
            <p className="text-xs text-[#cccccc] leading-relaxed">
              Ardayga:{' '}
              <strong className="text-white">{deleteConfirmStudent.fullName}</strong> (
              {deleteConfirmStudent.class})
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-sm text-xs text-amber-300">
              💡 <strong>Talo:</strong> Halkii aad ardayga tirtiri lahayd, waxaad dooran kartaa inaad{' '}
              <strong>Archive</strong> garayso si xogta lacagaha iyo natiijooyinka imtixaanaadku u
              badbaadaan.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCloseDeleteConfirm}
                className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
              >
                Ka noqo
              </button>
              <button
                type="button"
                onClick={() => onQuickArchiveFromDelete(deleteConfirmStudent)}
                className="px-4 py-2 rounded-sm bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white uppercase tracking-wider"
              >
                Kaydi Kaliya (Archive)
              </button>
              <button
                type="button"
                onClick={() => onConfirmDeleteStudent(deleteConfirmStudent)}
                className="px-4 py-2 rounded-sm bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white uppercase tracking-wider"
              >
                Tirtir (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
