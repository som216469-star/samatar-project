import React from 'react';
import { Lock } from 'lucide-react';
import { Teacher, StaffMember, Guardian, SchoolClass } from '../../types';
import { Button, Modal } from '../../components/ui/primitives';

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
      <Modal
        isOpen={showTeacherModal}
        onClose={onCloseTeacherModal}
        title={editingTeacher ? 'Tafatir Macallinka' : 'Diiwaangeli Macallin Cusub'}
        description="Geli macluumaadka macallinka, takhasuskiisa, iyo fasallada loo xilsaaray"
        size="lg"
      >
        <form onSubmit={onSubmitTeacher} className="space-y-4 text-xs">
          <div className="p-3.5 bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-brand)]">
              <Lock className="w-3.5 h-3.5" />
              <span>Amniga Akoonka Macallinka (Zero Trust Security)</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
              Maamuluhu ma maamulo mana ogaan karo password-ka macallinka. Email-ka aad halkan ku
              qorto waxaa toos loogu diri doonaa casuumaad ammaan ah oo macallinku ku samaysanayo
              password-kiisa sirta ah.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Magaca Buuxa *
              </label>
              <input
                type="text"
                required
                value={teacherForm.name}
                onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                placeholder="Tusaale: Macallin Cali Xuseen"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Taleefanka *
              </label>
              <input
                type="text"
                required
                value={teacherForm.phone}
                onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                placeholder="25261..."
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Email
              </label>
              <input
                type="email"
                value={teacherForm.email}
                onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                placeholder="macallin@school.edu"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Jinsiga
              </label>
              <select
                value={teacherForm.gender}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, gender: e.target.value as any })
                }
                className="w-full ds-input"
              >
                <option value="Male">Lab (Male)</option>
                <option value="Female">Dheddig (Female)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Shahaadada (Qualification)
              </label>
              <input
                type="text"
                value={teacherForm.qualification}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, qualification: e.target.value })
                }
                placeholder="Bachelor of Science"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Takhasuska (Specialization)
              </label>
              <input
                type="text"
                value={teacherForm.specialization}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, specialization: e.target.value })
                }
                placeholder="Mathematics & Physics"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Mushaharka Bilihii ({currency})
              </label>
              <input
                type="number"
                value={teacherForm.salary}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, salary: Number(e.target.value) })
                }
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
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
                className="w-full ds-input"
              >
                <option value="Full-Time">Full-Time (Joogto)</option>
                <option value="Part-Time">Part-Time (Qayb-maalmeed)</option>
                <option value="Contract">Qandaraas (Contract)</option>
                <option value="On Leave">Fasax (On Leave)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
              Fasallada loo xilsaaray (Class Assignments)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg max-h-32 overflow-y-auto">
              {classes.map((cls) => {
                const isChecked = teacherForm.assignedClasses.includes(cls.className);
                return (
                  <label
                    key={cls.id}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer"
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
                      className="rounded accent-[var(--color-brand)]"
                    />
                    <span className="truncate">{cls.className}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" size="md" onClick={onCloseTeacherModal}>
              Ka noqo
            </Button>
            <Button type="submit" variant="primary" size="md" loading={loading}>
              {loading ? 'Kaydinaya...' : editingTeacher ? 'Cusbooneysii' : 'Diiwaangeli'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Staff Form Modal */}
      <Modal
        isOpen={showStaffModal}
        onClose={onCloseStaffModal}
        title={editingStaff ? 'Tafatir Shaqaalaha' : 'Ku dar Shaqaale Cusub'}
        description="Geli macluumaadka shaqaalaha maamulka iyo waaxda uu ka tirsan yahay"
        size="md"
      >
        <form onSubmit={onSubmitStaff} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Magaca Buuxa *
              </label>
              <input
                type="text"
                required
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="Cabdullaahi Maxamed"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Doorka (Role) *
              </label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                className="w-full ds-input"
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

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Taleefanka *
              </label>
              <input
                type="text"
                required
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="25261..."
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Waaxda (Department)
              </label>
              <input
                type="text"
                value={staffForm.department}
                onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                placeholder="Finance, IT, Reception"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Mushaharka ({currency})
              </label>
              <input
                type="number"
                value={staffForm.salary}
                onChange={(e) => setStaffForm({ ...staffForm, salary: Number(e.target.value) })}
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Xaaladda
              </label>
              <select
                value={staffForm.employmentStatus}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, employmentStatus: e.target.value as any })
                }
                className="w-full ds-input"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" size="md" onClick={onCloseStaffModal}>
              Ka noqo
            </Button>
            <Button type="submit" variant="primary" size="md" loading={loading}>
              {loading ? 'Kaydinaya...' : editingStaff ? 'Cusbooneysii' : 'Diiwaangeli'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Guardian Form Modal */}
      <Modal
        isOpen={showGuardianModal}
        onClose={onCloseGuardianModal}
        title={editingGuardian ? 'Tafatir Waalidka' : 'Diiwaangeli Waalid Cusub'}
        description="Geli macluumaadka waalidka ama mas'uulka ardayga"
        size="md"
      >
        <form onSubmit={onSubmitGuardian} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Magaca Waalidka *
              </label>
              <input
                type="text"
                required
                value={guardianForm.name}
                onChange={(e) => setGuardianForm({ ...guardianForm, name: e.target.value })}
                placeholder="Axmed Jaamac Cali"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Xiriirka (Relationship)
              </label>
              <select
                value={guardianForm.relationship}
                onChange={(e) =>
                  setGuardianForm({ ...guardianForm, relationship: e.target.value as any })
                }
                className="w-full ds-input"
              >
                <option value="Father">Aabbe (Father)</option>
                <option value="Mother">Hooyo (Mother)</option>
                <option value="Brother">Walaal (Brother)</option>
                <option value="Sister">Walaal (Sister)</option>
                <option value="Uncle">Adeer / Eedo</option>
                <option value="Guardian">Mas&apos;uul Kale</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Taleefanka *
              </label>
              <input
                type="text"
                required
                value={guardianForm.phone}
                onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                placeholder="25261..."
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={guardianForm.whatsapp}
                onChange={(e) => setGuardianForm({ ...guardianForm, whatsapp: e.target.value })}
                placeholder="25261..."
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Email
              </label>
              <input
                type="email"
                value={guardianForm.email}
                onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                placeholder="waalid@gmail.com"
                className="w-full ds-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
                Shaqada (Occupation)
              </label>
              <input
                type="text"
                value={guardianForm.occupation}
                onChange={(e) =>
                  setGuardianForm({ ...guardianForm, occupation: e.target.value })
                }
                placeholder="Ganacsade / Macallin"
                className="w-full ds-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-secondary)] font-semibold">
              Cinwaanka (Address)
            </label>
            <input
              type="text"
              value={guardianForm.address}
              onChange={(e) => setGuardianForm({ ...guardianForm, address: e.target.value })}
              placeholder="Mogadishu, Hodan, Somalia"
              className="w-full ds-input"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" size="md" onClick={onCloseGuardianModal}>
              Ka noqo
            </Button>
            <Button type="submit" variant="primary" size="md" loading={loading}>
              {loading ? 'Kaydinaya...' : editingGuardian ? 'Cusbooneysii' : 'Diiwaangeli'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
