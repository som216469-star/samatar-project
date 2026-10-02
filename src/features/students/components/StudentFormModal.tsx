import React from 'react';
import {
  Camera,
  User,
  School,
  PhoneCall,
  AlertTriangle
} from 'lucide-react';
import { SchoolClass, Student } from '../../../types';
import { Button, Modal } from '../../../components/ui/primitives';

export interface StudentFormData {
  id: string;
  fullName: string;
  class: string;
  section: string;
  rollNumber: string;
  gender: 'Male' | 'Female' | string;
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  status: 'active' | 'inactive' | 'archived';
  photo: string;
  createdAt: string;
  guardianRelationship: string;
  guardianPhoneAlt: string;
  nationalId: string;
  previousSchool: string;
  bloodGroup: string;
  medicalNotes: string;
}

export interface StudentFormModalProps {
  isOpen?: boolean;
  showFormModal?: boolean;
  editingStudent: Student | null;
  formStep: 'identity' | 'enrollment' | 'guardian';
  setFormStep: React.Dispatch<React.SetStateAction<'identity' | 'enrollment' | 'guardian'>>;
  formData: StudentFormData;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  duplicateWarning:
    | Student
    | { found: boolean; reason?: string; existingStudent?: Student }
    | null;
  formSubmitting: boolean;
  classes: SchoolClass[];
  onCloseFormModal: () => void;
  onSaveStudent?: (e: React.FormEvent) => void;
  onSubmitStudentForm?: (e: React.FormEvent) => void;
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhotoFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenProfile?: (student: Student) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  showFormModal,
  editingStudent,
  formStep,
  setFormStep,
  formData,
  setFormData,
  formErrors = {} as Record<string, string>,
  setFormErrors,
  duplicateWarning,
  formSubmitting,
  classes = [],
  onCloseFormModal,
  onSaveStudent,
  onSubmitStudentForm,
  onPhotoUpload,
  onPhotoFileChange,
  onOpenProfile
}) => {
  const resolvedOpen = Boolean(isOpen ?? showFormModal);
  const resolvedSave = onSaveStudent || onSubmitStudentForm || ((e: React.FormEvent) => e.preventDefault());
  const resolvedPhotoHandler = onPhotoUpload || onPhotoFileChange || (() => {});

  const dupStudent: Student | null =
    duplicateWarning && 'found' in duplicateWarning
      ? duplicateWarning.found
        ? duplicateWarning.existingStudent || null
        : null
      : (duplicateWarning as Student | null);

  return (
    <Modal
      isOpen={resolvedOpen}
      onClose={onCloseFormModal}
      size="lg"
      title={editingStudent ? 'Tafatir Xogta Ardayga' : 'Diiwaangeli Arday Cusub'}
      subtitle={
        editingStudent
          ? `Student ID: ${editingStudent.id}`
          : 'Buuxi xogta aasaasiga ah, fasalka, iyo waalidka'
      }
      footer={
        <div className="w-full flex items-center justify-between">
          <div>
            {formStep === 'enrollment' && (
              <Button variant="secondary" size="sm" onClick={() => setFormStep('identity')}>
                Dib ugu noqo (Back)
              </Button>
            )}
            {formStep === 'guardian' && (
              <Button variant="secondary" size="sm" onClick={() => setFormStep('enrollment')}>
                Dib ugu noqo (Back)
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={onCloseFormModal}>
              Ka noqo
            </Button>

            {formStep !== 'guardian' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (formStep === 'identity') {
                    if (!formData.fullName.trim()) {
                      setFormErrors({ fullName: 'Magaca ardayga waa qasab' });
                      return;
                    }
                    setFormStep('enrollment');
                  } else if (formStep === 'enrollment') {
                    if (!formData.class) {
                      setFormErrors({ class: 'Fasalka waa qasab' });
                      return;
                    }
                    setFormStep('guardian');
                  }
                }}
              >
                Xiga (Next Step)
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                loading={formSubmitting}
                onClick={resolvedSave as any}
              >
                {editingStudent ? 'Cusbooneysii (Update)' : 'Kaydi Ardayga (Save)'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Stepper Header */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setFormStep('identity')}
            className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              formStep === 'identity'
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1. Aqoonsiga</span>
          </button>

          <button
            type="button"
            onClick={() => setFormStep('enrollment')}
            className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              formStep === 'enrollment'
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>2. Fasalka</span>
          </button>

          <button
            type="button"
            onClick={() => setFormStep('guardian')}
            className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              formStep === 'guardian'
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>3. Waalidka</span>
          </button>
        </div>

        {/* Duplicate Warning */}
        {dupStudent && (
          <div className="p-3.5 rounded-lg bg-[var(--color-warning-soft)] border border-[var(--color-warning-border)] flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-[var(--color-warning)]">
                Digniin: Arday u eg kan ayaa horey u diiwaangashanaa!
              </p>
              <p className="text-[var(--color-text-secondary)]">
                Magaca: <strong>{dupStudent.fullName}</strong> · Fasalka:{' '}
                <strong>{dupStudent.class}</strong> · Tel:{' '}
                <span className="font-mono">{dupStudent.guardianPhone || 'N/A'}</span>
              </p>
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseFormModal();
                    onOpenProfile(dupStudent);
                  }}
                  className="text-[11px] text-[var(--color-brand)] underline font-semibold cursor-pointer"
                >
                  Eeg Profile-ka ardaygaas →
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={resolvedSave} className="space-y-4 text-xs">
          {formStep === 'identity' && (
            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-4 p-3.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg">
                <div className="relative">
                  {formData.photo ? (
                    <img
                      src={formData.photo}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover border border-[var(--color-brand)]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Sawirka Ardayga (Ikhtiyaari)
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] cursor-pointer font-semibold">
                      Dooro Sawir
                      <input
                        type="file"
                        accept="image/*"
                        onChange={resolvedPhotoHandler}
                        className="hidden"
                      />
                    </label>
                    {formData.photo && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photo: '' })}
                        className="text-xs text-[var(--color-danger)] hover:underline cursor-pointer"
                      >
                        Masax
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--color-text-secondary)] block">
                  Magaca Ardayga oo Saddexan (Full Name) *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (formErrors.fullName)
                      setFormErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="Tusaale: Maxamed Cali Jaamac"
                  className="w-full ds-input"
                  required
                />
                {formErrors.fullName && (
                  <p className="text-[11px] text-[var(--color-danger)] font-semibold">
                    {formErrors.fullName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Jinsiga (Gender) *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full ds-input"
                  >
                    <option value="Male">Lab (Male)</option>
                    <option value="Female">Dhedig (Female)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Taariikhda Dhalashada (Date of Birth)
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full ds-input"
                  />
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    National ID
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="Tusaale: 123456789"
                    className="w-full ds-input font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    placeholder="Tusaale: O+"
                    className="w-full ds-input"
                  />
                </div>
              </div>
            </div>
          )}

          {formStep === 'enrollment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Fasalka (Class) *
                  </label>
                  <select
                    value={formData.class}
                    onChange={(e) => {
                      setFormData({ ...formData, class: e.target.value });
                      if (formErrors.class) setFormErrors((prev) => ({ ...prev, class: '' }));
                    }}
                    className="w-full ds-input"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.className}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Qaybta / Section (A, B, C)
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="Tusaale: A"
                    className="w-full ds-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="Tusaale: 01"
                    className="w-full ds-input font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Xaaladda Ardayga (Status) *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full ds-input"
                  >
                    <option value="active">Active (Firfircoon)</option>
                    <option value="inactive">Inactive (Aan Firfircoonayn)</option>
                    <option value="archived">Archived (La Kaydiyey)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--color-text-secondary)] block">
                  Taariikhda Diiwaangelinta (Registration Date)
                </label>
                <input
                  type="date"
                  value={formData.createdAt}
                  onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                  className="w-full ds-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--color-text-secondary)] block">
                  Iskuulkii Hore (Previous School)
                </label>
                <input
                  type="text"
                  value={formData.previousSchool}
                  onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                  placeholder="Magaca iskuulkii hore"
                  className="w-full ds-input"
                />
              </div>
            </div>
          )}

          {formStep === 'guardian' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Magaca Waalidka / Mas&apos;uulka (Guardian Name)
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Tusaale: Cali Jaamac"
                    className="w-full ds-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Telefoonka Waalidka (Guardian Phone)
                  </label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => {
                      setFormData({ ...formData, guardianPhone: e.target.value });
                      if (formErrors.guardianPhone)
                        setFormErrors((prev) => ({ ...prev, guardianPhone: '' }));
                    }}
                    placeholder="+252 61 xxx xxxx"
                    className="w-full ds-input font-mono"
                  />
                  {formErrors.guardianPhone && (
                    <p className="text-[11px] text-[var(--color-danger)] font-semibold">
                      {formErrors.guardianPhone}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Xiriirka Waalidka (Relationship)
                  </label>
                  <input
                    type="text"
                    value={formData.guardianRelationship}
                    onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                    placeholder="Tusaale: Aabbe, Hooyo, Adeer"
                    className="w-full ds-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Telefoon Labaad (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.guardianPhoneAlt}
                    onChange={(e) => setFormData({ ...formData, guardianPhoneAlt: e.target.value })}
                    placeholder="+252 ..."
                    className="w-full ds-input font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--color-text-secondary)] block">
                    Xusuusin Caafimaad (Medical Notes)
                  </label>
                  <input
                    type="text"
                    value={formData.medicalNotes}
                    onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                    placeholder="Optional"
                    className="w-full ds-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--color-text-secondary)] block">
                  Cinwaanka Guriga / Deegaanka (Home Address)
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Degmada, Xaafadda, ama Laanta..."
                  className="w-full ds-input"
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};
