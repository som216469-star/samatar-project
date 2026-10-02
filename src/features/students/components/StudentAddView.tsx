import React, { useState, useEffect } from 'react';
import {
  User,
  School,
  Phone,
  FileText,
  Camera,
  AlertTriangle,
  ArrowLeft,
  Save,
  RotateCcw,
  Upload,
  X,
  Plus
} from 'lucide-react';
import { SchoolClass, Student } from '../../../types';
import { apiFetch } from '../../../lib/apiClient';
import { PageContainer, PageHeader } from '../../../components/layout/PageLayout';
import { Button, Card } from '../../../components/ui/primitives';

interface StudentAddViewProps {
  classes: SchoolClass[];
  existingStudents?: Student[];
  onAddStudent: (studentData: any) => Promise<boolean>;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

function generateStudentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return 'STD-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  }
  return 'STD-' + Date.now().toString(36).toUpperCase();
}

function compressImage(file: File, maxDim = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Image decode error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function StudentAddView({
  classes,
  existingStudents = [],
  onAddStudent,
  onCancel,
  showToast
}: StudentAddViewProps) {
  const [formData, setFormData] = useState({
    id: generateStudentId(),
    fullName: '',
    dateOfBirth: '',
    gender: 'Male' as 'Male' | 'Female',
    nationalId: '',
    class: classes[0]?.className || '',
    section: classes.find((item) => item.className === classes[0]?.className)?.section || '',
    rollNumber: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    guardianName: '',
    guardianRelationship: 'Father',
    guardianPhone: '',
    guardianPhoneAlt: '',
    address: '',
    previousSchool: '',
    bloodGroup: '',
    medicalNotes: '',
    photo: '',
    status: 'active' as 'active' | 'inactive' | 'archived'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    found: boolean;
    reason?: string;
    existingStudent?: any;
  }>({ found: false });

  const availableSections = Array.from(
    new Set(
      classes
        .filter((item) => item.className === formData.class)
        .map((item) => String(item.section || '').trim())
        .filter(Boolean)
    )
  );

  useEffect(() => {
    const cleanName = formData.fullName.trim().toLowerCase();
    const cleanClass = formData.class.trim().toLowerCase();
    const cleanPhone = formData.guardianPhone.trim();
    const cleanAltPhone = formData.guardianPhoneAlt.trim();
    const cleanId = formData.id.trim().toLowerCase();
    const cleanRoll = formData.rollNumber.trim().toLowerCase();
    const cleanSection = formData.section.trim().toLowerCase();
    const cleanNationalId = formData.nationalId.trim().toLowerCase();

    if (!cleanName && !cleanPhone) {
      setDuplicateWarning({ found: false });
      return;
    }

    const localMatch = existingStudents.find((s) => {
      const sameId = cleanId && s.id && s.id.toLowerCase() === cleanId;
      const sameNameClass =
        cleanName &&
        cleanClass &&
        s.fullName.trim().toLowerCase() === cleanName &&
        s.class === cleanClass;
      const samePhone =
        cleanPhone.length >= 7 &&
        s.guardianPhone &&
        s.guardianPhone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') &&
        s.fullName.trim().toLowerCase() === cleanName;
      const sameRoll =
        cleanRoll &&
        s.rollNumber &&
        s.rollNumber.trim().toLowerCase() === cleanRoll &&
        String(s.class || '').trim().toLowerCase() === cleanClass &&
        String(s.section || '').trim().toLowerCase() === cleanSection;
      const sameNationalId =
        cleanNationalId &&
        s.nationalId &&
        s.nationalId.trim().toLowerCase() === cleanNationalId;
      return Boolean(sameId || sameNameClass || samePhone || sameRoll || sameNationalId);
    });

    if (localMatch) {
      let reason = 'Ardaygan horey ayaa loo diiwaangeliyey';
      if (cleanId && localMatch.id.toLowerCase() === cleanId) {
        reason = 'Student ID-gan horey ayaa loo isticmaalay (Duplicate Student ID)';
      } else if (
        localMatch.fullName.trim().toLowerCase() === cleanName &&
        localMatch.class === cleanClass
      ) {
        reason = 'Magacan iyo fasalkan arday hore ayaa loogu diiwaangeliyey (Same Name & Class)';
      } else {
        reason = 'Magacan iyo telefoonka waalidka horey ayaa loo diiwaangeliyey';
      }
      setDuplicateWarning({
        found: true,
        reason,
        existingStudent: localMatch
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch('/api/students/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: formData.id.trim(),
            fullName: formData.fullName.trim(),
            className: formData.class,
            section: formData.section.trim(),
            guardianPhone: formData.guardianPhone.trim(),
            rollNumber: formData.rollNumber.trim(),
            nationalId: formData.nationalId.trim(),
            gender: formData.gender
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.duplicate || result.hasDuplicate) {
            const firstDup =
              result.existingStudent || (result.duplicates && result.duplicates[0]);
            setDuplicateWarning({
              found: true,
              reason: result.reason || firstDup?.matchReason,
              existingStudent: firstDup
            });
          } else {
            setDuplicateWarning({ found: false });
          }
        }
      } catch {
        // Ignore offline errors
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    formData.id,
    formData.fullName,
    formData.class,
    formData.section,
    formData.rollNumber,
    formData.nationalId,
    formData.guardianPhone,
    formData.guardianPhoneAlt,
    existingStudents
  ]);

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Fadlan soo geli sawir sax ah (PNG, JPG)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Xajmiga sawirku kama badnaan karo 5MB', 'warning');
      return;
    }
    try {
      const compressedDataUrl = await compressImage(file, 400, 0.85);
      setFormData((prev) => ({ ...prev, photo: compressedDataUrl }));
      showToast('Sawirka ardayga waa la habeeyey!', 'success');
    } catch {
      showToast('Khalad ayaa dhacay akhrinta sawirka', 'error');
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      errs.fullName = 'Magaca oo buuxa waa qasab (Full Name is required)';
    } else if (formData.fullName.trim().split(/\s+/).length < 2) {
      errs.fullName = 'Fadlan qor ugu yaraan 2 magac (At least two names)';
    }
    if (!formData.class) {
      errs.class = 'Fasalka waa qasab (Class is required)';
    } else if (availableSections.length > 0 && !formData.section.trim()) {
      errs.section = 'Section-ka waa qasab fasalkan.';
    }
    if (!formData.guardianPhone.trim()) {
      errs.guardianPhone = 'Telefoonka waalidka waa qasab (Guardian phone is required)';
    } else if (!/^[+0-9()\s.-]{7,30}$/.test(formData.guardianPhone.trim())) {
      errs.guardianPhone = 'Fadlan geli lambar telefoon sax ah';
    }

    if (formData.guardianPhoneAlt && !/^[+0-9()\s.-]{7,30}$/.test(formData.guardianPhoneAlt.trim())) {
      errs.guardianPhoneAlt = 'Telefoonka labaad ma saxna';
    }

    if (formData.dateOfBirth) {
      const parsedDob = new Date(formData.dateOfBirth + 'T00:00:00');
      if (Number.isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
        errs.dateOfBirth = 'Taariikhda dhalashada ma saxna';
      }
    }

    if (formData.enrollmentDate) {
      const parsedEnrollmentDate = new Date(formData.enrollmentDate + 'T00:00:00');
      if (Number.isNaN(parsedEnrollmentDate.getTime()) || parsedEnrollmentDate > new Date()) {
        errs.enrollmentDate = 'Taariikhda diiwaangelintu ma saxna';
      }
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstMsg = Object.values(errs)[0];
      showToast(firstMsg, 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const nowDate = new Date().toISOString().split('T')[0];
    const newStudent = {
      id: formData.id.trim() || generateStudentId(),
      fullName: formData.fullName.trim(),
      class: formData.class,
      gender: formData.gender,
      guardianPhone: formData.guardianPhone.trim(),
      guardianName: formData.guardianName.trim() || undefined,
      guardianRelationship: formData.guardianRelationship || undefined,
      guardianPhoneAlt: formData.guardianPhoneAlt.trim() || undefined,
      status: formData.status,
      photo: formData.photo || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      address: formData.address.trim() || undefined,
      section: formData.section.trim() || undefined,
      rollNumber: formData.rollNumber.trim() || undefined,
      nationalId: formData.nationalId.trim() || undefined,
      previousSchool: formData.previousSchool.trim() || undefined,
      bloodGroup: formData.bloodGroup || undefined,
      medicalNotes: formData.medicalNotes.trim() || undefined,
      createdAt: formData.enrollmentDate || nowDate,
      updatedAt: new Date().toISOString()
    };

    try {
      const success = await onAddStudent(newStudent);
      if (success) {
        showToast('Arday cusub si guul leh ayaa loo diiwaangeliyey!', 'success');
        if (addAnother) {
          setFormData({
            id: generateStudentId(),
            fullName: '',
            dateOfBirth: '',
            gender: 'Male',
            nationalId: '',
            class: formData.class,
            section: formData.section,
            rollNumber: '',
            enrollmentDate: nowDate,
            guardianName: '',
            guardianRelationship: 'Father',
            guardianPhone: '',
            guardianPhoneAlt: '',
            address: '',
            previousSchool: '',
            bloodGroup: '',
            medicalNotes: '',
            photo: '',
            status: 'active'
          });
          setDuplicateWarning({ found: false });
        } else {
          onCancel();
        }
      }
    } catch {
      showToast('Khalad ayaa dhacay diiwaangelinta ardayga', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer className="max-w-5xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: 'Students', onClick: onCancel },
          { label: 'Add Student' }
        ]}
        title="Diiwaangelinta Arday Cusub"
        subtitle="Buuxi xogta shakhsiga, fasalka, iyo xiriirka waalidka si habaysan."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={onCancel}
          >
            Ka Noqo (Cancel)
          </Button>
        }
      />

      {duplicateWarning.found && (
        <div className="p-4 rounded-lg bg-[var(--color-warning-soft)] border border-[var(--color-warning-border)] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-[var(--color-warning)] mt-0.5" />
          <div className="flex-1 text-xs space-y-1">
            <p className="font-bold text-[var(--color-warning)]">
              Digniin: Arday Nuucaan ah Horey Ayuu U Jiray! (Potential Duplicate Detected)
            </p>
            <p className="text-[var(--color-text-primary)] leading-relaxed">
              {duplicateWarning.reason ||
                'Arday magacan iyo fasalkan wata ayaa horey ugu jiray nidaamka.'}
            </p>
            {duplicateWarning.existingStudent && (
              <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                Ardayga Hore: {duplicateWarning.existingStudent.fullName} · ID:{' '}
                {duplicateWarning.existingStudent.id} · Fasal:{' '}
                {duplicateWarning.existingStudent.class}
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 text-xs">
        {/* SECTION 1: Personal Information */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="w-8 h-8 rounded-md bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] text-[var(--color-brand)] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                01. Xogta Shakhsiga (Personal Information)
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Magaca rasmiga ah, taariikhda dhalashada, iyo jinsiga
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-[var(--color-text-secondary)] flex items-center justify-between">
                <span>Magaca oo Buuxa (Full Name) *</span>
                {formErrors.fullName && (
                  <span className="text-[var(--color-danger)]">{formErrors.fullName}</span>
                )}
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: '' });
                }}
                placeholder="Tusaale: Maxamed Cali Jaamac"
                className="w-full ds-input"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Jinsiga (Gender) *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Male' })}
                  className={`py-2 px-4 rounded-md border text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    formData.gender === 'Male'
                      ? 'bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-brand)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  <span>Lab (Male)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Female' })}
                  className={`py-2 px-4 rounded-md border text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    formData.gender === 'Female'
                      ? 'bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-brand)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  <span>Dhedig (Female)</span>
                </button>
              </div>
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
              {formErrors.dateOfBirth && (
                <p className="text-[11px] text-[var(--color-danger)] font-semibold">
                  {formErrors.dateOfBirth}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Lambarka Aqoonsiga / National ID (Optional)
              </label>
              <input
                type="text"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="Tusaale: SOM-98214"
                className="w-full ds-input font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Xaaladda Diiwaanka (Initial Status)
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full ds-input"
              >
                <option value="active">Active (Firfircoon)</option>
                <option value="inactive">Inactive (Aan Firfircoonayn)</option>
                <option value="archived">Archived (Kaydsan)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* SECTION 2: School Enrollment */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="w-8 h-8 rounded-md bg-[var(--color-success-soft)] border border-[var(--color-success-border)] text-[var(--color-success)] flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                02. Qorista Iskuulka (School Enrollment)
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Fasalka, qeybta, roll number-ka, iyo taariikhda qorista
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] flex items-center justify-between">
                <span>Fasalka (Class) *</span>
                {formErrors.class && (
                  <span className="text-[var(--color-danger)]">{formErrors.class}</span>
                )}
              </label>
              <select
                value={formData.class}
                onChange={(e) => {
                  const nextClass = e.target.value;
                  const nextSections = Array.from(
                    new Set(
                      classes
                        .filter((item) => item.className === nextClass)
                        .map((item) => String(item.section || '').trim())
                        .filter(Boolean)
                    )
                  );
                  setFormData({
                    ...formData,
                    class: nextClass,
                    section: nextSections.includes(formData.section)
                      ? formData.section
                      : nextSections[0] || ''
                  });
                  if (formErrors.class) setFormErrors({ ...formErrors, class: '' });
                }}
                className="w-full ds-input"
                required
              >
                <option value="">-- Dooro Fasal --</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.className}>
                    {item.className}{item.section ? ` · Section ${item.section}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                {availableSections.length > 0 ? 'Qeybta / Section *' : 'Qeybta / Section (Optional)'}
              </label>
              {availableSections.length > 0 ? (
                <select
                  value={formData.section}
                  onChange={(e) => {
                    setFormData({ ...formData, section: e.target.value });
                    if (formErrors.section) {
                      setFormErrors({ ...formErrors, section: '' });
                    }
                  }}
                  className="w-full ds-input"
                >
                  <option value="">-- Dooro Section --</option>
                  {availableSections.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="Tusaale: A, B, C"
                  className="w-full ds-input"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Roll / Admission Number
              </label>
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="Tusaale: 01"
                className="w-full ds-input font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-[var(--color-text-secondary)] flex items-center justify-between">
                <span>Student ID / Aqoonsiga Ardayga</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, id: generateStudentId() })}
                  className="text-[11px] text-[var(--color-brand)] hover:underline flex items-center gap-1 font-mono cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Cusbooneysii ID
                </button>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="STD-1001"
                className="w-full ds-input font-mono font-bold text-[var(--color-brand)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Taariikhda Diiwaangelinta
              </label>
              <input
                type="date"
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className="w-full ds-input"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 3: Guardian Contact */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="w-8 h-8 rounded-md bg-[var(--color-info-soft)] border border-[var(--color-info-border)] text-[var(--color-info)] flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                03. Xogta Waalidka / Mas&apos;uulka (Guardian Contact)
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Magaca waalidka, telefoonka tooska ah, iyo goobta deegaanka
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Magaca Waalidka / Mas&apos;uulka
              </label>
              <input
                type="text"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                placeholder="Tusaale: Cali Jaamac Maxamed"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Xiriirka Ardayga (Relationship)
              </label>
              <select
                value={formData.guardianRelationship}
                onChange={(e) =>
                  setFormData({ ...formData, guardianRelationship: e.target.value })
                }
                className="w-full ds-input"
              >
                <option value="Father">Aabbe (Father)</option>
                <option value="Mother">Hooyo (Mother)</option>
                <option value="Uncle">Adeer / Eedo (Uncle/Aunt)</option>
                <option value="Guardian">Mas&apos;uul Guud (Legal Guardian)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] flex items-center justify-between">
                <span>Telefoonka Waalidka (Primary Phone) *</span>
                {formErrors.guardianPhone && (
                  <span className="text-[var(--color-danger)]">{formErrors.guardianPhone}</span>
                )}
              </label>
              <input
                type="tel"
                value={formData.guardianPhone}
                onChange={(e) => {
                  setFormData({ ...formData, guardianPhone: e.target.value });
                  if (formErrors.guardianPhone)
                    setFormErrors({ ...formErrors, guardianPhone: '' });
                }}
                placeholder="+252 61 5123456"
                className="w-full ds-input font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Telefoon Dheeraad ah (Alternate Phone)
              </label>
              <input
                type="tel"
                value={formData.guardianPhoneAlt}
                onChange={(e) => setFormData({ ...formData, guardianPhoneAlt: e.target.value })}
                placeholder="+252 61 5000000"
                className="w-full ds-input font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Cinwaanka / Deegaanka (Home Address)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Tusaale: Degmada Hodan, Xaafadda Taleex, Muqdisho"
                className="w-full ds-input"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 4: Additional Information */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="w-8 h-8 rounded-md bg-[var(--color-warning-soft)] border border-[var(--color-warning-border)] text-[var(--color-warning)] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                04. Macluumaad Dheeraad ah (Additional Information)
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Iskuulkii hore, dhiigga, iyo xaaladaha caafimaad
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Iskuulkii Hore (Previous School)
              </label>
              <input
                type="text"
                value={formData.previousSchool}
                onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                placeholder="Tusaale: Dugsiga Al-Hikmah"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Nooca Dhiigga (Blood Group)
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full ds-input"
              >
                <option value="">Lama oga (Unknown)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-[var(--color-text-secondary)] block">
                Xusuusin Caafimaad (Medical Notes / Allergies)
              </label>
              <textarea
                rows={2}
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                placeholder="Wax kasta oo muhiim ah oo ku saabsan caafimaadka..."
                className="w-full ds-input"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 5: Student Photo */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="w-8 h-8 rounded-md bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] text-[var(--color-brand)] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                05. Sawirka Ardayga (Student Photo)
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Sawirka aqoonsiga ee ardayga
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {formData.photo ? (
              <div className="relative shrink-0">
                <img
                  src={formData.photo}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-[var(--color-brand)]"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, photo: '' })}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--color-danger)] text-white flex items-center justify-center shadow cursor-pointer"
                  title="Ka saar sawirka"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg bg-[var(--color-surface-muted)] border border-dashed border-[var(--color-border-strong)] flex flex-col items-center justify-center text-[var(--color-text-muted)] shrink-0">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-mono">Sawir Ma Jiro</span>
              </div>
            )}

            <label
              className="flex-1 w-full border-2 border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-brand)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[var(--color-surface-muted)] transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handlePhotoUpload(file);
              }}
            >
              <Upload className="w-5 h-5 text-[var(--color-brand)]" />
              <div className="text-center">
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Guji si aad sawir u doorato ama halkan ku soo jiid (Drag & Drop)
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  JPG, PNG (Si toos ah ayaa loogu dhimayaa cabbir ku habboon)
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f);
                }}
                className="hidden"
              />
            </label>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onCancel}>
            Ka Noqo (Cancel)
          </Button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="md"
              disabled={isSubmitting}
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={(e) => handleSubmit(e as any, true)}
            >
              Kaydi & Mid Kale Ku Dar
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Diiwaangelinayaa...' : 'Kaydi oo Diiwaangeli'}
            </Button>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}
