import React, { useState } from 'react';
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Student, SchoolClass } from '../../../types';
import { PageContainer, PageHeader } from '../../../components/layout/PageLayout';
import { readStudentSpreadsheet, downloadStudentSpreadsheet } from '../../../lib/studentSpreadsheet';
import { Badge, Button, Card, StatCard } from '../../../components/ui/primitives';

interface StudentImportViewProps {
  existingStudents: Student[];
  classes: SchoolClass[];
  onImportStudents: (
    studentsToImport: any[]
  ) => Promise<{ success: boolean; imported: number; failed: number }>;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

interface ParsedRow {
  index: number;
  fullName: string;
  className: string;
  gender: 'Male' | 'Female';
  guardianPhone: string;
  guardianName?: string;
  section?: string;
  rollNumber?: string;
  address?: string;
  guardianRelationship?: string;
  guardianPhoneAlt?: string;
  nationalId?: string;
  previousSchool?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  duplicateReason?: string;
}

export default function StudentImportView({
  existingStudents,
  classes,
  onImportStudents,
  onCancel,
  showToast
}: StudentImportViewProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    skipped: number;
  }>({ total: 0, imported: 0, skipped: 0 });

  // Download Standardized Excel Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Magaca Ardayga (Full Name) *': 'Maxamed Cali Jaamac',
        'Fasalka (Class) *': classes[0]?.className || 'Fasalka 1aad',
        'Lab/Dhedig (Gender - Male/Female) *': 'Male',
        'Telefoonka Waalidka (Guardian Phone) *': '+252615123456',
        'Magaca Waalidka (Guardian Name)': 'Cali Jaamac',
        'Qeybta (Section)': 'A',
        'Roll Number': '01',
        'Cinwaanka (Address)': 'Muqdisho, Hodan',
        'Xiriirka Waalidka (Relationship)': 'Aabbe',
        'Telefoon Labaad (Guardian Phone Alt)': '',
        'National ID': '',
        'Iskuulkii Hore (Previous School)': '',
        'Blood Group': '',
        'Medical Notes': ''
      },
      {
        'Magaca Ardayga (Full Name) *': 'Caasho Axmed Nuur',
        'Fasalka (Class) *': classes[0]?.className || 'Fasalka 1aad',
        'Lab/Dhedig (Gender - Male/Female) *': 'Female',
        'Telefoonka Waalidka (Guardian Phone) *': '+252615654321',
        'Magaca Waalidka (Guardian Name)': 'Axmed Nuur',
        'Qeybta (Section)': 'A',
        'Roll Number': '02',
        'Cinwaanka (Address)': 'Muqdisho, Howlwadaag',
        'Xiriirka Waalidka (Relationship)': 'Hooyo',
        'Telefoon Labaad (Guardian Phone Alt)': '',
        'National ID': '',
        'Iskuulkii Hore (Previous School)': '',
        'Blood Group': '',
        'Medical Notes': ''
      }
    ];

    void downloadStudentSpreadsheet(
      templateRows as Record<string, unknown>[],
      'DugsiPro_Students_Import_Template.xlsx',
      'Students_Template'
    )
      .then(() => showToast('Template-ka Excel-ka waa la soo dejiyey!', 'success'))
      .catch(() => showToast('Template-ka Excel lama abuuri karin.', 'error'));
  };

  // Parse Excel / CSV File
  const handleFile = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      showToast('Fadlan dooro fayl Excel (.xlsx, .xls) ama CSV (.csv)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Faylka kama badnaan karo 10MB.', 'error');
      return;
    }

    try {
      const rawJson = await readStudentSpreadsheet(file);

      if (rawJson.length === 0) {
        showToast('Faylka waa maran yahay!', 'warning');
        return;
      }

      if (rawJson.length > 500) {
        showToast('Hal import kama badnaan karo 500 arday.', 'error');
        return;
      }

      const processed: ParsedRow[] = rawJson.map((row, idx) => {
        const get = (...keys: string[]) => {
          for (const key of keys) {
            const value = row[key];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              return String(value).trim();
            }
          }
          return '';
        };

        const fullName = get(
          'Magaca Ardayga (Full Name) *',
          'Magaca Ardayga',
          'Full Name',
          'FullName',
          'Name',
          'fullName'
        );
        const className = get(
          'Fasalka (Class) *',
          'Fasalka',
          'Class',
          'Grade',
          'class'
        );
        const rawGender = get(
          'Lab/Dhedig (Gender - Male/Female) *',
          'Lab/Dhedig (Gender - Male/Female)',
          'Lab/Dhedig',
          'Gender',
          'gender'
        ).toLowerCase();

        const gender: 'Male' | 'Female' =
          rawGender.startsWith('f') ||
          rawGender.includes('dhed') ||
          rawGender.includes('girl')
            ? 'Female'
            : 'Male';

        const guardianPhone = get(
          'Telefoonka Waalidka (Guardian Phone) *',
          'Telefoonka Waalidka (Guardian Phone)',
          'Telefoonka Waalidka',
          'Guardian Phone',
          'Phone',
          'guardianPhone'
        );
        const guardianName = get(
          'Magaca Waalidka (Guardian Name)',
          'Magaca Waalidka',
          'Guardian Name',
          'guardianName'
        );
        const section = get('Qeybta (Section)', 'Section');
        const rollNumber = get('Roll Number', 'RollNumber');
        const address = get('Cinwaanka (Address)', 'Address', 'address');
        const guardianRelationship = get(
          'Xiriirka Waalidka (Relationship)',
          'Guardian Relationship',
          'Relationship'
        );
        const guardianPhoneAlt = get(
          'Telefoon Labaad (Guardian Phone Alt)',
          'Guardian Phone Alt',
          'Alternate Phone'
        );
        const nationalId = get('National ID', 'NationalID', 'nationalId');
        const previousSchool = get(
          'Iskuulkii Hore (Previous School)',
          'Previous School',
          'previousSchool'
        );
        const bloodGroup = get('Blood Group', 'BloodGroup', 'bloodGroup');
        const medicalNotes = get(
          'Medical Notes',
          'Xusuusin Caafimaad',
          'medicalNotes'
        );

        const errors: string[] = [];
        if (!fullName) errors.push('Magaca ardayga waa maran');
        if (fullName && fullName.split(/\s+/).filter(Boolean).length < 2) {
          errors.push('Magaca ardayga waa inuu leeyahay ugu yaraan 2 magac');
        }
        if (!className) errors.push('Fasalka lama sheegin');
        if (
          className &&
          classes.length > 0 &&
          !classes.some(
            (item) =>
              item.className.trim().toLowerCase() === className.toLowerCase()
          )
        ) {
          errors.push('Fasalkan kama jiro liiska school-ka');
        }
        if (!guardianPhone) errors.push('Telefoonka waalidka waa qasab');
        if (guardianPhone && !/^[+0-9()\s.-]{7,30}$/.test(guardianPhone)) {
          errors.push('Telefoonka waalidka ma saxna');
        }
        if (guardianPhoneAlt && !/^[+0-9()\s.-]{7,30}$/.test(guardianPhoneAlt)) {
          errors.push('Telefoonka labaad ma saxna');
        }
        if (nationalId.length > 80) errors.push('National ID aad buu u dheer yahay');
        if (medicalNotes.length > 2000) errors.push('Medical Notes aad bay u dheer yihiin');

        let isDuplicate = false;
        let duplicateReason = '';

        const existingMatch = existingStudents.find(
          (s) =>
            s.fullName.trim().toLowerCase() === fullName.toLowerCase() &&
            s.class.trim().toLowerCase() === className.toLowerCase()
        );
        if (existingMatch) {
          isDuplicate = true;
          duplicateReason = `Arday hore ugu jiray fasalka (${existingMatch.id})`;
        }

        if (!isDuplicate && rollNumber) {
          const sameRoll = existingStudents.find(
            (s) =>
              String(s.rollNumber || '').trim().toLowerCase() ===
                rollNumber.toLowerCase() &&
              String(s.class || '').trim().toLowerCase() ===
                className.toLowerCase() &&
              String(s.section || '').trim().toLowerCase() ===
                section.toLowerCase()
          );
          if (sameRoll) {
            isDuplicate = true;
            duplicateReason = `Roll Number-ka ayaa hore loogu isticmaalay fasalkan (${sameRoll.id})`;
          }
        }

        if (!isDuplicate && nationalId) {
          const sameNationalId = existingStudents.find(
            (s) =>
              String(s.nationalId || '').trim().toLowerCase() ===
              nationalId.toLowerCase()
          );
          if (sameNationalId) {
            isDuplicate = true;
            duplicateReason = `National ID-ga ayaa hore loogu isticmaalay (${sameNationalId.id})`;
          }
        }

        return {
          index: idx + 1,
          fullName,
          className,
          gender,
          guardianPhone,
          guardianName: guardianName || undefined,
          section: section || undefined,
          rollNumber: rollNumber || undefined,
          address: address || undefined,
          guardianRelationship: guardianRelationship || undefined,
          guardianPhoneAlt: guardianPhoneAlt || undefined,
          nationalId: nationalId || undefined,
          previousSchool: previousSchool || undefined,
          bloodGroup: bloodGroup || undefined,
          medicalNotes: medicalNotes || undefined,
          isValid: errors.length === 0 && !isDuplicate,
          isDuplicate,
          errors: isDuplicate ? [...errors, duplicateReason] : errors,
          duplicateReason
        };
      });

      const seenKeys = new Set<string>();
      const rowsWithInternalDuplicates = processed.map((row) => {
        const key =
          row.fullName && row.className
            ? `${row.fullName.trim().toLowerCase()}::${row.className.trim().toLowerCase()}`
            : '';

        if (key && seenKeys.has(key)) {
          return {
            ...row,
            isValid: false,
            isDuplicate: true,
            duplicateReason:
              'Row kale oo isla magaca iyo fasalka leh ayaa faylkan ku jira'
          };
        }

        if (key) seenKeys.add(key);
        return row;
      });

      setParsedRows(rowsWithInternalDuplicates);
      setStep('preview');
      showToast(
        `Faylka waa la falanqeeyey: ${rowsWithInternalDuplicates.length} arday ayaa la helay`,
        'success'
      );
    } catch (error) {
      console.error('Student spreadsheet parse failed:', error);
      showToast('Khalad ayaa dhacay akhrinta faylka Excel/CSV', 'error');
    }
  };

  const visibleRows = parsedRows.filter((r) => {
    if (filterTab === 'valid') return r.isValid && !r.isDuplicate;
    if (filterTab === 'invalid') return !r.isValid;
    if (filterTab === 'duplicate') return r.isDuplicate;
    return true;
  });

  const validRowsCount = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const invalidRowsCount = parsedRows.filter((r) => !r.isValid).length;
  const duplicateRowsCount = parsedRows.filter((r) => r.isDuplicate).length;

  const handleExecuteImport = async () => {
    const importableRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
    if (importableRows.length === 0) {
      showToast('Ma jiraan xog sax ah oo la soo galin karo', 'warning');
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    const studentsToImport = importableRows.map((r) => ({
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? 'STD-' + crypto.randomUUID().slice(0, 8).toUpperCase()
        : 'STD-' + Date.now().toString(36).toUpperCase(),
      fullName: r.fullName,
      class: r.className,
      gender: r.gender,
      guardianPhone: r.guardianPhone,
      guardianName: r.guardianName,
      section: r.section,
      rollNumber: r.rollNumber,
      address: r.address,
      guardianRelationship: r.guardianRelationship,
      guardianPhoneAlt: r.guardianPhoneAlt,
      nationalId: r.nationalId,
      previousSchool: r.previousSchool,
      bloodGroup: r.bloodGroup,
      medicalNotes: r.medicalNotes,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    }));

    try {
      setImportProgress(50);
      const result = await onImportStudents(studentsToImport);
      setImportProgress(100);

      if (result.success) {
        setImportSummary({
          total: parsedRows.length,
          imported: result.imported,
          skipped: parsedRows.length - result.imported
        });
        setStep('complete');
        if (result.failed === 0) {
          showToast(`${result.imported} arday si guul leh ayaa loo soo geliyey!`, 'success');
        } else {
          showToast(`${result.imported} waa la geliyey, ${result.failed} waa fashilmeen.`, 'warning');
        }
      } else {
        showToast('Import-ka lama gelin wax arday ah. Hubi khaladaadka oo mar kale isku day.', 'error');
      }
    } catch {
      showToast('Khalad ayaa dhacay xilliga soo gelinta', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <PageContainer className="max-w-5xl mx-auto pb-16">
      <PageHeader
        breadcrumbs={[
          { label: 'Students', onClick: onCancel },
          { label: 'Import Students' }
        ]}
        title="Soo Gelinta Ardayda (Bulk Import)"
        description="Kala soo wareeg xogta ardayda faylasha Excel ama CSV adigoo ilaalinaya nidaamka xogta iyo kahortagga laban-laabashada."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Download className="w-4 h-4 text-[var(--color-brand)]" />}
              onClick={handleDownloadTemplate}
            >
              Soo Degso Template-ka Excel
            </Button>
            <Button
              variant="ghost"
              size="md"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={onCancel}
            >
              Ka Noqo
            </Button>
          </div>
        }
      />

      {/* STEP 1: Upload Step */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Diyaari Faylkaaga
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Soo degso template-ka rasmiga ah oo ku buuxi magacyada, fasallada, jinsiga, iyo telefoonka waalidka.
              </p>
              <ul className="text-[11px] text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
                <li>Magaca Ardayga (Waa Qasab)</li>
                <li>Fasalka (Waa Qasab)</li>
                <li>Telefoonka Waalidka (Waa Qasab)</li>
                <li>Lab/Dhedig (Male/Female)</li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-info-soft)] text-[var(--color-info)] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Hubin Toos ah & Kahortag
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Nidaamku wuxuu si toos ah u baari doonaa khaladaadka iyo haddii arday hore u jiray uu ku jiro liiska.
              </p>
              <div className="p-2.5 bg-[var(--color-warning-soft)] border border-[var(--color-warning-border)] rounded-lg text-[11px] text-[var(--color-warning)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Ardayda labanlaabanta ah si toos ah ayaa looga reebayaa.</span>
              </div>
            </Card>

            <Card className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Diiwaangeli Nidaamka
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Ardayda saxda ah kaliya ayaa lagu darayaa keydka xogta iyadoo aan waxyeello loo geysan ardayda hore.
              </p>
              <div className="p-2.5 bg-[var(--color-success-soft)] border border-[var(--color-success-border)] rounded-lg text-[11px] text-[var(--color-success)] flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>100% Badbaado leh (Production Safe)</span>
              </div>
            </Card>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className="border-2 border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-brand)] rounded-xl p-12 flex flex-col items-center justify-center gap-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
              <Upload className="w-7 h-7 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Halkan ku soo jiid faylka Excel ama CSV (Drag & Drop)
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Faylasha la taageero:{' '}
                <span className="font-mono text-[var(--color-text-secondary)]">.xlsx, .xls, .csv</span>
              </p>
            </div>
            <label className="px-5 py-2.5 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs">
              <span>Dooro Fayl Kombiyuutarkaaga</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Validation Step */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Guud ahaan Xogta"
              value={parsedRows.length}
              sublabel="Safafka la akhriyey"
            />
            <StatCard
              label="Sax ah (Diyaar)"
              value={validRowsCount}
              sublabel="Diyaar u ah soo gelin"
              variant="success"
            />
            <StatCard
              label="Laban-laab (Duplicate)"
              value={duplicateRowsCount}
              sublabel="Hore u diiwaangashan"
              variant="warning"
            />
            <StatCard
              label="Khalad ku jiro"
              value={invalidRowsCount}
              sublabel="Xog ka dhiman"
              variant="danger"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-1.5 bg-[var(--color-surface-muted)] p-1 rounded-lg border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterTab === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Dhammaan ({parsedRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('valid')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterTab === 'valid'
                    ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Sax Ah ({validRowsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('duplicate')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterTab === 'duplicate'
                    ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Laban-laab ({duplicateRowsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('invalid')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterTab === 'invalid'
                    ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Khalad ({invalidRowsCount})
              </button>
            </div>

            <div className="text-xs text-[var(--color-text-secondary)]">
              Kaliya ardayda saxda ah ee aan laban-laabmin ayaa la galinayaa ({validRowsCount} arday).
            </div>
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Xaaladda / Status</th>
                    <th className="p-3">Magaca Ardayga</th>
                    <th className="p-3">Fasalka</th>
                    <th className="p-3">Jinsiga</th>
                    <th className="p-3">Telefoonka Waalidka</th>
                    <th className="p-3">Faahfaahin / Xusuusin</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                        Wax arday ah kuma jiraan qaybtaan.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((r) => (
                      <tr key={r.index}>
                        <td className="p-3 text-center font-mono text-[var(--color-text-muted)]">
                          {r.index}
                        </td>
                        <td className="p-3">
                          {r.isValid && !r.isDuplicate ? (
                            <Badge variant="success">Diyaar</Badge>
                          ) : r.isDuplicate ? (
                            <Badge variant="warning">Laban-laab</Badge>
                          ) : (
                            <Badge variant="danger">Khalad</Badge>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-[var(--color-text-primary)]">
                          {r.fullName || '—'}
                        </td>
                        <td className="p-3 text-[var(--color-brand)] font-semibold">
                          {r.className || '—'}
                        </td>
                        <td className="p-3 text-[var(--color-text-secondary)]">{r.gender}</td>
                        <td className="p-3 font-mono text-[var(--color-text-secondary)]">
                          {r.guardianPhone || '—'}
                        </td>
                        <td className="p-3 text-[11px]">
                          {r.isDuplicate && (
                            <span className="text-[var(--color-warning)]">{r.duplicateReason}</span>
                          )}
                          {!r.isValid && (
                            <span className="text-[var(--color-danger)]">{r.errors.join(', ')}</span>
                          )}
                          {r.isValid && !r.isDuplicate && (
                            <span className="text-[var(--color-success)]">Xogtu waa sax</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-border)]">
            <Button variant="secondary" size="md" onClick={() => setStep('upload')}>
              Dib ugu Noqo Doorashada Faylka
            </Button>

            <Button
              variant="primary"
              size="md"
              disabled={validRowsCount === 0 || isImporting}
              loading={isImporting}
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleExecuteImport}
            >
              {isImporting
                ? `Soo Galinayaa... (${importProgress}%)`
                : `Soo Geli ${validRowsCount} Arday oo Sax ah`}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Complete & Summary Step */}
      {step === 'complete' && (
        <Card className="p-8 text-center space-y-6 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-success-soft)] text-[var(--color-success)] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Soo Gelintu Way Guulaysatay!
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Dhammaan xogtii saxda ahayd waxaa si nabadgelyo leh loogu daray nidaamka Dugsiga.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)]">
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)] font-semibold">
                Faylka Guud
              </div>
              <div className="text-lg font-mono font-bold text-[var(--color-text-primary)]">
                {importSummary.total}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-success)] font-semibold">
                La Diiwaangeliyey
              </div>
              <div className="text-lg font-mono font-bold text-[var(--color-success)]">
                {importSummary.imported}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-warning)] font-semibold">
                Laga Gudbay
              </div>
              <div className="text-lg font-mono font-bold text-[var(--color-warning)]">
                {importSummary.skipped}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="primary" size="md" onClick={onCancel}>
              U Gudub Liiska Ardayda (View All Students)
            </Button>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
