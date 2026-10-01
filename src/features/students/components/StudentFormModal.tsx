import React from 'react';
import { X, AlertTriangle, Camera, RefreshCw, Check } from 'lucide-react';
import { Student, SchoolClass } from '../../../types';

interface StudentFormModalProps {
  showFormModal: boolean;
  onCloseFormModal: () => void;
  editingStudent: Student | null;
  formStep: 'identity' | 'enrollment' | 'guardian';
  setFormStep: (step: 'identity' | 'enrollment' | 'guardian') => void;
  formData: {
    id: string;
    fullName: string;
    class: string;
    gender: string;
    guardianPhone: string;
    guardianName: string;
    status: 'active' | 'inactive' | 'archived';
    photo: string;
    dateOfBirth: string;
    address: string;
    section: string;
    rollNumber: string;
    createdAt: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  formSubmitting: boolean;
  duplicateWarning: {
    found: boolean;
    reason?: string;
    existingStudent?: any;
  };
  classes: SchoolClass[];
  onPhotoFileChange: (file: File) => void;
  onSubmitStudentForm: (e: React.FormEvent) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  showFormModal,
  onCloseFormModal,
  editingStudent,
  formStep,
  setFormStep,
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  formSubmitting,
  duplicateWarning,
  classes,
  onPhotoFileChange,
  onSubmitStudentForm
}) => {
  if (!showFormModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={editingStudent ? 'Tafatir Ardayga' : 'Diiwaangeli Arday Cusub'}
    >
      <div className="bg-[#0f0f0f] border border-[#ffffff15] rounded-sm w-full max-w-2xl shadow-2xl relative my-8 overflow-hidden">
        <div className="bg-[#141414] border-b border-[#ffffff10] p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif italic text-white">
              {editingStudent
                ? 'Tafatir Ardayga (Edit Student)'
                : 'Diiwaangeli Arday Cusub (Register New Student)'}
            </h2>
            <p className="text-[10px] text-[#888888] uppercase tracking-widest mt-0.5">
              Dugsi Pro 2026 — Smart Student Registration Engine
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseFormModal}
            aria-label="Close modal"
            className="p-2 text-[#737373] hover:text-white rounded-sm hover:bg-[#ffffff05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-[#ffffff10] bg-[#0a0a0a]">
          <button
            type="button"
            onClick={() => setFormStep('identity')}
            className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${
              formStep === 'identity'
                ? 'border-[#7c3aed] text-white bg-[#7c3aed]/5'
                : 'border-transparent text-[#737373] hover:text-white'
            }`}
          >
            1. Macluumaadka Ardayga
          </button>
          <button
            type="button"
            onClick={() => setFormStep('enrollment')}
            className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${
              formStep === 'enrollment'
                ? 'border-[#7c3aed] text-white bg-[#7c3aed]/5'
                : 'border-transparent text-[#737373] hover:text-white'
            }`}
          >
            2. Fasalka & Diiwaanka
          </button>
          <button
            type="button"
            onClick={() => setFormStep('guardian')}
            className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${
              formStep === 'guardian'
                ? 'border-[#7c3aed] text-white bg-[#7c3aed]/5'
                : 'border-transparent text-[#737373] hover:text-white'
            }`}
          >
            3. Waalidka & Xiriirka
          </button>
        </div>

        {duplicateWarning.found && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 p-3 flex items-start gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">
                ⚠️ Digniin: Arday shabbaha ayaa jira (Potential Duplicate)
              </p>
              <p className="text-[11px] text-[#e5e5e5] mt-0.5">
                {duplicateWarning.reason}:{' '}
                <strong className="text-amber-300">
                  {duplicateWarning.existingStudent?.fullName}
                </strong>{' '}
                ({duplicateWarning.existingStudent?.class}).
              </p>
            </div>
          </div>
        )}

        <form onSubmit={onSubmitStudentForm} className="p-6 space-y-6">
          {formStep === 'identity' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-sm bg-[#0a0a0a] border border-[#ffffff10]">
                <div className="relative group">
                  {formData.photo ? (
                    <img
                      src={formData.photo}
                      alt="Student Preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#7c3aed]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1e1e1e] border-2 border-dashed border-[#444444] flex flex-col items-center justify-center text-[#737373]">
                      <Camera className="w-6 h-6" />
                      <span className="text-[9px] mt-1 uppercase tracking-wider">Sawir</span>
                    </div>
                  )}
                  {formData.photo && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, photo: '' }))}
                      aria-label="Remove photo"
                      className="absolute -top-1 -right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                      title="Tirtir Sawirka"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <p className="text-xs font-bold text-white">Sawirka Ardayga (Student Photo)</p>
                  <p className="text-[10px] text-[#888888]">
                    Jiid sawirka halkan ama ka dooro kombuyutarka. Xajmiga ugu sarreeya 5MB.
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#ffffff10] hover:bg-[#ffffff15] text-xs font-semibold text-[#c4b5fd] cursor-pointer transition-colors border border-[#ffffff10]">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Dooro Sawir (Select Photo)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onPhotoFileChange(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                  Magaca Ardayga oo Buuxa (Full Name) *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="Tusaale: Maxamed Cali Jaamac"
                  className={`w-full px-4 py-2.5 rounded-sm border bg-[#0a0a0a] text-xs text-white focus:outline-none ${
                    formErrors.fullName
                      ? 'border-rose-500'
                      : 'border-[#ffffff15] focus:border-[#7c3aed]'
                  }`}
                  required
                />
                {formErrors.fullName && (
                  <p className="text-[10px] text-rose-400 font-semibold">{formErrors.fullName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                    Student ID / Admission No
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    disabled={!!editingStudent}
                    className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs font-mono text-[#c4b5fd] focus:outline-none focus:border-[#7c3aed] disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                    Lab/Dhedig (Gender) *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="Male">Lab (Male)</option>
                    <option value="Female">Dhedig (Female)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                  Taariikhda Dhalashada (Date of Birth)
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>
          )}

          {formStep === 'enrollment' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                    Fasalka (Class) *
                  </label>
                  <select
                    value={formData.class}
                    onChange={(e) => {
                      setFormData({ ...formData, class: e.target.value });
                      if (formErrors.class) setFormErrors((prev) => ({ ...prev, class: '' }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-sm border bg-[#0a0a0a] text-xs text-white focus:outline-none ${
                      formErrors.class
                        ? 'border-rose-500'
                        : 'border-[#ffffff15] focus:border-[#7c3aed]'
                    }`}
                    required
                  >
                    <option value="">-- Dooro Fasal --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.className}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                  {formErrors.class && (
                    <p className="text-[10px] text-rose-400 font-semibold">{formErrors.class}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                    Qaybta (Section)
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="Tusaale: A, B, ama C"
                    className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="Tusaale: 01"
                    className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                    Xaaladda Ardayga (Status) *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="active">Active (Firfircoon)</option>
                    <option value="inactive">Inactive (Aan Firfircoonayn)</option>
                    <option value="archived">Archived (La Kaydiyey)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                  Taariikhda Diiwaangelinta (Registration Date)
                </label>
                <input
                  type="date"
                  value={formData.createdAt}
                  onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>
          )}

          {formStep === 'guardian' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                    Magaca Waalidka / Mas&apos;uulka (Guardian Name)
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Tusaale: Cali Jaamac"
                    className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
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
                    className={`w-full px-4 py-2.5 rounded-sm border bg-[#0a0a0a] text-xs text-white font-mono focus:outline-none ${
                      formErrors.guardianPhone
                        ? 'border-rose-500'
                        : 'border-[#ffffff15] focus:border-[#7c3aed]'
                    }`}
                  />
                  {formErrors.guardianPhone && (
                    <p className="text-[10px] text-rose-400 font-semibold">
                      {formErrors.guardianPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                  Cinwaanka Guriga / Deegaanka (Home Address)
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Degmada, Xaafadda, ama Laanta..."
                  className="w-full px-4 py-2.5 rounded-sm border border-[#ffffff15] bg-[#0a0a0a] text-xs text-white focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#ffffff10] flex items-center justify-between">
            <div>
              {formStep === 'enrollment' && (
                <button
                  type="button"
                  onClick={() => setFormStep('identity')}
                  className="px-4 py-2 rounded-sm bg-[#ffffff08] hover:bg-[#ffffff15] text-xs text-[#cccccc] font-semibold"
                >
                  Dib ugu noqo (Back)
                </button>
              )}
              {formStep === 'guardian' && (
                <button
                  type="button"
                  onClick={() => setFormStep('enrollment')}
                  className="px-4 py-2 rounded-sm bg-[#ffffff08] hover:bg-[#ffffff15] text-xs text-[#cccccc] font-semibold"
                >
                  Dib ugu noqo (Back)
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCloseFormModal}
                className="px-4 py-2 rounded-sm border border-[#ffffff10] text-xs text-[#888888] hover:text-white"
              >
                Ka noqo (Cancel)
              </button>

              {formStep !== 'guardian' ? (
                <button
                  type="button"
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
                  className="px-5 py-2 rounded-sm bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Xiga (Next Step)
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2 rounded-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {editingStudent ? 'Cusbooneysii (Update)' : 'Kaydi Ardayga (Save Student)'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
