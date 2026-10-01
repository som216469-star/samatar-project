import React from 'react';
import {
  GraduationCap,
  Users,
  Clock,
  BookOpen,
  Calendar,
  Award,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { AuthUser, Student, SchoolClass, SchoolSubject } from '../../types';
import { PageContainer, PageHeader, Section } from '../../components/layout/PageLayout';
import { Card, StatCard, Button, EmptyState } from '../../components/ui/primitives';

export interface TeacherDashboardViewProps {
  user: AuthUser;
  students: Student[];
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  onNavigate: (view: string) => void;
}

export const TeacherDashboardPage: React.FC<TeacherDashboardViewProps> = ({
  user,
  students,
  onNavigate
}) => {
  const assignedClasses = user.assignedClasses || [];
  const assignedSubjects = user.assignedSubjects || [];

  const myStudents =
    assignedClasses.length > 0
      ? students.filter((s) => assignedClasses.includes(s.class))
      : students;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Teacher Workspace' }, { label: 'Overview' }]}
        title={`Ku soo dhowow, Macallin ${user.name || user.email.split('@')[0]}`}
        description="Halkan waxaad si toos ah uga maarayn kartaa xaadirinta fasalladaada, gelinta dhibcaha imtixaannada, iyo xogta ardayda laguu xilsaaray."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<ClipboardList className="w-4 h-4" />}
            onClick={() => onNavigate('attendance')}
          >
            Qaad Xaadirinta Maanta
          </Button>
        }
      />

      {/* Assigned Classes & Subjects Summary Bar */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-primary)]">
            Qoondayntaada Waxbarasho:
          </span>
          {assignedClasses.length > 0 ? (
            <span>
              Fasallada: <strong className="text-[var(--color-brand)]">{assignedClasses.join(', ')}</strong>
            </span>
          ) : (
            <span className="italic text-[var(--color-text-muted)]">
              Ma jiraan fasallo gaar ah oo laguu qoondeeyay
            </span>
          )}
          <span aria-hidden="true">·</span>
          {assignedSubjects.length > 0 ? (
            <span>
              Maaddooyinka:{' '}
              <strong className="text-[var(--color-text-primary)]">
                {assignedSubjects.join(', ')}
              </strong>
            </span>
          ) : (
            <span className="italic text-[var(--color-text-muted)]">
              Maaddooyin gaar ah lama xusin
            </span>
          )}
        </div>
      </Card>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ardayda Fasalladayda"
          value={myStudents.length}
          sublabel="Dhammaan ardayda fasalladaada"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Fasallada Laguu Xilsaaray"
          value={assignedClasses.length}
          sublabel="Fasallada firfircoon"
          variant="brand"
          icon={<GraduationCap className="w-4 h-4" />}
        />
        <StatCard
          label="Maaddooyinka Aad Dhigto"
          value={assignedSubjects.length}
          sublabel="Koorsooyinka laguu qoondeeyay"
          variant="success"
          icon={<BookOpen className="w-4 h-4" />}
        />
        <StatCard
          label="Taariikhda Maanta"
          value={new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}
          sublabel="Xaadirinta maanta waa furan tahay"
          variant="info"
          icon={<Calendar className="w-4 h-4" />}
        />
      </div>

      {/* Quick Action Cards */}
      <Section title="Hawlaha Degdegga ah ee Macallinka">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="ds-surface p-5 text-left hover:border-[var(--color-brand)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand)] mb-3">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center justify-between">
              <span>Qaad Xaadirinta</span>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] transition-colors" />
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
              Calaamadee imaanshaha, maqnaanshaha ama soo daahidda ardayda fasalladaada.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('exams')}
            className="ds-surface p-5 text-left hover:border-[var(--color-brand)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-info-soft)] border border-[var(--color-info-border)] flex items-center justify-center text-[var(--color-info)] mb-3">
              <Award className="w-5 h-5" />
            </div>
            <div className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center justify-between">
              <span>Geli Dhibcaha</span>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] transition-colors" />
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
              Diiwaangeli natiijooyinka imtixaannada maaddooyinka aad dhigto.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="ds-surface p-5 text-left hover:border-[var(--color-brand)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-success-soft)] border border-[var(--color-success-border)] flex items-center justify-center text-[var(--color-success)] mb-3">
              <Users className="w-5 h-5" />
            </div>
            <div className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center justify-between">
              <span>Ardayda Fasalladayda</span>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] transition-colors" />
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
              Fiiri profile-yada, xiriirka waalidka iyo xogta ardaydaada.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('timetable')}
            className="ds-surface p-5 text-left hover:border-[var(--color-brand)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-warning-soft)] border border-[var(--color-warning-border)] flex items-center justify-center text-[var(--color-warning)] mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <div className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center justify-between">
              <span>Jadwalka Toddobaadka</span>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] transition-colors" />
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
              Eeg saacadaha casharradaada iyo xilliyada nasashada ee maalin kasta.
            </p>
          </button>
        </div>
      </Section>

      {/* Assigned Classes List */}
      <Section
        title="Fasallada Laguu Xilsaaray"
        description={`Isku darka: ${assignedClasses.length} fasal`}
      >
        {assignedClasses.length === 0 ? (
          <Card>
            <EmptyState
              title="Fasallo gaar ah weli laguma xilsaarin"
              description="Fadlan la xiriir maamulka dugsiga si laguu qoondeeyo fasallada aad dhigto."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {assignedClasses.map((clsName) => {
              const clsStudents = students.filter((s) => s.class === clsName);
              return (
                <Card key={clsName} className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[var(--color-text-primary)] text-sm">
                      Fasalka {clsName}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 tabular-nums">
                      {clsStudents.length} Arday
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onNavigate('attendance')}
                  >
                    Xaadirin
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </PageContainer>
  );
};
