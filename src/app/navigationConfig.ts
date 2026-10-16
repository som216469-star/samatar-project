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
  ListChecks,
  CalendarDays,
  UserRoundSearch,
  BarChart3,
  FileBarChart2,
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

export type AttendanceSubSection = 'overview' | 'take' | 'daily' | 'history' | 'students' | 'classes' | 'analytics' | 'reports';

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
  attendanceSubSection?: AttendanceSubSection;
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
  { id: 'OVERVIEW', label: 'GUUDMAR' },
  { id: 'ACADEMIC', label: 'WAXBARASHO' },
  { id: 'PEOPLE', label: 'SHAQAALE & WAALIDIIN' },
  { id: 'OPERATIONS', label: 'HAWLAHA DUGSIGA' },
  { id: 'FINANCE', label: 'MAALIYADDA' },
  { id: 'SYSTEM', label: 'NIDAAMKA' }
];

const SOMALI_NAV_LABELS: Record<string, string> = {
  dashboard: 'Guudmar',
  students: 'Ardayda',
  attendance: 'Xaadirinta',
  classes: 'Fasallada',
  subjects: 'Maaddooyinka',
  exams: 'Imtixaannada',
  reports: 'Warbixinnada',
  teachers: 'Macallimiinta',
  staff: 'Shaqaalaha',
  guardians: 'Waalidiinta',
  staff_attendance: 'Xaadirinta Shaqaalaha',
  timetable: 'Jadwalka Xiisadaha',
  admissions: 'Diiwaangelinta',
  library: 'Maktabadda',
  inventory: 'Agabka iyo Hantida',
  announcements: 'Ogeysiisyada',
  finance: 'Maaliyadda',
  settings: 'Dejinta Nidaamka',

  'students-all': 'Dhammaan Ardayda',
  'students-add': 'Ku Dar Arday',
  'students-active': 'Arday Firfircoon',
  'students-inactive': 'Arday Hakad ku Jira',
  'students-archived': 'Ardayda Kaydsan',
  'students-import': 'Soo Gelin Xogta Ardayda',
  'students-export': 'Dhoofin Xogta Ardayda',

  'attendance-overview': 'Guudmarka Xaadirinta',
  'attendance-take': 'Qor Xaadirinta',
  'attendance-daily': 'Diiwaanka Maalinlaha',
  'attendance-history': 'Taariikhda Xaadirinta',
  'attendance-students': 'Xaadirinta Ardayga',
  'attendance-classes': 'Xaadirinta Fasallada',
  'attendance-analytics': 'Falanqaynta Xaadirinta',
  'attendance-reports': 'Warbixinta Xaadirinta',

  'finance-overview': 'Guudmarka Maaliyadda',
  'finance-invoices': 'Biilasha',
  'finance-payments': 'Lacag-bixinnada',
  'finance-expenses': 'Kharashaadka',
  'finance-income': 'Dakhliga',
  'finance-budgets': 'Miisaaniyadda',
  'finance-payroll': 'Mushaharka',
  'finance-pnl': 'Faa’iido iyo Khasaare',
  'finance-cashflow': 'Socodka Lacagta',
  'finance-structures': 'Qaab-dhismeedka Khidmadaha',
  'finance-reports': 'Warbixinta Maaliyadda'
};

const SOMALI_NAV_SUBLABELS: Record<string, string> = {
  dashboard: 'Guudmarka dugsiga',
  students: 'Maamulka ardayda',
  attendance: 'Diiwaanka joogitaanka',
  classes: 'Maamulka fasallada',
  subjects: 'Maadooyinka waxbarashada',
  exams: 'Imtixaannada iyo natiijooyinka',
  reports: 'Warbixinnada dugsiga',
  teachers: 'Diiwaanka macallimiinta',
  staff: 'Diiwaanka shaqaalaha',
  guardians: 'Xiriirrada waalidiinta',
  staff_attendance: 'Joogitaanka shaqaalaha',
  timetable: 'Jadwalka fasallada',
  admissions: 'Ardayda cusub',
  library: 'Buugaagta iyo amaahda',
  inventory: 'Qalabka dugsiga',
  announcements: 'Farriimaha dugsiga',
  finance: 'Khidmadaha iyo xisaabaadka',
  settings: 'Habaynta nidaamka',

  'students-all': 'Diiwaanka guud',
  'students-add': 'Diiwaangelin cusub',
  'students-active': 'Ardayda waxbarashada ku jirta',
  'students-inactive': 'Ardayda hakadka ku jirta',
  'students-archived': 'Diiwaannadii hore',
  'students-import': 'Excel ama CSV',
  'students-export': 'Warbixin iyo faylal xogeed',

  'attendance-overview': 'Aragti guud oo maanta ah',
  'attendance-take': 'Calaamadee joogitaanka maanta',
  'attendance-daily': 'Arag fasal kasta',
  'attendance-history': 'Raadi xaadirintii hore',
  'attendance-students': 'Diiwaanka arday kasta',
  'attendance-classes': 'Isbarbardhigga fasallada',
  'attendance-analytics': 'Isbeddellada iyo heerarka',
  'attendance-reports': 'Soo saar warbixinta',

  'finance-overview': 'Xaaladda maaliyadda',
  'finance-invoices': 'Abuur oo maamul biilasha',
  'finance-payments': 'Rasiidhada iyo lacagaha la bixiyey',
  'finance-expenses': 'Diiwaanka kharashaadka',
  'finance-income': 'Dakhliga kale',
  'finance-budgets': 'Qorshaha iyo kharashka dhabta ah',
  'finance-payroll': 'Mushaharka macallimiinta iyo shaqaalaha',
  'finance-pnl': 'Dakhliga laga jaray kharashaadka',
  'finance-cashflow': 'Lacagta soo gasha iyo baxda',
  'finance-structures': 'Noocyada iyo qiimaha khidmadaha',
  'finance-reports': 'Warbixinnada xisaabaadka'
};

export function getSomaliNavLabel(id: string, fallback: string): string {
  return SOMALI_NAV_LABELS[id] || fallback;
}

export function getSomaliNavSubLabel(id: string, fallback?: string): string | undefined {
  return SOMALI_NAV_SUBLABELS[id] || fallback;
}

export function getSomaliRoleLabel(role?: string | null): string {
  const normalized = String(role || '').toLowerCase().trim();
  const labels: Record<string, string> = {
    admin: 'Maamule',
    'school admin': 'Maamulka Dugsiga',
    'super admin': 'Maamule Guud',
    principal: 'Maamule Sare',
    teacher: 'Macallin',
    accountant: 'Xisaabiye',
    finance: 'Maaliyad',
    receptionist: 'Soo-dhoweeye',
    librarian: 'Maktabad-haye',
    staff: 'Shaqaale'
  };
  return labels[normalized] || role || 'Isticmaale';
}

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
        subLabel: 'Full roster',
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
        subLabel: 'New enrollment',
        icon: UserPlus,
        route: '/students/add',
        tab: 'students',
        studentSubSection: 'add'
      },
      {
        id: 'students-active',
        label: 'Active Students',
        subLabel: 'Currently enrolled',
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
        subLabel: 'On hold / paused',
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
        subLabel: 'Historical records',
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
        subLabel: 'Excel / CSV intake',
        icon: Upload,
        route: '/students/import',
        tab: 'students',
        studentSubSection: 'import'
      },
      {
        id: 'students-export',
        label: 'Export Students',
        subLabel: 'Reports & data files',
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
    group: 'ACADEMIC',
    children: [
      { id: 'attendance-overview', label: 'Attendance Overview', subLabel: 'Today at a glance', icon: LayoutDashboard, route: '/attendance', tab: 'attendance', attendanceSubSection: 'overview' },
      { id: 'attendance-take', label: 'Take Attendance', subLabel: 'Mark today’s roll call', icon: ListChecks, route: '/attendance/take', tab: 'attendance', attendanceSubSection: 'take' },
      { id: 'attendance-daily', label: 'Daily Register', subLabel: 'Class-by-class view', icon: CalendarDays, route: '/attendance/daily', tab: 'attendance', attendanceSubSection: 'daily' },
      { id: 'attendance-history', label: 'Attendance History', subLabel: 'Search past sessions', icon: Clock, route: '/attendance/history', tab: 'attendance', attendanceSubSection: 'history' },
      { id: 'attendance-students', label: 'Student Attendance', subLabel: 'Individual records', icon: UserRoundSearch, route: '/attendance/students', tab: 'attendance', attendanceSubSection: 'students' },
      { id: 'attendance-classes', label: 'Class Attendance', subLabel: 'Performance by class', icon: ShieldCheck, route: '/attendance/classes', tab: 'attendance', attendanceSubSection: 'classes' },
      { id: 'attendance-analytics', label: 'Attendance Analytics', subLabel: 'Trends & patterns', icon: BarChart3, route: '/attendance/analytics', tab: 'attendance', attendanceSubSection: 'analytics' },
      { id: 'attendance-reports', label: 'Attendance Reports', subLabel: 'Export & reporting', icon: FileBarChart2, route: '/attendance/reports', tab: 'attendance', attendanceSubSection: 'reports' }
    ]
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
  const rawRole = String(role || '').toLowerCase().trim();
  const knownRoles = new Set([
    'admin',
    'school admin',
    'super admin',
    'principal',
    'teacher',
    'accountant',
    'finance',
    'receptionist',
    'librarian',
    'staff'
  ]);
  if (!knownRoles.has(rawRole)) return [];

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
  // Receptionist and Librarian map to the frontend "staff" role but retain
  // their documented Students access. A generic Staff account does not.
  const allowedTabs: AppTabId[] = [
    'overview',
    ...(rawRole === 'staff' ? [] : ['students' as AppTabId]),
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

export interface StudentPermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canBulkManage: boolean;
  canExport: boolean;
  canViewFinance: boolean;
}

export function getStudentPermissions(role?: string | null): StudentPermissions {
  const raw = (role || '').toLowerCase().trim();
  const isFullAdmin = raw === 'admin' || raw === 'school admin' || raw === 'super admin' || raw === 'principal';
  const canView = isFullAdmin || raw === 'teacher' || raw === 'accountant' || raw === 'receptionist' || raw === 'librarian';
  const canCreate = isFullAdmin || raw === 'receptionist';
  const canUpdate = isFullAdmin || raw === 'receptionist';
  const canDelete = isFullAdmin;
  const canBulkManage = isFullAdmin;
  const canExport = canView;
  const canViewFinance = isFullAdmin || raw === 'accountant';

  return {
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canBulkManage,
    canExport,
    canViewFinance
  };
}

export function canRoleAccessStudentSubSection(
  subSection: StudentSubSection,
  role?: string | null
): boolean {
  const rawRole = String(role || '').toLowerCase().trim();
  const normalized = normalizeUserRole(role);
  if (rawRole === 'staff') return false;
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

