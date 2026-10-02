import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Archive,
  Upload,
  Download,
  BookOpen,
  Award,
  FileText,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Calendar,
  ClipboardList,
  Package,
  Bell,
  DollarSign,
  Receipt,
  CreditCard,
  TrendingUp,
  Wallet,
  PieChart,
  Layers,
  FileSpreadsheet,
  Settings,
  LucideIcon
} from 'lucide-react';

export type StudentSubSection =
  | 'all'
  | 'add'
  | 'active'
  | 'inactive'
  | 'archived'
  | 'import'
  | 'export';

export type AppTabId =
  | 'overview'
  | 'students'
  | 'attendance'
  | 'classes'
  | 'subjects'
  | 'exams'
  | 'reports'
  | 'people'
  | 'staff_attendance'
  | 'timetable'
  | 'admissions'
  | 'library'
  | 'inventory'
  | 'announcements'
  | 'fees'
  | 'settings';

export type PeopleSubSection = 'teachers' | 'staff' | 'guardians';

export type FinanceSubSection =
  | 'overview'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'income'
  | 'budgets'
  | 'payroll'
  | 'profit_loss'
  | 'cash_flow'
  | 'fee_structures'
  | 'reports';

export type NavGroupId =
  | 'OVERVIEW'
  | 'ACADEMIC'
  | 'PEOPLE'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'SYSTEM';

export interface NavChildItem {
  id: string;
  label: string;
  subLabel?: string;
  icon: LucideIcon;
  route: string;
  tab: AppTabId;
  studentSubSection?: StudentSubSection;
  peopleSubSection?: PeopleSubSection;
  financeSubSection?: FinanceSubSection;
  badgeKey?: 'totalStudents' | 'activeStudents' | 'inactiveStudents' | 'archivedStudents' | 'unpaidInvoices';
  badgeTone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
}

export interface NavItemConfig {
  id: string;
  label: string;
  subLabel?: string;
  icon: LucideIcon;
  route: string;
  tab: AppTabId;
  group: NavGroupId;
  roles?: Array<'admin' | 'teacher' | 'staff' | 'accountant'>;
  peopleSubSection?: PeopleSubSection;
  financeSubSection?: FinanceSubSection;
  badgeKey?: 'totalStudents' | 'activeStudents' | 'unpaidInvoices' | 'pendingAdmissions';
  children?: NavChildItem[];
}

export const NAVIGATION_GROUPS: Array<{ id: NavGroupId; label: string }> = [
  { id: 'OVERVIEW', label: 'Overview' },
  { id: 'ACADEMIC', label: 'Academic' },
  { id: 'PEOPLE', label: 'People & HR' },
  { id: 'OPERATIONS', label: 'Operations' },
  { id: 'FINANCE', label: 'Finance & Billing' },
  { id: 'SYSTEM', label: 'System' }
];

export const NAVIGATION_CONFIG: NavItemConfig[] = [
  /* ============================== OVERVIEW ============================== */
  {
    id: 'dashboard',
    label: 'Dashboard',
    subLabel: 'Guudmar',
    icon: LayoutDashboard,
    route: '/dashboard',
    tab: 'overview',
    group: 'OVERVIEW'
  },

  /* ============================== ACADEMIC ============================== */
  {
    id: 'students',
    label: 'Students',
    subLabel: 'Ardayda',
    icon: Users,
    route: '/students',
    tab: 'students',
    group: 'ACADEMIC',
    badgeKey: 'totalStudents',
    children: [
      {
        id: 'students-all',
        label: 'All Students',
        icon: Users,
        route: '/students',
        tab: 'students',
        studentSubSection: 'all',
        badgeKey: 'totalStudents',
        badgeTone: 'neutral'
      },
      {
        id: 'students-add',
        label: 'Add Student',
        icon: UserPlus,
        route: '/students/add',
        tab: 'students',
        studentSubSection: 'add'
      },
      {
        id: 'students-active',
        label: 'Active Students',
        icon: UserCheck,
        route: '/students/active',
        tab: 'students',
        studentSubSection: 'active',
        badgeKey: 'activeStudents',
        badgeTone: 'success'
      },
      {
        id: 'students-inactive',
        label: 'Inactive Students',
        icon: Clock,
        route: '/students/inactive',
        tab: 'students',
        studentSubSection: 'inactive',
        badgeKey: 'inactiveStudents',
        badgeTone: 'warning'
      },
      {
        id: 'students-archived',
        label: 'Archived Students',
        icon: Archive,
        route: '/students/archived',
        tab: 'students',
        studentSubSection: 'archived',
        badgeKey: 'archivedStudents',
        badgeTone: 'neutral'
      },
      {
        id: 'students-import',
        label: 'Import Students',
        icon: Upload,
        route: '/students/import',
        tab: 'students',
        studentSubSection: 'import'
      },
      {
        id: 'students-export',
        label: 'Export Students',
        icon: Download,
        route: '/students/export',
        tab: 'students',
        studentSubSection: 'export'
      }
    ]
  },
  {
    id: 'attendance',
    label: 'Attendance',
    subLabel: 'Xaadirinta',
    icon: UserCheck,
    route: '/attendance',
    tab: 'attendance',
    group: 'ACADEMIC'
  },
  {
    id: 'classes',
    label: 'Classes',
    subLabel: 'Fasallada',
    icon: ShieldCheck,
    route: '/classes',
    tab: 'classes',
    group: 'ACADEMIC'
  },
  {
    id: 'subjects',
    label: 'Subjects',
    subLabel: 'Maaddooyinka',
    icon: BookOpen,
    route: '/subjects',
    tab: 'subjects',
    group: 'ACADEMIC'
  },
  {
    id: 'exams',
    label: 'Exams',
    subLabel: 'Imtixaanaadka',
    icon: Award,
    route: '/exams',
    tab: 'exams',
    group: 'ACADEMIC'
  },
  {
    id: 'reports',
    label: 'Reports',
    subLabel: 'Warbixinada',
    icon: FileText,
    route: '/reports',
    tab: 'reports',
    group: 'ACADEMIC'
  },

  /* ============================== PEOPLE ============================== */
  {
    id: 'teachers',
    label: 'Teachers',
    subLabel: 'Macallimiinta',
    icon: GraduationCap,
    route: '/people/teachers',
    tab: 'people',
    peopleSubSection: 'teachers',
    group: 'PEOPLE'
  },
  {
    id: 'staff',
    label: 'Staff',
    subLabel: 'Shaqaalaha',
    icon: Briefcase,
    route: '/people/staff',
    tab: 'people',
    peopleSubSection: 'staff',
    group: 'PEOPLE'
  },
  {
    id: 'guardians',
    label: 'Guardians',
    subLabel: 'Waalidiinta',
    icon: Users,
    route: '/people/guardians',
    tab: 'people',
    peopleSubSection: 'guardians',
    group: 'PEOPLE'
  },
  {
    id: 'staff_attendance',
    label: 'Staff Attendance',
    subLabel: 'Xaadiriska Shaqaalaha',
    icon: Clock,
    route: '/staff-attendance',
    tab: 'staff_attendance',
    group: 'PEOPLE'
  },

  /* ============================== OPERATIONS ============================== */
  {
    id: 'timetable',
    label: 'Timetable',
    subLabel: 'Jadwalka',
    icon: Calendar,
    route: '/timetable',
    tab: 'timetable',
    group: 'OPERATIONS'
  },
  {
    id: 'admissions',
    label: 'Admissions',
    subLabel: 'Qabashada Cusub',
    icon: ClipboardList,
    route: '/admissions',
    tab: 'admissions',
    group: 'OPERATIONS',
    badgeKey: 'pendingAdmissions'
  },
  {
    id: 'library',
    label: 'Library',
    subLabel: 'Maktabadda',
    icon: BookOpen,
    route: '/library',
    tab: 'library',
    group: 'OPERATIONS'
  },
  {
    id: 'inventory',
    label: 'Inventory',
    subLabel: 'Agabka & Hantida',
    icon: Package,
    route: '/inventory',
    tab: 'inventory',
    group: 'OPERATIONS'
  },
  {
    id: 'announcements',
    label: 'Announcements',
    subLabel: 'Ogeysiisyada',
    icon: Bell,
    route: '/announcements',
    tab: 'announcements',
    group: 'OPERATIONS'
  },

  /* ============================== FINANCE ============================== */
  {
    id: 'finance',
    label: 'Fees & Finance',
    subLabel: 'Maaliyadda',
    icon: DollarSign,
    route: '/finance',
    tab: 'fees',
    group: 'FINANCE',
    badgeKey: 'unpaidInvoices',
    children: [
      {
        id: 'finance-overview',
        label: 'Finance Dashboard',
        icon: LayoutDashboard,
        route: '/finance',
        tab: 'fees',
        financeSubSection: 'overview'
      },
      {
        id: 'finance-invoices',
        label: 'Invoices',
        icon: FileText,
        route: '/finance/invoices',
        tab: 'fees',
        financeSubSection: 'invoices',
        badgeKey: 'unpaidInvoices',
        badgeTone: 'warning'
      },
      {
        id: 'finance-payments',
        label: 'Payments',
        icon: Receipt,
        route: '/finance/payments',
        tab: 'fees',
        financeSubSection: 'payments'
      },
      {
        id: 'finance-expenses',
        label: 'Expenses',
        icon: CreditCard,
        route: '/finance/expenses',
        tab: 'fees',
        financeSubSection: 'expenses'
      },
      {
        id: 'finance-income',
        label: 'Income',
        icon: DollarSign,
        route: '/finance/income',
        tab: 'fees',
        financeSubSection: 'income'
      },
      {
        id: 'finance-budgets',
        label: 'Budgets',
        icon: PieChart,
        route: '/finance/budgets',
        tab: 'fees',
        financeSubSection: 'budgets'
      },
      {
        id: 'finance-payroll',
        label: 'Payroll',
        icon: Users,
        route: '/finance/payroll',
        tab: 'fees',
        financeSubSection: 'payroll'
      },
      {
        id: 'finance-pnl',
        label: 'Profit & Loss',
        icon: TrendingUp,
        route: '/finance/profit-loss',
        tab: 'fees',
        financeSubSection: 'profit_loss'
      },
      {
        id: 'finance-cashflow',
        label: 'Cash Flow',
        icon: Wallet,
        route: '/finance/cash-flow',
        tab: 'fees',
        financeSubSection: 'cash_flow'
      },
      {
        id: 'finance-structures',
        label: 'Fee Structures',
        icon: Layers,
        route: '/finance/fee-structures',
        tab: 'fees',
        financeSubSection: 'fee_structures'
      },
      {
        id: 'finance-reports',
        label: 'Financial Reports',
        icon: FileSpreadsheet,
        route: '/finance/reports',
        tab: 'fees',
        financeSubSection: 'reports'
      }
    ]
  },

  /* ============================== SYSTEM ============================== */
  {
    id: 'settings',
    label: 'Settings',
    subLabel: 'Qaabaynta',
    icon: Settings,
    route: '/settings',
    tab: 'settings',
    group: 'SYSTEM'
  }
];

export type NormalizedRole = 'admin' | 'teacher' | 'staff' | 'accountant';

export function normalizeUserRole(role?: string | null): NormalizedRole {
  const r = (role || 'admin').toLowerCase().trim();
  if (r === 'teacher') return 'teacher';
  if (r === 'accountant' || r === 'finance') return 'accountant';
  if (r === 'staff' || r === 'receptionist' || r === 'librarian') return 'staff';
  return 'admin';
}

export function getAuthorizedNavItems(role?: string | null): NavItemConfig[] {
  const normalized = normalizeUserRole(role);
  if (normalized === 'admin') {
    return NAVIGATION_CONFIG;
  }
  if (normalized === 'teacher') {
    const allowedTabs: AppTabId[] = [
      'overview',
      'students',
      'attendance',
      'classes',
      'subjects',
      'exams',
      'reports',
      'timetable',
      'library',
      'announcements'
    ];
    return NAVIGATION_CONFIG.filter((item) => allowedTabs.includes(item.tab)).map(
      (item) => {
        if (item.id === 'students' && item.children) {
          return {
            ...item,
            children: item.children.filter((child) =>
              canRoleAccessStudentSubSection(child.studentSubSection || 'all', normalized)
            )
          };
        }
        return item;
      }
    );
  }
  if (normalized === 'accountant') {
    const allowedTabs: AppTabId[] = [
      'overview',
      'students',
      'reports',
      'fees',
      'announcements'
    ];
    return NAVIGATION_CONFIG.filter((item) => allowedTabs.includes(item.tab));
  }
  // staff
  const allowedTabs: AppTabId[] = [
    'overview',
    'students',
    'attendance',
    'classes',
    'subjects',
    'reports',
    'people',
    'staff_attendance',
    'timetable',
    'admissions',
    'library',
    'inventory',
    'announcements'
  ];
  return NAVIGATION_CONFIG.filter((item) => allowedTabs.includes(item.tab));
}

export function canRoleAccessStudentSubSection(
  subSection: StudentSubSection,
  role?: string | null
): boolean {
  const normalized = normalizeUserRole(role);
  if (normalized === 'admin' || normalized === 'staff') return true;
  if (normalized === 'teacher') {
    return subSection === 'all' || subSection === 'active' || subSection === 'export';
  }
  if (normalized === 'accountant') {
    return subSection === 'all' || subSection === 'active' || subSection === 'export';
  }
  return true;
}

export function canRoleAccessPeopleSubSection(
  subSection: PeopleSubSection,
  role?: string | null
): boolean {
  const normalized = normalizeUserRole(role);
  if (normalized === 'admin' || normalized === 'staff') return true;
  if (normalized === 'teacher') return subSection === 'guardians';
  return false;
}

