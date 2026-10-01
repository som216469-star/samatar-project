import React from 'react';
import { X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher, StaffMember, Guardian, SchoolClass } from '../../types';

interface PeopleModalsProps {
  showTeacherModal: boolean;
  onCloseTeacherModal: () => void;
  editingTeacher: Teacher | null;
  teacherForm: {
    name: string;
    phone: string;
    email: string;
    gender: 'Male' | 'Female';
    qualification: string;
    specialization: string;
    employmentStatus: 'Full-Time' | 'Part-Time' | 'Contract' | 'On Leave' | 'Terminated';
    salary: number;
    hireDate: string;
    address: string;
    emergencyContact: string;
    notes: string;
    assignedClasses: string[];
    assignedSubjects: string[];
  };
  setTeacherForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmitTeacher: (e: React.FormEvent) => void;
  classes: SchoolClass[];

  showStaffModal: boolean;
  onCloseStaffModal: () => void;
  editingStaff: StaffMember | null;
  staffForm: {
    name: string;
    role: any;
    department: string;
    phone: string;
    email: string;
    salary: number;
    employmentStatus: 'Full-Time' | 'Part-Time' | 'Contract' | 'On Leave' | 'Terminated';
    hireDate: string;
    notes: string;
  };
  setStaffForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmitStaff: (e: React.FormEvent) => void;

  showGuardianModal: boolean;
  onCloseGuardianModal: () => void;
  editingGuardian: Guardian | null;
  guardianForm: {
    name: string;
    relationship: any;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    occupation: string;
    emergencyContact: string;
    notes: string;
  };
  setGuardianForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmitGuardian: (e: React.FormEvent) => void;

  currency: string;
  loading: boolean;
}

export const PeopleModals: React.FC<PeopleModalsProps> = ({
  showTeacherModal,
  onCloseTeacherModal,
  editingTeacher,
  teacherForm,
  setTeacherForm,
  onSubmitTeacher,
  classes,
  showStaffModal,
  onCloseStaffModal,
  editingStaff,
  staffForm,
  setStaffForm,
  onSubmitStaff,
  showGuardianModal,
  onCloseGuardianModal,
  editingGuardian,
  guardianForm,
  setGuardianForm,
  onSubmitGuardian,
  currency,
  loading
}) => {
  return (
    <>
      {/* Teacher Form Modal */}
      <AnimatePresence>
        {showTeacherModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={editingTeacher ? 'Tafatir Macallinka' : 'Diiwaangeli Macallin Cusub'}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
                <h2 className="text-lg font-bold font-serif italic text-[#f5f5f5]">
                  {editingTeacher ? 'Tafatir Macallinka' : 'Diiwaangeli Macallin Cusub'}
                </h2>
                <button
                  type="button"
                  aria-label="Xir daaqadda"
                  onClick={onCloseTeacherModal}
                  className="p-1 text-[#737373] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={onSubmitTeacher} className="space-y-4 text-xs">
                <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-sm text-purple-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-purple-300">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Amniga Akoonka Macallinka (Zero Trust Security)</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-relaxed">
                    Maamuluhu ma maamulo mana ogaan karo password-ka macallinka. Email-ka aad halkan
                    ku qorto waxaa toos loogu diri doonaa casuumaad ammaan ah oo macallinku ku
                    samaysanayo password-kiisa sirta ah.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Magaca Buuxa *
                    </label>
                    <input
                      type="text"
                      required
                      value={teacherForm.name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                      placeholder="Tusaale: Macallin Cali Xuseen"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">Taleefanka *</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.phone}
                      onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                      placeholder="25261..."
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">Email</label>
                    <input
                      type="email"
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      placeholder="macallin@school.edu"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">Jinsiga</label>
                    <select
                      value={teacherForm.gender}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, gender: e.target.value as any })
                      }
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    >
                      <option value="Male">Lab (Male)</option>
                      <option value="Female">Dheddig (Female)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Shahaadada (Qualification)
                    </label>
                    <input
                      type="text"
                      value={teacherForm.qualification}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, qualification: e.target.value })
                      }
                      placeholder="Bachelor of Science"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Takhasuska (Specialization)
                    </label>
                    <input
                      type="text"
                      value={teacherForm.specialization}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, specialization: e.target.value })
                      }
                      placeholder="Mathematics & Physics"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Mushaharka Bilihii ({currency})
                    </label>
                    <input
                      type="number"
                      value={teacherForm.salary}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, salary: Number(e.target.value) })
                      }
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Xaaladda Shaqada
                    </label>
                    <select
                      value={teacherForm.employmentStatus}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          employmentStatus: e.target.value as any
                        })
                      }
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    >
                      <option value="Full-Time">Full-Time (Joogto)</option>
                      <option value="Part-Time">Part-Time (Qayb-maalmeed)</option>
                      <option value="Contract">Qandaraas (Contract)</option>
                      <option value="On Leave">Fasax (On Leave)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#a3a3a3] font-semibold">
                    Fasallada loo xilsaaray (Class Assignments)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-[#0a0a0a] border border-[#ffffff10] rounded-sm max-h-32 overflow-y-auto">
                    {classes.map((cls) => {
                      const isChecked = teacherForm.assignedClasses.includes(cls.className);
                      return (
                        <label
                          key={cls.id}
                          className="flex items-center gap-2 text-xs text-[#d4d4d4] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setTeacherForm({
                                  ...teacherForm,
                                  assignedClasses: teacherForm.assignedClasses.filter(
                                    (c: string) => c !== cls.className
                                  )
                                });
                              } else {
                                setTeacherForm({
                                  ...teacherForm,
                                  assignedClasses: [...teacherForm.assignedClasses, cls.className]
                                });
                              }
                            }}
                            className="rounded accent-[#7c3aed]"
                          />
                          <span className="truncate">{cls.className}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ffffff10]">
                  <button
                    type="button"
                    onClick={onCloseTeacherModal}
                    className="px-4 py-2 rounded-sm border border-[#ffffff10] text-[#a3a3a3] hover:text-white"
                  >
                    Ka noqo
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-sm bg-[#7c3aed] text-white font-semibold hover:bg-[#6d28d9] disabled:opacity-50"
                  >
                    {loading ? 'Kaydinaya...' : editingTeacher ? 'Cusbooneysii' : 'Diiwaangeli'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Form Modal */}
      <AnimatePresence>
        {showStaffModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={editingStaff ? 'Tafatir Shaqaalaha' : 'Ku dar Shaqaale Cusub'}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
                <h2 className="text-lg font-bold font-serif italic text-[#f5f5f5]">
                  {editingStaff ? 'Tafatir Shaqaalaha' : 'Ku dar Shaqaale Cusub'}
                </h2>
                <button
                  type="button"
                  aria-label="Xir daaqadda"
                  onClick={onCloseStaffModal}
                  className="p-1 text-[#737373] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={onSubmitStaff} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Magaca Buuxa *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      placeholder="Cabdullaahi Maxamed"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Doorka (Role) *
                    </label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    >
                      <option value="Principal">Principal (Maamule)</option>
                      <option value="Vice Principal">Vice Principal (Kuxigeen)</option>
                      <option value="Accountant">Accountant (Xisaabiye)</option>
                      <option value="Administrator">Administrator (Maamulaha Guud)</option>
                      <option value="Receptionist">Receptionist (Soodhaweeye)</option>
                      <option value="Librarian">Librarian (Khadamka Maktabadda)</option>
                      <option value="Staff">Staff (Shaqaale Kale)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">Taleefanka *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      placeholder="25261..."
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Waaxda (Department)
                    </label>
                    <input
                      type="text"
                      value={staffForm.department}
                      onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                      placeholder="Finance, IT, Reception"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Mushaharka ({currency})
                    </label>
                    <input
                      type="number"
                      value={staffForm.salary}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, salary: Number(e.target.value) })
                      }
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">Xaaladda</label>
                    <select
                      value={staffForm.employmentStatus}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, employmentStatus: e.target.value as any })
                      }
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ffffff10]">
                  <button
                    type="button"
                    onClick={onCloseStaffModal}
                    className="px-4 py-2 rounded-sm border border-[#ffffff10] text-[#a3a3a3] hover:text-white"
                  >
                    Ka noqo
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-sm bg-[#7c3aed] text-white font-semibold hover:bg-[#6d28d9] disabled:opacity-50"
                  >
                    {loading ? 'Kaydinaya...' : editingStaff ? 'Cusbooneysii' : 'Diiwaangeli'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guardian Form Modal */}
      <AnimatePresence>
        {showGuardianModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={editingGuardian ? 'Tafatir Waalidka' : 'Diiwaangeli Waalid Cusub'}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#ffffff10] pb-3">
                <h2 className="text-lg font-bold font-serif italic text-[#f5f5f5]">
                  {editingGuardian ? 'Tafatir Waalidka' : 'Diiwaangeli Waalid Cusub'}
                </h2>
                <button
                  type="button"
                  aria-label="Xir daaqadda"
                  onClick={onCloseGuardianModal}
                  className="p-1 text-[#737373] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={onSubmitGuardian} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Magaca Waalidka *
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianForm.name}
                      onChange={(e) => setGuardianForm({ ...guardianForm, name: e.target.value })}
                      placeholder="Axmed Jaamac Cali"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Xiriirka (Relationship)
                    </label>
                    <select
                      value={guardianForm.relationship}
                      onChange={(e) =>
                        setGuardianForm({ ...guardianForm, relationship: e.target.value as any })
                      }
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    >
                      <option value="Father">Aabbe (Father)</option>
                      <option value="Mother">Hooyo (Mother)</option>
                      <option value="Brother">Walaal (Brother)</option>
                      <option value="Sister">Walaal (Sister)</option>
                      <option value="Uncle">Adeer / Eedo</option>
                      <option value="Guardian">Mas&apos;uul Kale</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">Taleefanka *</label>
                    <input
                      type="text"
                      required
                      value={guardianForm.phone}
                      onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                      placeholder="25261..."
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={guardianForm.whatsapp}
                      onChange={(e) =>
                        setGuardianForm({ ...guardianForm, whatsapp: e.target.value })
                      }
                      placeholder="25261..."
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">Email</label>
                    <input
                      type="email"
                      value={guardianForm.email}
                      onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                      placeholder="waalid@gmail.com"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#a3a3a3] font-semibold">
                      Shaqada (Occupation)
                    </label>
                    <input
                      type="text"
                      value={guardianForm.occupation}
                      onChange={(e) =>
                        setGuardianForm({ ...guardianForm, occupation: e.target.value })
                      }
                      placeholder="Ganacsade / Macallin"
                      className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#a3a3a3] font-semibold">
                    Cinwaanka (Address)
                  </label>
                  <input
                    type="text"
                    value={guardianForm.address}
                    onChange={(e) => setGuardianForm({ ...guardianForm, address: e.target.value })}
                    placeholder="Mogadishu, Hodan, Somalia"
                    className="w-full bg-[#0a0a0a] border border-[#ffffff10] rounded-sm px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ffffff10]">
                  <button
                    type="button"
                    onClick={onCloseGuardianModal}
                    className="px-4 py-2 rounded-sm border border-[#ffffff10] text-[#a3a3a3] hover:text-white"
                  >
                    Ka noqo
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-sm bg-[#7c3aed] text-white font-semibold hover:bg-[#6d28d9] disabled:opacity-50"
                  >
                    {loading ? 'Kaydinaya...' : editingGuardian ? 'Cusbooneysii' : 'Diiwaangeli'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
