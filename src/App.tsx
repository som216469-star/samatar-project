/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthUser, Student } from './types';
import {
  AppTabId,
  StudentSubSection,
  FinanceSubSection,
  PeopleSubSection
} from './app/navigationConfig';
import {
  PublicRouteId,
  parseAppLocation,
  buildWorkspacePath
} from './app/routeConfig';
import { AppShell } from './app/AppShell';
import LandingPage from './components/LandingPage';
import {
  ConfirmDialog,
  ToastContainer,
  ToastItem
} from './components/ui/primitives';

// Feature Workspaces & Pages
import { AuthView } from './features/auth/AuthView';
import { ExecutiveDashboard } from './features/dashboard/ExecutiveDashboard';
import { AttendanceModule } from './features/attendance/AttendanceModule';
import { SettingsModule } from './features/settings/SettingsModule';
import StudentsPage from './features/students/StudentsPage';
import StudentProfileModal from './features/students/components/StudentProfileModal';
import PeoplePage from './features/people/PeoplePage';
import StaffAttendancePage from './features/people/StaffAttendancePage';
import { TeacherDashboardPage } from './features/teacher/TeacherDashboardPage';
import { TeacherActivationPage } from './features/teacher/TeacherActivationPage';
import ClassesPage from './features/academics/ClassesPage';
import SubjectsPage from './features/academics/SubjectsPage';
import ExamsPage from './features/academics/ExamsPage';
import TimetablePage from './features/operations/TimetablePage';
import AdmissionsPage from './features/operations/AdmissionsPage';
import LibraryPage from './features/operations/LibraryPage';
import InventoryPage from './features/operations/InventoryPage';
import AnnouncementsPage from './features/operations/AnnouncementsPage';
import { FinancePage } from './features/finance/FinancePage';
import ReportsPage from './features/reports/ReportsPage';

// Centralized Institutional Data & API Client
import { useInstitutionalData } from './hooks/useInstitutionalData';
import { apiFetch } from './lib/apiClient';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [publicRoute, setPublicRoute] = useState<PublicRouteId>('landing');
  const [activeTab, setActiveTab] = useState<AppTabId>('overview');
  const [studentSubSection, setStudentSubSection] = useState<StudentSubSection>('all');
  const [peopleSubSection, setPeopleSubSection] = useState<PeopleSubSection>('teachers');
  const [financeSubSection, setFinanceSubSection] = useState<FinanceSubSection>('overview');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(
    null
  );

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('dugsi_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  // Global Toasts & Confirmation Dialog
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    localStorage.setItem('dugsi_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Restore session & URL state on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('dugsi_user');
    const parsed = parseAppLocation(window.location.pathname, window.location.search);

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsed.publicRoute === 'dashboard') {
          setPublicRoute('dashboard');
          setActiveTab(parsed.activeTab);
          setStudentSubSection(parsed.studentSubSection);
          setPeopleSubSection(parsed.peopleSubSection);
          setFinanceSubSection(parsed.financeSubSection);
        } else {
          setPublicRoute(parsed.publicRoute);
        }
      } catch {
        localStorage.removeItem('dugsi_user');
        setPublicRoute(parsed.publicRoute === 'dashboard' ? 'login' : parsed.publicRoute);
      }
    } else {
      setPublicRoute(parsed.publicRoute === 'dashboard' ? 'login' : parsed.publicRoute);
    }
  }, []);

  // Browser Back/Forward Navigation Sync
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAppLocation(window.location.pathname, window.location.search);
      const savedUser = localStorage.getItem('dugsi_user');
      if (parsed.publicRoute === 'dashboard' && !savedUser && !user) {
        setPublicRoute('login');
        return;
      }
      setPublicRoute(parsed.publicRoute);
      setActiveTab(parsed.activeTab);
      setStudentSubSection(parsed.studentSubSection);
      setPeopleSubSection(parsed.peopleSubSection);
      setFinanceSubSection(parsed.financeSubSection);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('dugsi_user');
    localStorage.removeItem('dugsi_token');
    setUser(null);
    setPublicRoute('landing');
    window.history.pushState({}, '', '/');
  }, []);

  const data = useInstitutionalData({
    user,
    showToast,
    onSetTheme: setTheme,
    onLogout: handleLogout,
    onRequestConfirm: setConfirmConfig
  });

  const navigateWorkspace = useCallback(
    (
      tab: AppTabId,
      options?: {
        studentSubSection?: StudentSubSection;
        peopleSubSection?: PeopleSubSection;
        financeSubSection?: FinanceSubSection;
      }
    ) => {
      const nextStudentSub = options?.studentSubSection ?? studentSubSection;
      const nextPeopleSub = options?.peopleSubSection ?? peopleSubSection;
      const nextFinanceSub = options?.financeSubSection ?? financeSubSection;

      setPublicRoute('dashboard');
      setActiveTab(tab);
      if (options?.studentSubSection) setStudentSubSection(options.studentSubSection);
      if (options?.peopleSubSection) setPeopleSubSection(options.peopleSubSection);
      if (options?.financeSubSection) setFinanceSubSection(options.financeSubSection);

      const targetPath = buildWorkspacePath(tab, {
        studentSubSection: nextStudentSub,
        peopleSubSection: nextPeopleSub,
        financeSubSection: nextFinanceSub
      });
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    },
    [studentSubSection, peopleSubSection, financeSubSection]
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = publicRoute === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const payload = await res.json();
      if (!res.ok) {
        setAuthError(payload.error || 'Authentication failed');
      } else {
        const authUser: AuthUser = payload.user || {
          email,
          role: payload.role || 'admin',
          schoolId: payload.schoolId || email
        };
        if (payload.token) {
          localStorage.setItem('dugsi_token', payload.token);
          authUser.token = payload.token;
        }
        localStorage.setItem('dugsi_user', JSON.stringify(authUser));
        setUser(authUser);
        setPublicRoute('dashboard');
        setActiveTab('overview');
        window.history.pushState({}, '', '/dashboard');
        showToast('Ku soo dhowow Dugsi Pro 2026!', 'success');
      }
    } catch {
      setAuthError('Xiriirka serverka waa la waayay. Fadlan isku day mar kale.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Public Routes
  if (publicRoute === 'landing') {
    return (
      <LandingPage
        isAuthenticated={!!user}
        userEmail={user?.email}
        onNavigate={(route) => {
          if (route === 'dashboard' && user) {
            navigateWorkspace('overview');
          } else {
            const nextRoute = route === 'signup' ? 'signup' : 'login';
            setPublicRoute(nextRoute);
            window.history.pushState({}, '', `/${nextRoute}`);
          }
        }}
      />
    );
  }

  if (publicRoute === 'activate-teacher') {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    return (
      <TeacherActivationPage
        token={token}
        onActivatedSuccess={(activatedEmail) => {
          setEmail(activatedEmail);
          setPublicRoute('login');
          window.history.pushState({}, '', '/login');
          showToast('Akoonkaaga waa la furay! Fadlan halkan ka gal.', 'success');
        }}
        onGoToLogin={() => {
          setPublicRoute('login');
          window.history.pushState({}, '', '/login');
        }}
      />
    );
  }

  if (publicRoute === 'login' || publicRoute === 'signup' || !user) {
    return (
      <AuthView
        authView={publicRoute === 'signup' ? 'signup' : 'login'}
        onSwitchAuthView={(view) => {
          setAuthError('');
          setPublicRoute(view);
          window.history.pushState({}, '', `/${view}`);
        }}
        email={email}
        onChangeEmail={setEmail}
        password={password}
        onChangePassword={setPassword}
        authError={authError}
        authLoading={authLoading}
        onSubmit={handleAuthSubmit}
        onBackToLanding={() => {
          setPublicRoute('landing');
          window.history.pushState({}, '', '/');
        }}
        onForgotPassword={() =>
          showToast(
            'Fadlan la xiriir maamulka dugsiga si loo cusbooneysiiyo furaha sirta ah.',
            'info'
          )
        }
        toasts={toasts}
        onDismissToast={dismissToast}
      />
    );
  }

  // Authenticated Institutional Workspace
  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <AppShell
        user={user}
        settings={data.settings}
        dbStatus={data.dbStatus}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        activeTab={activeTab}
        studentSubSection={studentSubSection}
        peopleSubSection={peopleSubSection}
        financeSubSection={financeSubSection}
        badges={data.shellBadges}
        students={data.students}
        teachers={data.teachers}
        onNavigate={navigateWorkspace}
        onOpenStudentProfile={setSelectedStudentForProfile}
        onLogout={handleLogout}
        onSyncComplete={data.fetchAllData}
      >
        {/* Executive or Teacher Dashboard */}
        {activeTab === 'overview' &&
          (user.role === 'teacher' ? (
            <TeacherDashboardPage
              user={user}
              students={data.students}
              classes={data.classes}
              subjects={data.subjects}
              onNavigate={(view) => navigateWorkspace(view as AppTabId)}
            />
          ) : (
            <ExecutiveDashboard
              students={data.students}
              attendance={data.attendance}
              fees={data.fees}
              classes={data.classes}
              subjects={data.subjects}
              examScores={data.examScores}
              teachers={data.teachers}
              admissions={data.admissions}
              settings={data.settings}
              attendanceDate={data.attendanceDate}
              attendanceSession={data.attendanceSession}
              theme={theme}
              onNavigate={navigateWorkspace}
              onOpenStudentProfile={setSelectedStudentForProfile}
            />
          ))}

        {/* Students Feature */}
        {activeTab === 'students' && (
          <StudentsPage
            students={data.students}
            classes={data.classes}
            fees={data.fees}
            attendance={data.attendance}
            examScores={data.examScores}
            subjects={data.subjects}
            settings={data.settings}
            onAddStudent={data.handleApiAddStudent}
            onUpdateStudent={data.handleApiUpdateStudent}
            onDeleteStudent={data.handleApiDeleteStudent}
            onBulkUpdate={data.handleApiBulkUpdate}
            onRefreshData={data.fetchAllData}
            showToast={showToast}
            theme={theme}
            subSection={studentSubSection}
            onNavigateSubSection={(sub) =>
              navigateWorkspace('students', { studentSubSection: sub })
            }
          />
        )}

        {/* Daily Student Attendance */}
        {activeTab === 'attendance' && (
          <AttendanceModule
            students={data.students}
            classes={data.classes}
            attendance={data.attendance}
            attendanceDate={data.attendanceDate}
            onChangeDate={data.setAttendanceDate}
            attendanceSession={data.attendanceSession}
            onChangeSession={data.setAttendanceSession}
            selectedClass={data.selectedAttendanceClass}
            onChangeClass={data.setSelectedAttendanceClass}
            subTab={data.attendanceSubTab}
            onChangeSubTab={data.setAttendanceSubTab}
            historyStudentId={data.historyStudentId}
            onChangeHistoryStudentId={data.setHistoryStudentId}
            onAttendanceChange={data.handleAttendanceChange}
            onMarkAllAttendance={data.handleMarkAllAttendance}
            onSaveSheet={data.handleSaveAttendanceSheet}
            onExportPDF={data.exportAttendanceToPDF}
            submitting={data.submitting}
          />
        )}

        {/* Academic: Classes */}
        {activeTab === 'classes' && (
          <ClassesPage
            classes={data.classes}
            students={data.students}
            onAddClass={data.handleAddClass}
            onUpdateClass={data.handleUpdateClass}
            onDeleteClass={data.handleDeleteClass}
            theme={theme}
          />
        )}

        {/* Academic: Subjects */}
        {activeTab === 'subjects' && (
          <SubjectsPage
            subjects={data.subjects}
            classes={data.classes}
            onAddSubject={data.handleAddSubject}
            onUpdateSubject={data.handleUpdateSubject}
            onDeleteSubject={data.handleDeleteSubject}
            theme={theme}
          />
        )}

        {/* Academic: Exams */}
        {activeTab === 'exams' && (
          <ExamsPage
            examScores={data.examScores}
            students={data.students}
            subjects={data.subjects}
            classes={data.classes}
            onAddExamScore={data.handleAddExamScore}
            onUpdateExamScore={data.handleUpdateExamScore}
            onDeleteExamScore={data.handleDeleteExamScore}
            theme={theme}
            showToast={showToast}
          />
        )}

        {/* Institutional Reports */}
        {activeTab === 'reports' && (
          <ReportsPage
            students={data.students}
            classes={data.classes}
            subjects={data.subjects}
            examScores={data.examScores}
            attendance={data.attendance}
            fees={data.fees}
            theme={theme}
          />
        )}

        {/* People & HR Directory */}
        {activeTab === 'people' && (
          <PeoplePage
            teachers={data.teachers}
            staff={data.staff}
            guardians={data.guardians}
            classes={data.classes}
            subjects={data.subjects}
            students={data.students}
            onAddTeacher={data.handleAddTeacher}
            onUpdateTeacher={data.handleUpdateTeacher}
            onDeleteTeacher={data.handleDeleteTeacher}
            onAddStaff={data.handleAddStaff}
            onUpdateStaff={data.handleUpdateStaff}
            onDeleteStaff={data.handleDeleteStaff}
            onAddGuardian={data.handleAddGuardian}
            onUpdateGuardian={data.handleUpdateGuardian}
            onDeleteGuardian={data.handleDeleteGuardian}
            currency={data.settings.currency}
            theme={theme}
            showToast={showToast}
            subSection={peopleSubSection}
            onNavigateSubSection={(sub) =>
              navigateWorkspace('people', { peopleSubSection: sub })
            }
          />
        )}

        {/* Staff Attendance */}
        {activeTab === 'staff_attendance' && (
          <StaffAttendancePage
            teachers={data.teachers}
            staff={data.staff}
            attendanceRecords={data.staffAttendance}
            onSaveAttendance={data.handleSaveStaffAttendance}
            theme={theme}
            showToast={showToast}
          />
        )}

        {/* Timetable Schedule */}
        {activeTab === 'timetable' && (
          <TimetablePage
            timetable={data.timetable}
            classes={data.classes}
            subjects={data.subjects}
            teachers={data.teachers}
            onAddSlot={data.handleAddTimetableSlot}
            onDeleteSlot={data.handleDeleteTimetableSlot}
            theme={theme}
            showToast={showToast}
          />
        )}

        {/* Admissions & Enrollment */}
        {activeTab === 'admissions' && (
          <AdmissionsPage
            admissions={data.admissions}
            classes={data.classes}
            onAddAdmission={data.handleAddAdmission}
            onUpdateAdmission={data.handleUpdateAdmission}
            onDeleteAdmission={data.handleDeleteAdmission}
            onEnrollApplicant={data.handleEnrollApplicant}
            theme={theme}
            showToast={showToast}
          />
        )}

        {/* Library & Book Loans */}
        {activeTab === 'library' && (
          <LibraryPage
            books={data.libraryBooks}
            loans={data.libraryLoans}
            students={data.students}
            teachers={data.teachers}
            onAddBook={data.handleAddBook}
            onUpdateBook={data.handleUpdateBook}
            onDeleteBook={data.handleDeleteBook}
            onIssueLoan={data.handleIssueLoan}
            onReturnLoan={data.handleReturnLoan}
            theme={theme}
            showToast={showToast}
          />
        )}

        {/* Inventory & Assets */}
        {activeTab === 'inventory' && (
          <InventoryPage
            inventory={data.inventory}
            onAddItem={data.handleAddItem}
            onUpdateItem={data.handleUpdateItem}
            onDeleteItem={data.handleDeleteItem}
            currency={data.settings.currency}
            theme={theme}
            showToast={showToast}
          />
        )}

        {/* Announcements & Notice Board */}
        {activeTab === 'announcements' && (
          <AnnouncementsPage
            announcements={data.announcements}
            classes={data.classes}
            students={data.students}
            schoolName={data.settings.schoolName}
            onAddAnnouncement={data.handleAddAnnouncement}
            onUpdateAnnouncement={data.handleUpdateAnnouncement}
            onDeleteAnnouncement={data.handleDeleteAnnouncement}
            theme={theme}
            showToast={showToast}
          />
        )}

        {/* Finance & Accounting Suite */}
        {activeTab === 'fees' && (
          <FinancePage
            students={data.students}
            classes={data.classes}
            teachers={data.teachers}
            staff={data.staff}
            schoolName={data.settings.schoolName || 'Dugsi Pro'}
            currency={data.settings.currency || 'USD'}
            subSection={financeSubSection}
            onSubSectionChange={(sub) =>
              navigateWorkspace('fees', { financeSubSection: sub })
            }
          />
        )}

        {/* System Settings */}
        {activeTab === 'settings' && (
          <SettingsModule
            settings={data.settings}
            onChangeSettings={data.setSettings}
            onSaveSettings={data.handleSaveSettings}
            students={data.students}
            classes={data.classes}
            subjects={data.subjects}
            examScores={data.examScores}
            dbStatus={data.dbStatus}
            onExportAllData={data.handleExportAllData}
            onImportAllData={data.handleImportAllData}
            onFactoryReset={data.handleFactoryReset}
          />
        )}
      </AppShell>

      {/* Global 360 Student Profile Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          classes={data.classes}
          attendance={data.attendance}
          fees={data.fees}
          examScores={data.examScores}
          subjects={data.subjects}
          currency={data.settings.currency}
          theme={theme}
          onClose={() => setSelectedStudentForProfile(null)}
          onEditStudent={() => {
            setSelectedStudentForProfile(null);
            navigateWorkspace('students', { studentSubSection: 'all' });
          }}
          onStatusChange={async (student, newStatus) => {
            await data.handleApiUpdateStudent(student.id, { status: newStatus });
            setSelectedStudentForProfile({ ...student, status: newStatus });
          }}
        />
      )}

      {/* Global Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        confirmLabel="Haa, Xaqiiji"
        cancelLabel="Jooji"
        tone="danger"
        onCancel={() => setConfirmConfig(null)}
        onConfirm={async () => {
          if (confirmConfig) {
            await confirmConfig.onConfirm();
            setConfirmConfig(null);
          }
        }}
      />
    </>
  );
}
