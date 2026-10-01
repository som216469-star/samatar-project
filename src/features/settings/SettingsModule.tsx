import React from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Download,
  Upload,
  AlertCircle,
  ShieldCheck,
  DollarSign,
  Award,
  Save
} from 'lucide-react';
import {
  SystemSettings,
  Student,
  SchoolClass,
  SchoolSubject,
  ExamScore,
  DbStatus
} from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import { Button, FormField, FormSection, StatusBadge } from '../../components/ui/primitives';

export interface SettingsModuleProps {
  settings: SystemSettings;
  onChangeSettings: (settings: SystemSettings) => void;
  onSaveSettings: (e: React.FormEvent) => Promise<void>;
  students: Student[];
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  examScores: ExamScore[];
  dbStatus: DbStatus | null;
  onExportAllData: () => void;
  onImportAllData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFactoryReset: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  settings,
  onChangeSettings,
  onSaveSettings,
  students,
  classes,
  subjects,
  examScores,
  dbStatus,
  onExportAllData,
  onImportAllData,
  onFactoryReset
}) => {
  return (
    <PageContainer>
      <PageHeader
        title="System Configuration & Governance"
        subtitle="Manage institutional identity, academic grading standards, financial defaults, and data backups"
        badge={
          dbStatus ? (
            <StatusBadge tone={dbStatus.connected ? 'success' : 'warning'}>
              {dbStatus.connected ? 'Cloud Database Connected' : 'Local Fallback Active'}
            </StatusBadge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Structured Configuration Form */}
        <form onSubmit={onSaveSettings} className="lg:col-span-2 space-y-6">
          {/* 1. Institutional Profile */}
          <FormSection
            title="1. Institutional Profile & Identity"
            description="Official school name, academic year, and contact details used on reports and invoices"
            icon={<ShieldCheck className="w-4 h-4" />}
          >
            <FormField label="Official School Name" required>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => onChangeSettings({ ...settings, schoolName: e.target.value })}
                className="ds-input w-full"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Academic Year">
                <input
                  type="text"
                  value={settings.academicYear || '2025/2026'}
                  onChange={(e) => onChangeSettings({ ...settings, academicYear: e.target.value })}
                  className="ds-input w-full"
                />
              </FormField>
              <FormField label="Official Email">
                <input
                  type="email"
                  value={settings.schoolEmail || ''}
                  onChange={(e) => onChangeSettings({ ...settings, schoolEmail: e.target.value })}
                  className="ds-input w-full"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Phone Number">
                <input
                  type="text"
                  value={settings.schoolPhone || ''}
                  onChange={(e) => onChangeSettings({ ...settings, schoolPhone: e.target.value })}
                  className="ds-input w-full"
                />
              </FormField>
              <FormField label="Campus Address">
                <input
                  type="text"
                  value={settings.schoolAddress || ''}
                  onChange={(e) => onChangeSettings({ ...settings, schoolAddress: e.target.value })}
                  className="ds-input w-full"
                />
              </FormField>
            </div>
          </FormSection>

          {/* 2. Financial & Theme Defaults */}
          <FormSection
            title="2. Financial & Appearance Defaults"
            description="Default billing currency, monthly tuition baseline, and system visual theme"
            icon={<DollarSign className="w-4 h-4" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Currency Symbol / Code" required>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => onChangeSettings({ ...settings, currency: e.target.value })}
                  className="ds-input w-full font-mono"
                  required
                />
              </FormField>

              <FormField label="Default Monthly Fee" required>
                <input
                  type="number"
                  value={settings.feeAmount}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, feeAmount: Number(e.target.value) })
                  }
                  className="ds-input w-full font-mono"
                  required
                />
              </FormField>

              <FormField label="Default Visual Theme">
                <select
                  value={settings.systemTheme}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      systemTheme: e.target.value as 'light' | 'dark'
                    })
                  }
                  className="ds-input w-full"
                >
                  <option value="light">Light Theme</option>
                  <option value="dark">Dark Theme</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          {/* 3. Academic Grading Thresholds */}
          <FormSection
            title="3. Academic Grading & Pass Thresholds"
            description="Minimum score percentages required for each academic grade tier"
            icon={<Award className="w-4 h-4" />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <FormField label="Pass (%)">
                <input
                  type="number"
                  value={settings.passThreshold || 60}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, passThreshold: Number(e.target.value) })
                  }
                  className="ds-input w-full font-mono"
                />
              </FormField>
              <FormField label="Grade A (%)">
                <input
                  type="number"
                  value={settings.gradeAThreshold || 90}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, gradeAThreshold: Number(e.target.value) })
                  }
                  className="ds-input w-full font-mono"
                />
              </FormField>
              <FormField label="Grade B (%)">
                <input
                  type="number"
                  value={settings.gradeBThreshold || 80}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, gradeBThreshold: Number(e.target.value) })
                  }
                  className="ds-input w-full font-mono"
                />
              </FormField>
              <FormField label="Grade C (%)">
                <input
                  type="number"
                  value={settings.gradeCThreshold || 70}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, gradeCThreshold: Number(e.target.value) })
                  }
                  className="ds-input w-full font-mono"
                />
              </FormField>
              <FormField label="Grade D (%)">
                <input
                  type="number"
                  value={settings.gradeDThreshold || 60}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, gradeDThreshold: Number(e.target.value) })
                  }
                  className="ds-input w-full font-mono"
                />
              </FormField>
            </div>
          </FormSection>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={<Save className="w-4 h-4" />}
            >
              Save System Configuration
            </Button>
          </div>
        </form>

        {/* Right Column: Data Backup & Danger Zone */}
        <div className="space-y-6">
          <FormSection
            title="Database Backup & Restore"
            description="Export a full JSON snapshot of your school database or restore from a backup file"
            icon={<Database className="w-4 h-4" />}
          >
            <div className="grid grid-cols-2 gap-2.5 text-center font-mono">
              <div className="ds-surface-muted p-3">
                <p className="text-base font-bold text-[var(--color-text-primary)]">
                  {students.length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Students
                </p>
              </div>
              <div className="ds-surface-muted p-3">
                <p className="text-base font-bold text-[var(--color-text-primary)]">
                  {classes.length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Classes
                </p>
              </div>
              <div className="ds-surface-muted p-3">
                <p className="text-base font-bold text-[var(--color-text-primary)]">
                  {subjects.length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Subjects
                </p>
              </div>
              <div className="ds-surface-muted p-3">
                <p className="text-base font-bold text-[var(--color-text-primary)]">
                  {examScores.length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Exams
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                variant="success"
                size="md"
                fullWidth
                icon={<Download className="w-4 h-4" />}
                onClick={onExportAllData}
              >
                Export Full Backup (JSON)
              </Button>

              <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-[var(--color-warning)]" />
                <span>Restore Backup File (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportAllData}
                  className="hidden"
                />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Danger Zone"
            description="Irreversible system reset. Permanently clears all institutional records."
            icon={<AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />}
            className="border-[var(--color-danger-border)]"
          >
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Factory Reset permanently deletes all students, classes, fees, and attendance records.
              Export a JSON backup before proceeding.
            </p>
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={onFactoryReset}
            >
              Factory Reset System
            </Button>
          </FormSection>
        </div>
      </div>
    </PageContainer>
  );
};
