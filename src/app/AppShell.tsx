import React, { useState, useEffect, useMemo } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Sun,
  Moon,
  LogOut,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  Users,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  NAVIGATION_CONFIG,
  NAVIGATION_GROUPS,
  AppTabId,
  PeopleSubSection,
  FinanceSubSection,
  NavItemConfig,
  NavChildItem
} from './navigationConfig';
import { StudentSubSection } from '../components/StudentsView';
import { OfflineSyncBadge } from '../components/OfflineSyncBadge';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { DbStatus, Student, SystemSettings, Teacher } from '../types';

export interface AppShellBadges {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  archivedStudents: number;
  unpaidInvoices: number;
  pendingAdmissions: number;
}

export interface AppShellProps {
  user: {
    email: string;
    role?: 'admin' | 'teacher' | 'staff';
    schoolId?: string;
    name?: string;
  };
  settings: SystemSettings;
  dbStatus: DbStatus | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeTab: AppTabId;
  studentSubSection: StudentSubSection;
  peopleSubSection: PeopleSubSection;
  financeSubSection: FinanceSubSection;
  badges: AppShellBadges;
  students: Student[];
  teachers: Teacher[];
  onNavigate: (
    tab: AppTabId,
    options?: {
      studentSubSection?: StudentSubSection;
      peopleSubSection?: PeopleSubSection;
      financeSubSection?: FinanceSubSection;
    }
  ) => void;
  onOpenStudentProfile: (student: Student) => void;
  onLogout: () => void;
  onSyncComplete: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  user,
  settings,
  dbStatus,
  theme,
  onToggleTheme,
  activeTab,
  studentSubSection,
  peopleSubSection,
  financeSubSection,
  badges,
  students,
  teachers,
  onNavigate,
  onOpenStudentProfile,
  onLogout,
  onSyncComplete,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    students: true,
    finance: false
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  // Auto-expand parent group when activeTab matches
  useEffect(() => {
    if (activeTab === 'students') {
      setExpandedGroups((prev) => ({ ...prev, students: true }));
    } else if (activeTab === 'fees') {
      setExpandedGroups((prev) => ({ ...prev, finance: true }));
    }
  }, [activeTab]);

  // Global keyboard shortcut Cmd/Ctrl + K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleExpandItem = (id: string) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setExpandedGroups((prev) => ({ ...prev, [id]: true }));
      return;
    }
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isNavItemActive = (item: NavItemConfig): boolean => {
    if (item.tab !== activeTab) return false;
    if (item.tab === 'people' && item.peopleSubSection) {
      return item.peopleSubSection === peopleSubSection;
    }
    return true;
  };

  const isChildActive = (child: NavChildItem): boolean => {
    if (child.tab !== activeTab) return false;
    if (child.tab === 'students' && child.studentSubSection) {
      return child.studentSubSection === studentSubSection;
    }
    if (child.tab === 'fees' && child.financeSubSection) {
      return child.financeSubSection === financeSubSection;
    }
    return false;
  };

  // Compute current breadcrumb trail
  const breadcrumbs = useMemo(() => {
    const trail: Array<{ label: string; onClick?: () => void }> = [
      { label: settings.schoolName || 'Dugsi Pro', onClick: () => onNavigate('overview') }
    ];

    if (activeTab === 'overview') {
      trail.push({ label: 'Executive Dashboard' });
    } else if (activeTab === 'students') {
      trail.push({
        label: 'Students',
        onClick: () => onNavigate('students', { studentSubSection: 'all' })
      });
      const subLabelMap: Record<StudentSubSection, string> = {
        all: 'All Students',
        add: 'Add Student',
        active: 'Active Students',
        inactive: 'Inactive Students',
        archived: 'Archived Students',
        import: 'Import Students',
        export: 'Export Students'
      };
      trail.push({ label: subLabelMap[studentSubSection] || 'All Students' });
    } else if (activeTab === 'people') {
      trail.push({ label: 'People & HR' });
      const pMap: Record<PeopleSubSection, string> = {
        teachers: 'Teachers',
        staff: 'Staff Directory',
        guardians: 'Guardians'
      };
      trail.push({ label: pMap[peopleSubSection] });
    } else if (activeTab === 'fees') {
      trail.push({
        label: 'Finance & Billing',
        onClick: () => onNavigate('fees', { financeSubSection: 'overview' })
      });
      const fMap: Record<FinanceSubSection, string> = {
        overview: 'Finance Dashboard',
        invoices: 'Invoices',
        payments: 'Payments',
        expenses: 'Expenses',
        income: 'Income',
        budgets: 'Budgets',
        payroll: 'Payroll',
        profit_loss: 'Profit & Loss',
        cash_flow: 'Cash Flow',
        fee_structures: 'Fee Structures',
        reports: 'Financial Reports'
      };
      trail.push({ label: fMap[financeSubSection] });
    } else {
      const found = NAVIGATION_CONFIG.find((n) => n.tab === activeTab);
      if (found) trail.push({ label: found.label });
    }

    return trail;
  }, [activeTab, studentSubSection, peopleSubSection, financeSubSection, settings.schoolName, onNavigate]);

  // Command palette search results
  const commandResults = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    const matchedNav = NAVIGATION_CONFIG.flatMap((item) => {
      if (item.children) {
        return item.children.map((c) => ({
          id: c.id,
          label: `${item.label} → ${c.label}`,
          category: 'Navigation',
          action: () => {
            onNavigate(c.tab, {
              studentSubSection: c.studentSubSection,
              financeSubSection: c.financeSubSection
            });
            setCommandOpen(false);
          }
        }));
      }
      return [
        {
          id: item.id,
          label: `${item.label} (${item.subLabel || item.group})`,
          category: 'Navigation',
          action: () => {
            onNavigate(item.tab, {
              peopleSubSection: item.peopleSubSection,
              financeSubSection: item.financeSubSection
            });
            setCommandOpen(false);
          }
        }
      ];
    }).filter((n) => !q || n.label.toLowerCase().includes(q));

    const matchedStudents = q
      ? students
          .filter(
            (s) =>
              s.fullName.toLowerCase().includes(q) ||
              s.id.toLowerCase().includes(q) ||
              s.class.toLowerCase().includes(q)
          )
          .slice(0, 5)
      : [];

    const matchedTeachers = q
      ? teachers
          .filter((t) => t.name.toLowerCase().includes(q) || (t.email && t.email.toLowerCase().includes(q)))
          .slice(0, 3)
      : [];

    return {
      nav: matchedNav.slice(0, 7),
      students: matchedStudents,
      teachers: matchedTeachers
    };
  }, [commandQuery, students, teachers, onNavigate]);

  const renderSidebarContent = (isMobile: boolean = false) => {
    const collapsed = !isMobile && sidebarCollapsed;

    return (
      <div className="flex flex-col h-full bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] select-none">
        {/* 1. Brand & School Identity Header */}
        <div className="h-16 px-4 border-b border-[var(--sidebar-border)] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onNavigate('overview');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 min-w-0 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#4f46e5] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              {settings.schoolName ? settings.schoolName.charAt(0).toUpperCase() : 'D'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate tracking-tight">
                  {settings.schoolName || 'Dugsi Pro 2026'}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{settings.academicYear || '2025/2026'}</span>
                </div>
              </div>
            )}
          </button>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close sidebar"
              className="p-1.5 rounded-[var(--radius-sm)] text-[#94a3b8] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-[var(--radius-sm)] text-[#94a3b8] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* 2. Scrollable Grouped Navigation */}
        <nav
          aria-label="Primary Sidebar Navigation"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
        >
          {NAVIGATION_GROUPS.map((group) => {
            const teacherAllowedTabs: AppTabId[] = [
              'overview',
              'students',
              'attendance',
              'exams',
              'timetable',
              'announcements',
              'settings'
            ];
            const items = NAVIGATION_CONFIG.filter((i) => {
              if (i.group !== group.id) return false;
              if (user.role === 'teacher') {
                return teacherAllowedTabs.includes(i.tab);
              }
              return true;
            });
            if (items.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                {!collapsed && (
                  <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#64748b]">
                    {group.label}
                  </div>
                )}

                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavItemActive(item);
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  const isExpanded = !!expandedGroups[item.id];
                  const badgeVal = item.badgeKey ? badges[item.badgeKey] : undefined;

                  if (hasChildren) {
                    return (
                      <div key={item.id} className="space-y-0.5">
                        <div
                          className={`flex items-center justify-between rounded-[var(--radius-sm)] transition-colors ${
                            active
                              ? 'bg-[var(--sidebar-active-bg)] text-white font-semibold'
                              : 'text-[#cbd5e1] hover:bg-[var(--sidebar-hover-bg)] hover:text-white'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (collapsed) {
                                setSidebarCollapsed(false);
                                setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
                              } else {
                                toggleExpandItem(item.id);
                              }
                            }}
                            title={collapsed ? item.label : undefined}
                            aria-expanded={isExpanded}
                            className="flex-1 flex items-center justify-between gap-2.5 px-2.5 py-2 text-xs cursor-pointer min-w-0"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  active ? 'text-[#818cf8]' : 'text-[#94a3b8]'
                                }`}
                              />
                              {!collapsed && <span className="truncate">{item.label}</span>}
                            </div>

                            {!collapsed && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {badgeVal !== undefined && badgeVal > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-[#cbd5e1]">
                                    {badgeVal}
                                  </span>
                                )}
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-150 ${
                                    isExpanded ? 'rotate-180 text-white' : ''
                                  }`}
                                />
                              </div>
                            )}
                          </button>
                        </div>

                        {/* Collapsible Sub-items */}
                        <AnimatePresence initial={false}>
                          {!collapsed && isExpanded && item.children && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.16 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 pl-3 border-l border-white/10 my-1 space-y-0.5">
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon;
                                  const childActive = isChildActive(child);
                                  const childBadge = child.badgeKey ? badges[child.badgeKey] : undefined;

                                  return (
                                    <button
                                      key={child.id}
                                      type="button"
                                      onClick={() => {
                                        onNavigate(child.tab, {
                                          studentSubSection: child.studentSubSection,
                                          financeSubSection: child.financeSubSection
                                        });
                                        if (isMobile) setMobileMenuOpen(false);
                                      }}
                                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[var(--radius-xs)] text-xs transition-colors cursor-pointer ${
                                        childActive
                                          ? 'bg-[#6366f1]/20 text-white font-semibold border-l-2 border-[#818cf8]'
                                          : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <ChildIcon
                                          className={`w-3.5 h-3.5 shrink-0 ${
                                            childActive ? 'text-[#818cf8]' : 'text-[#64748b]'
                                          }`}
                                        />
                                        <span className="truncate">{child.label}</span>
                                      </div>

                                      {childBadge !== undefined && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                            child.badgeTone === 'success'
                                              ? 'bg-emerald-500/15 text-emerald-300'
                                              : child.badgeTone === 'warning'
                                              ? 'bg-amber-500/15 text-amber-300'
                                              : 'bg-white/10 text-[#cbd5e1]'
                                          }`}
                                        >
                                          {childBadge}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.tab, {
                          peopleSubSection: item.peopleSubSection,
                          financeSubSection: item.financeSubSection
                        });
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--sidebar-active-bg)] text-white font-semibold border-l-2 border-[#818cf8]'
                          : 'text-[#cbd5e1] hover:bg-[var(--sidebar-hover-bg)] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#818cf8]' : 'text-[#94a3b8]'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!collapsed && badgeVal !== undefined && badgeVal > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-[#cbd5e1]">
                          {badgeVal}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* 3. Sidebar Footer & User Profile Context */}
        <div className="p-3 border-t border-[var(--sidebar-border)] space-y-2.5 bg-black/20 shrink-0">
          {!collapsed && <PWAInstallButton variant="sidebar" />}

          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#4f46e5]/30 border border-[#818cf8]/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user.email ? user.email.charAt(0).toUpperCase() : 'A'}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.name || user.email.split('@')[0]}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] truncate">
                    {user.role || 'Administrator'}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-[var(--radius-xs)] text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-[var(--sidebar-border)] transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen flex flex-col">
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] flex items-center justify-between gap-3">
          {/* Left: Mobile Menu Trigger + Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                    )}
                    {crumb.onClick && !isLast ? (
                      <button
                        type="button"
                        onClick={crumb.onClick}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors truncate hidden sm:inline cursor-pointer"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span
                        className={`truncate ${
                          isLast
                            ? 'font-bold text-[var(--color-text-primary)]'
                            : 'text-[var(--color-text-muted)] hidden sm:inline'
                        }`}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Right: Command Search, System Status, Theme Switch, Quick Action */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Global Search / Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] transition-colors cursor-pointer"
              title="Quick Search & Command (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span className="hidden md:inline">Search students, modules...</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text-muted)]">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            <OfflineSyncBadge onSyncComplete={onSyncComplete} />

            {/* Database Connection Status Pill */}
            {dbStatus && (
              <div
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-secondary)]"
                title={dbStatus.message}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    dbStatus.connected ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
                  }`}
                />
                <span>{dbStatus.connected ? 'Cloud Synced' : 'Local Storage'}</span>
              </div>
            )}

            {/* Theme Switcher (Light / Dark) */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="p-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Primary Quick Action: Add Student */}
            <button
              type="button"
              onClick={() => onNavigate('students', { studentSubSection: 'add' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Student</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="app-workspace flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command & Search Palette Modal */}
      <AnimatePresence>
        {commandOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/70 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-label="Global Command Search"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.15 }}
              className="ds-surface-elevated w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-3">
                <Search className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Jump to module, search student by name or ID, teacher..."
                  className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCommandOpen(false)}
                  className="px-1.5 py-0.5 text-[10px] font-mono uppercase rounded-[var(--radius-xs)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-3 space-y-4">
                {commandResults.students.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Students
                    </div>
                    {commandResults.students.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setCommandOpen(false);
                          onOpenStudentProfile(st);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-hover)] text-left text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {st.fullName}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                            ({st.id})
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                          Class {st.class}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {commandResults.teachers.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Teachers
                    </div>
                    {commandResults.teachers.map((tc) => (
                      <button
                        key={tc.id}
                        type="button"
                        onClick={() => {
                          setCommandOpen(false);
                          onNavigate('people', { peopleSubSection: 'teachers' });
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-hover)] text-left text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <GraduationCap className="w-3.5 h-3.5 text-[var(--color-info)]" />
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {tc.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                          {tc.specialization || 'Teacher'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Modules & Actions
                  </div>
                  {commandResults.nav.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-hover)] text-left text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-[var(--color-text-muted)]">
                        Jump →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
