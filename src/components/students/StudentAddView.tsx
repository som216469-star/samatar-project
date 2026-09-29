import React, { useState, useEffect } from 'react';
import { 
  User, 
  School, 
  Phone, 
  FileText, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  Save, 
  RotateCcw,
  Sparkles,
  Upload,
  X,
  Plus
} from 'lucide-react';
import { SchoolClass } from '../../types';

interface StudentAddViewProps {
  classes: SchoolClass[];
  onAddStudent: (studentData: any) => Promise<boolean>;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
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
  onAddStudent,
  onCancel,
  showToast,
  theme = 'dark'
}: StudentAddViewProps) {
  // Form Data organized into 5 logical sections
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'Male' as 'Male' | 'Female',
    nationalId: '',
    class: classes[0]?.className || '',
    section: '',
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

  // Real-time Duplicate Check (Debounced)
  useEffect(() => {
    if (!formData.fullName.trim() || !formData.class) {
      setDuplicateWarning({ found: false });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/students/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formData.fullName.trim(),
            className: formData.class,
            guardianPhone: formData.guardianPhone.trim()
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.duplicate) {
            setDuplicateWarning({
              found: true,
              reason: result.reason,
              existingStudent: result.existingStudent
            });
          } else {
            setDuplicateWarning({ found: false });
          }
        }
      } catch (err) {
        // Silently fail if offline or check is unavailable
        console.warn("Duplicate check error:", err);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.fullName, formData.class, formData.guardianPhone]);

  // Handle Photo Upload with Auto-compression
  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast("Fadlan soo geli sawir sax ah (PNG, JPG)", "error");
      return;
    }
    try {
      const compressedDataUrl = await compressImage(file, 400, 0.85);
      setFormData(prev => ({ ...prev, photo: compressedDataUrl }));
      showToast("Sawirka ardayga waa la habeeyey!", "success");
    } catch (e) {
      showToast("Khalad ayaa dhacay akhrinta sawirka", "error");
    }
  };

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      errs.fullName = "Magaca oo buuxa waa qasab (Full Name is required)";
    }
    if (!formData.class) {
      errs.class = "Fasalka waa qasab (Class is required)";
    }
    if (!formData.guardianPhone.trim()) {
      errs.guardianPhone = "Telefoonka waalidka waa qasab (Guardian phone is required)";
    } else if (formData.guardianPhone.length < 6) {
      errs.guardianPhone = "Fadlan geli lambar telefoon sax ah";
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstMsg = Object.values(errs)[0];
      showToast(firstMsg, "warning");
      return false;
    }
    return true;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const newStudent = {
      id: 'std-' + Math.random().toString(36).substr(2, 9),
      fullName: formData.fullName.trim(),
      class: formData.class,
      gender: formData.gender,
      guardianPhone: formData.guardianPhone.trim(),
      guardianName: formData.guardianName.trim() || undefined,
      status: formData.status,
      photo: formData.photo || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      address: formData.address || undefined,
      section: formData.section || undefined,
      rollNumber: formData.rollNumber || undefined,
      createdAt: formData.enrollmentDate || new Date().toISOString().split('T')[0]
    };

    try {
      const success = await onAddStudent(newStudent);
      if (success) {
        showToast("Arday cusub si guul leh ayaa loo diiwaangeliyey!", "success");
        if (addAnother) {
          setFormData({
            fullName: '',
            dateOfBirth: '',
            gender: 'Male',
            nationalId: '',
            class: formData.class, // Keep last selected class
            section: formData.section,
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
            status: 'active'
          });
          setDuplicateWarning({ found: false });
        } else {
          onCancel(); // Return to All Students
        }
      }
    } catch (err) {
      showToast("Khalad ayaa dhacay diiwaangelinta ardayga", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff10] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#737373] font-mono mb-1">
            <span className="hover:text-[#c4b5fd] cursor-pointer" onClick={onCancel}>Students</span>
            <span>/</span>
            <span className="text-[#c4b5fd] font-bold">Add Student</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif italic font-bold text-[#f5f5f5] tracking-tight">
            Diiwaangelinta Arday Cusub
          </h1>
          <p className="text-xs text-[#a3a3a3] mt-1">
            Student Registration — Buuxi xogta shakhsiga, fasalka, iyo xiriirka waalidka si habaysan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-sm border border-[#ffffff10] hover:bg-[#ffffff05] text-[#a3a3a3] hover:text-[#e5e5e5] uppercase tracking-wider text-[11px] font-bold transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ka Noqo (Cancel)</span>
          </button>
        </div>
      </div>

      {/* Duplicate Prevention Alert Banner */}
      {duplicateWarning.found && (
        <div className="p-4 rounded-sm bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 animate-slide-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1 text-xs space-y-1">
            <p className="font-bold uppercase tracking-wider text-[11px]">
              ⚠️ Digniin: Arday Nuucaan ah Horey Ayuu U Jiray! (Potential Duplicate Detected)
            </p>
            <p className="text-[#e5e5e5] leading-relaxed">
              {duplicateWarning.reason || "Arday magacan iyo fasalkan wata ayaa horey ugu jiray nidaamka."}
            </p>
            {duplicateWarning.existingStudent && (
              <p className="text-[10px] font-mono text-amber-200">
                Ardayga Hore: {duplicateWarning.existingStudent.fullName} | ID: {duplicateWarning.existingStudent.id} | Fasal: {duplicateWarning.existingStudent.class}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Multi-Card Registration Form */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        
        {/* SECTION 1: Personal Information */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#ffffff08] pb-3">
            <div className="w-7 h-7 rounded-sm bg-[#7c3aed]/10 text-[#c4b5fd] flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#f5f5f5]">
                1. Xogta Shakhsiga (Personal Information)
              </h2>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Magaca rasmiga ah, taariikhda dhalashada, iyo jinsiga
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3] flex items-center justify-between">
                <span>Magaca oo Buuxa (Full Name) *</span>
                {formErrors.fullName && <span className="text-rose-400 font-normal">{formErrors.fullName}</span>}
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: '' });
                }}
                placeholder="Tusaale: Maxamed Cali Jaamac"
                className={`w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border text-xs text-[#e5e5e5] uppercase tracking-wider focus:outline-none focus:border-[#7c3aed] transition-colors ${
                  formErrors.fullName ? 'border-rose-500/50' : 'border-[#ffffff10]'
                }`}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Jinsiga (Gender) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Male' })}
                  className={`py-2 px-4 rounded-sm border text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    formData.gender === 'Male'
                      ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#60a5fa]'
                      : 'border-[#ffffff10] bg-[#0a0a0a] text-[#737373] hover:text-[#e5e5e5]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                  <span>Lab (Male)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Female' })}
                  className={`py-2 px-4 rounded-sm border text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    formData.gender === 'Female'
                      ? 'bg-[#ec4899]/10 border-[#ec4899] text-[#f472b6]'
                      : 'border-[#ffffff10] bg-[#0a0a0a] text-[#737373] hover:text-[#e5e5e5]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#ec4899]"></span>
                  <span>Dhedig (Female)</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Taariikhda Dhalashada (Date of Birth)
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Lambarka Aqoonsiga / National ID (Optional)
              </label>
              <input
                type="text"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="Tusaale: SOM-98214"
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] uppercase font-mono focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Xaaladda Diiwaanka (Initial Status)
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] uppercase tracking-wider focus:outline-none focus:border-[#7c3aed]"
              >
                <option value="active">Active (Firfircoon)</option>
                <option value="inactive">Inactive (Aan Firfircoonayn)</option>
                <option value="archived">Archived (Kaydsan)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: School Enrollment */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#ffffff08] pb-3">
            <div className="w-7 h-7 rounded-sm bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#f5f5f5]">
                2. Qorista Iskuulka (School Enrollment)
              </h2>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Fasalka, qeybta, roll number-ka, iyo taariikhda qorista
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3] flex items-center justify-between">
                <span>Fasalka (Class) *</span>
                {formErrors.class && <span className="text-rose-400 font-normal">{formErrors.class}</span>}
              </label>
              <select
                value={formData.class}
                onChange={(e) => {
                  setFormData({ ...formData, class: e.target.value });
                  if (formErrors.class) setFormErrors({ ...formErrors, class: '' });
                }}
                className={`w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border text-xs text-[#e5e5e5] uppercase tracking-wider focus:outline-none focus:border-[#7c3aed] ${
                  formErrors.class ? 'border-rose-500/50' : 'border-[#ffffff10]'
                }`}
                required
              >
                <option value="">-- Dooro Fasal --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.className}>{c.className}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Qeybta / Section (Optional)
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Tusaale: A, B, C"
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] uppercase focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Roll / Admission Number (Optional)
              </label>
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="Tusaale: 01 ama 104"
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] font-mono uppercase focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Taariikhda Diiwaangelinta (Enrollment Date)
              </label>
              <input
                type="date"
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className="w-full md:w-1/3 px-4 py-2 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Guardian / Emergency Contact */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#ffffff08] pb-3">
            <div className="w-7 h-7 rounded-sm bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#f5f5f5]">
                3. Xogta Waalidka / Mas'uulka (Guardian & Emergency Contact)
              </h2>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Magaca waalidka, telefoonka tooska ah, iyo goobta deegaanka
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Magaca Waalidka / Mas'uulka (Guardian Name)
              </label>
              <input
                type="text"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                placeholder="Tusaale: Cali Jaamac Maxamed"
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] uppercase tracking-wider focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Xiriirka Ardayga (Relationship)
              </label>
              <select
                value={formData.guardianRelationship}
                onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] uppercase tracking-wider focus:outline-none focus:border-[#7c3aed]"
              >
                <option value="Father">Aabbe (Father)</option>
                <option value="Mother">Hooyo (Mother)</option>
                <option value="Uncle">Adeer / Eedo (Uncle/Aunt)</option>
                <option value="Guardian">Mas'uul Guud (Legal Guardian)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3] flex items-center justify-between">
                <span>Telefoonka Waalidka (Primary Phone) *</span>
                {formErrors.guardianPhone && <span className="text-rose-400 font-normal">{formErrors.guardianPhone}</span>}
              </label>
              <input
                type="tel"
                value={formData.guardianPhone}
                onChange={(e) => {
                  setFormData({ ...formData, guardianPhone: e.target.value });
                  if (formErrors.guardianPhone) setFormErrors({ ...formErrors, guardianPhone: '' });
                }}
                placeholder="+252 61 5123456"
                className={`w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border text-xs text-[#e5e5e5] font-mono focus:outline-none focus:border-[#7c3aed] ${
                  formErrors.guardianPhone ? 'border-rose-500/50' : 'border-[#ffffff10]'
                }`}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Telefoon Dheeraad ah (Alternate Phone)
              </label>
              <input
                type="tel"
                value={formData.guardianPhoneAlt}
                onChange={(e) => setFormData({ ...formData, guardianPhoneAlt: e.target.value })}
                placeholder="+252 61 5000000"
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] font-mono focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Cinwaanka / Deegaanka (Home Address)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Tusaale: Degmada Hodan, Xaafadda Taleex, Muqdisho"
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Additional Information */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#ffffff08] pb-3">
            <div className="w-7 h-7 rounded-sm bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#f5f5f5]">
                4. Macluumaad Dheeraad ah (Additional Information)
              </h2>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Iskuulkii hore, dhiigga, iyo xaaladaha caafimaad
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Iskuulkii Hore (Previous School Attended)
              </label>
              <input
                type="text"
                value={formData.previousSchool}
                onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                placeholder="Tusaale: Dugsiga Al-Hikmah"
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Nooca Dhiigga (Blood Group)
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
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

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                Xusuusin Caafimaad / Xasaasiyad (Medical Notes / Allergies)
              </label>
              <textarea
                rows={2}
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                placeholder="Wax kasta oo muhiim ah oo ku saabsan caafimaadka ama baahiyaha gaarka ah..."
                className="w-full px-4 py-2.5 rounded-sm bg-[#0a0a0a] border border-[#ffffff10] text-xs text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed] resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Student Photo */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#ffffff08] pb-3">
            <div className="w-7 h-7 rounded-sm bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#f5f5f5]">
                5. Sawirka Ardayga (Student Photo)
              </h2>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider">
                Sawirka aqoonsiga ee ardayga (si toos ah ayaa loo fududaynayaa)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {formData.photo ? (
              <div className="relative group shrink-0">
                <img
                  src={formData.photo}
                  alt="Preview"
                  className="w-28 h-28 object-cover rounded-sm border-2 border-[#7c3aed] shadow-lg"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, photo: '' })}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow"
                  title="Ka saar sawirka"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-28 h-28 rounded-sm bg-[#0a0a0a] border border-dashed border-[#ffffff20] flex flex-col items-center justify-center text-[#737373] shrink-0">
                <Camera className="w-8 h-8 stroke-[1.5] mb-1" />
                <span className="text-[9px] uppercase tracking-wider font-mono">Sawir Ma Jiro</span>
              </div>
            )}

            <div className="flex-1 w-full space-y-3">
              <label
                className="w-full border-2 border-dashed border-[#ffffff15] hover:border-[#7c3aed] rounded-sm p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#0a0a0a] hover:bg-[#ffffff02] transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              >
                <Upload className="w-5 h-5 text-[#c4b5fd]" />
                <div className="text-center">
                  <p className="text-xs font-semibold text-[#e5e5e5]">
                    Guji si aad sawir u doorato ama halkan ku soo jiid (Drag & Drop)
                  </p>
                  <p className="text-[10px] text-[#737373] mt-0.5">
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
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#ffffff10]">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 rounded-sm border border-[#ffffff15] hover:bg-[#ffffff05] text-[#a3a3a3] hover:text-white uppercase tracking-widest text-xs font-bold transition-colors"
          >
            Ka Noqo (Cancel)
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, true)}
              className="w-full sm:w-auto px-5 py-3 rounded-sm border border-[#7c3aed]/30 hover:border-[#7c3aed] bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 text-[#c4b5fd] uppercase tracking-widest text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Kaydi & Mid Kale Ku Dar</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] uppercase tracking-widest text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Diiwaangelinayaa...' : 'Kaydi oo Diiwaangeli'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
