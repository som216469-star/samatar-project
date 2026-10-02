import React, { useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  CheckCircle2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { SchoolClass, Student } from '../../../types';
import { StudentSubSection } from '../../../app/navigationConfig';
import { Badge, Button, Modal } from '../../../components/ui/primitives';

export interface ImportValidatedRow {
  rowNum: number;
  raw?: any;
  isValid: boolean;
  errors: string[];
  data: {
    id: string;
    fullName: string;
    class: string;
    section: string;
    rollNumber: string;
    gender: 'Male' | 'Female' | string;
    dateOfBirth?: string;
    guardianName: string;
    guardianPhone: string;
    address?: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: string;
  };
}

export interface BulkActionState {
  isOpen: boolean;
  action: 'change_class' | 'change_status' | 'archive' | 'delete' | null;
  targetValue?: string;
}

export interface StudentsActionModalsProps {
  isExportModalOpen?: boolean;
  onCloseExportModal?: () => void;
  exportScope?: 'all' | 'filtered' | 'selected' | 'class';
  setExportScope?: React.Dispatch<
    React.SetStateAction<'all' | 'filtered' | 'selected' | 'class'>
  >;
  exportClassTarget?: string;
  setExportClassTarget?: React.Dispatch<React.SetStateAction<string>>;
  exportFormat?: 'xlsx' | 'csv' | 'pdf';
  setExportFormat?: React.Dispatch<React.SetStateAction<'xlsx' | 'csv' | 'pdf'>>;
  totalStudentsCount?: number;
  filteredStudentsCount: number;
  selectedStudentIdsCount: number;
  classes: SchoolClass[];
  onExecuteExport?: () => void;

  showFiltersDrawer?: boolean;
  onCloseFiltersDrawer?: () => void;
  subSection?: StudentSubSection;
  selectedClassFilter?: string;
  setSelectedClassFilter?: (val: string) => void;
  selectedStatusFilter?: string;
  setSelectedStatusFilter?: (val: string) => void;
  selectedGenderFilter?: string;
  setSelectedGenderFilter?: (val: string) => void;
  selectedRegDateFilter?: string;
  setSelectedRegDateFilter?: (val: string) => void;
  selectedFeeFilter?: string;
  setSelectedFeeFilter?: (val: string) => void;
  sortBy?: any;
  setSortBy?: (val: any) => void;
  onResetAllFilters?: () => void;

  isImportModalOpen?: boolean;
  showImportModal?: boolean;
  onCloseImportModal: () => void;
  importStep: 'upload' | 'preview' | 'importing';
  setImportStep: React.Dispatch<React.SetStateAction<'upload' | 'preview' | 'importing'>>;
  importRows: ImportValidatedRow[];
  importFilterTab: 'all' | 'valid' | 'invalid';
  setImportFilterTab: React.Dispatch<React.SetStateAction<'all' | 'valid' | 'invalid'>>;
  importValidCount: number;
  importErrorCount: number;
  importProgress: number;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onDownloadImportTemplate?: (format: 'xlsx' | 'csv') => void;
  onDownloadTemplate?: () => void;
  onImportFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExcelUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCommitImport: () => void;

  bulkActionModal: BulkActionState;
  onCloseBulkActionModal: () => void;
  bulkTargetClass: string;
  setBulkTargetClass: React.Dispatch<React.SetStateAction<string>>;
  bulkTargetStatus: 'active' | 'inactive' | 'archived';
  setBulkTargetStatus: React.Dispatch<
    React.SetStateAction<'active' | 'inactive' | 'archived'>
  >;
  bulkOperating: boolean;
  onExecuteBulkAction: () => void;

  deleteConfirmStudent: Student | null;
  onCloseDeleteConfirm: () => void;
  onQuickArchiveFromDelete: (student: Student) => void;
  onConfirmDeleteStudent: (student: Student) => void;
}

export const StudentsActionModals: React.FC<StudentsActionModalsProps> = ({
  isExportModalOpen = false,
  onCloseExportModal = () => {},
  exportScope = 'filtered',
  setExportScope = (_val: any) => {},
  exportClassTarget = '',
  setExportClassTarget = (_val: any) => {},
  exportFormat = 'xlsx',
  setExportFormat = (_val: any) => {},
  totalStudentsCount = 0,
  filteredStudentsCount = 0,
  selectedStudentIdsCount = 0,
  classes = [],
  onExecuteExport = () => {},

  isImportModalOpen,
  showImportModal,
  onCloseImportModal,
  importStep = 'upload',
  setImportStep,
  importRows = [],
  importFilterTab = 'all',
  setImportFilterTab,
  importValidCount = 0,
  importErrorCount = 0,
  importProgress = 0,
  fileInputRef,
  onDownloadImportTemplate,
  onDownloadTemplate,
  onImportFileChange,
  onExcelUpload,
  onCommitImport,

  bulkActionModal = { isOpen: false, action: null },
  onCloseBulkActionModal,
  bulkTargetClass = '',
  setBulkTargetClass,
  bulkTargetStatus = 'active',
  setBulkTargetStatus,
  bulkOperating = false,
  onExecuteBulkAction,

  deleteConfirmStudent,
  onCloseDeleteConfirm,
  onQuickArchiveFromDelete,
  onConfirmDeleteStudent
}) => {
  const internalFileInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedFileInputRef = fileInputRef || internalFileInputRef;
  const resolvedImportOpen = Boolean(isImportModalOpen ?? showImportModal);
  const resolvedFormatLabel = (exportFormat || 'xlsx').toUpperCase();

  const handleDownloadTemplateClick = (format: 'xlsx' | 'csv') => {
    if (onDownloadImportTemplate) {
      onDownloadImportTemplate(format);
    } else if (onDownloadTemplate) {
      onDownloadTemplate();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onImportFileChange) {
      onImportFileChange(e);
    } else if (onExcelUpload) {
      onExcelUpload(e);
    }
  };

  return (
    <>
      {/* 1. EXPORT MODAL */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={onCloseExportModal}
        title="Dhoofinta Xogta Ardayda (Export)"
        subtitle="Dooro baaxadda ardayda iyo qaabka faylka"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={onCloseExportModal}>
              Ka noqo
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={onExecuteExport}
            >
              Soo Deji ({resolvedFormatLabel})
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="font-semibold text-[var(--color-text-secondary)] block">
              1. Dooro Ardayda la Dhoofinayo (Scope)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  exportScope === 'filtered'
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                }`}
              >
                <p className="font-semibold">Ardayda Shaandhaysan</p>
                <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-0.5">
                  {filteredStudentsCount} arday
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  exportScope === 'all'
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                }`}
              >
                <p className="font-semibold">Dhammaan Ardayda</p>
                <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-0.5">
                  {totalStudentsCount} arday
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('selected')}
                disabled={selectedStudentIdsCount === 0}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-40 ${
                  exportScope === 'selected'
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                }`}
              >
                <p className="font-semibold">Ardayda La Xulay Kaliya</p>
                <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-0.5">
                  {selectedStudentIdsCount} la xulay
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('class')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  exportScope === 'class'
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                }`}
              >
                <p className="font-semibold">Hal Fasal oo Gaar ah</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Dooro fasalka hoose
                </p>
              </button>
            </div>

            {exportScope === 'class' && (
              <select
                value={exportClassTarget}
                onChange={(e) => setExportClassTarget(e.target.value)}
                className="w-full ds-input mt-2"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-[var(--color-text-secondary)] block">
              2. Dooro Nooca Faylka (Format)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['xlsx', 'csv', 'pdf'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                    exportFormat === fmt
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {fmt === 'pdf' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5" />
                  )}
                  <span className="font-bold uppercase">{fmt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* 2. IMPORT MODAL */}
      <Modal
        isOpen={resolvedImportOpen}
        onClose={() => {
          if (importStep !== 'importing') onCloseImportModal();
        }}
        size="xl"
        title="Soo Gelinta Arday Badan (Bulk Import)"
        subtitle="Excel (.xlsx) ama CSV fayl ku soo geli diiwaanka ardayda"
        footer={
          importStep !== 'importing' ? (
            <div className="w-full flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (importStep === 'preview') setImportStep('upload');
                  else onCloseImportModal();
                }}
              >
                {importStep === 'preview' ? 'Dib u dooro fayl' : 'Xir (Close)'}
              </Button>

              {importStep === 'preview' && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={importValidCount === 0}
                  onClick={onCommitImport}
                >
                  Soo Geli Kuwa Saxda ah ({importValidCount} Arday)
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        <div className="space-y-5 text-xs">
          {importStep === 'upload' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-[var(--color-text-primary)]">
                    Tallaabada 1: Soo deji Template-ka Rasmiga ah
                  </h4>
                  <p className="text-[var(--color-text-secondary)]">
                    Foomkan waxaa ku diyaarsan dhammaan tiirarka (columns) saxda ah ee nidaamku
                    aqbalo.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadTemplateClick('xlsx')}
                  >
                    Excel Template
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadTemplateClick('csv')}
                  >
                    CSV Template
                  </Button>
                </div>
              </div>

              <div
                onClick={() => resolvedFileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-brand)] rounded-xl p-10 text-center space-y-3 cursor-pointer transition-colors bg-[var(--color-surface-muted)]"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center mx-auto text-[var(--color-brand)]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    Guji halkan si aad u doorato faylka Excel ama CSV
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Waxaa la oggol yahay .xlsx, .xls, iyo .csv
                  </p>
                </div>
                <input
                  ref={resolvedFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {importStep === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg">
                  <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] block">
                    Wadarta Safafka
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-[var(--color-text-primary)]">
                    {importRows.length}
                  </span>
                </div>
                <div className="p-3 bg-[var(--color-success-soft)] border border-[var(--color-success-border)] rounded-lg">
                  <span className="text-[10px] uppercase font-mono text-[var(--color-success)] block">
                    Diyaar (Valid)
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-[var(--color-success)]">
                    {importValidCount}
                  </span>
                </div>
                <div className="p-3 bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] rounded-lg">
                  <span className="text-[10px] uppercase font-mono text-[var(--color-danger)] block">
                    Khaladaad (Errors)
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-[var(--color-danger)]">
                    {importErrorCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'valid', 'invalid'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setImportFilterTab(tab)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      importFilterTab === tab
                        ? 'bg-[var(--color-brand)] text-white'
                        : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {tab === 'all'
                      ? `Dhammaan (${importRows.length})`
                      : tab === 'valid'
                      ? `Sax Kaliya (${importValidCount})`
                      : `Khaladaad (${importErrorCount})`}
                  </button>
                ))}
              </div>

              <div className="max-h-64 overflow-y-auto border border-[var(--color-border)] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Magaca</th>
                      <th className="px-3 py-2">Fasalka</th>
                      <th className="px-3 py-2">Telefoonka</th>
                      <th className="px-3 py-2">Hubinta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows
                      .filter((r) =>
                        importFilterTab === 'all'
                          ? true
                          : importFilterTab === 'valid'
                          ? r.isValid
                          : !r.isValid
                      )
                      .map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono text-[var(--color-text-muted)]">
                            #{row.rowNum}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">
                            {row.data?.fullName || '—'}
                          </td>
                          <td className="px-3 py-2">{row.data?.class || '—'}</td>
                          <td className="px-3 py-2 font-mono text-[var(--color-text-secondary)]">
                            {row.data?.guardianPhone || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <Badge variant="success">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Sax
                              </Badge>
                            ) : (
                              <span className="text-[var(--color-danger)] font-medium">
                                {(row.errors || []).join(', ')}
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
            <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
              <RefreshCw className="w-8 h-8 text-[var(--color-brand)] animate-spin" />
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Fadlan sug, ardayda ayaa la gelinayaa...
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Ha xirin daaqadda inta hawshu socoto.
                </p>
              </div>
              <div className="w-64 bg-[var(--color-surface-muted)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                <div
                  style={{ width: `${importProgress}%` }}
                  className="bg-[var(--color-brand)] h-full transition-all duration-300"
                />
              </div>
              <span className="text-xs font-mono font-bold text-[var(--color-brand)]">
                {importProgress}%
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* 3. BULK ACTION MODAL */}
      <Modal
        isOpen={Boolean(bulkActionModal?.isOpen)}
        onClose={onCloseBulkActionModal}
        size="sm"
        title={
          bulkActionModal?.action === 'change_class'
            ? 'U wareeji Fasal Cusub'
            : bulkActionModal?.action === 'change_status'
            ? 'Beddel Status-ka Ardayda'
            : bulkActionModal?.action === 'archive'
            ? 'Kaydi Ardayda (Archive)'
            : 'Tirtir Ardayda (Delete)'
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={onCloseBulkActionModal}>
              Ka noqo
            </Button>
            <Button
              variant={bulkActionModal?.action === 'delete' ? 'danger' : 'primary'}
              size="sm"
              loading={bulkOperating}
              onClick={onExecuteBulkAction}
            >
              Xaqiiji Hawsha (Confirm)
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--color-text-secondary)]">
            Waxaad dooratay{' '}
            <strong className="text-[var(--color-text-primary)] font-mono">
              {selectedStudentIdsCount}
            </strong>{' '}
            arday.
          </p>

          {bulkActionModal?.action === 'change_class' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Dooro Fasalka Cusub
              </label>
              <select
                value={bulkTargetClass}
                onChange={(e) => setBulkTargetClass(e.target.value)}
                className="w-full ds-input"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
          )}

          {bulkActionModal?.action === 'change_status' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Dooro Xaaladda Cusub
              </label>
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value as any)}
                className="w-full ds-input"
              >
                <option value="active">Active (Firfircoon)</option>
                <option value="inactive">Inactive (Aan firfircoonayn)</option>
                <option value="archived">Archived (La kaydiyey)</option>
              </select>
            </div>
          )}

          {bulkActionModal?.action === 'archive' && (
            <div className="p-3 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)]">
              Ardayda la kaydiyo kama muuqan doonaan liisaska firfircoon laakiin taariikhdooda
              imtixaanaadka iyo lacagaha waa la dhowri doonaa.
            </div>
          )}

          {bulkActionModal?.action === 'delete' && (
            <div className="p-3 bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] rounded-lg text-[var(--color-danger)] space-y-1">
              <p className="font-bold">Digniin Weyn:</p>
              <p>
                Hawshani waxay tirtiri doontaa dhammaan xogta {selectedStudentIdsCount} arday,
                biilashooda, iyo xaadirkooda. Tani dib uma noqonayso!
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* 4. DELETE SINGLE STUDENT CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmStudent}
        onClose={onCloseDeleteConfirm}
        size="sm"
        title="Ma hubtaa inaad tirtirto?"
        footer={
          deleteConfirmStudent ? (
            <>
              <Button variant="secondary" size="sm" onClick={onCloseDeleteConfirm}>
                Ka noqo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuickArchiveFromDelete(deleteConfirmStudent)}
              >
                Kaydi Kaliya (Archive)
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onConfirmDeleteStudent(deleteConfirmStudent)}
              >
                Tirtir (Delete)
              </Button>
            </>
          ) : undefined
        }
      >
        {deleteConfirmStudent && (
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                Ardayga:{' '}
                <strong className="text-[var(--color-text-primary)]">
                  {deleteConfirmStudent.fullName}
                </strong>{' '}
                ({deleteConfirmStudent.class})
              </p>
            </div>
            <div className="p-3 bg-[var(--color-warning-soft)] border border-[var(--color-warning-border)] rounded-lg text-[var(--color-warning)]">
              <strong>Talo:</strong> Halkii aad ardayga tirtiri lahayd, waxaad dooran kartaa inaad{' '}
              <strong>Archive</strong> garayso si xogta lacagaha iyo natiijooyinka imtixaanaadku u
              badbaadaan.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
