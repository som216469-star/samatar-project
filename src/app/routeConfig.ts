import {
  AppTabId,
  StudentSubSection,
  FinanceSubSection,
  PeopleSubSection
} from './navigationConfig';

export type PublicRouteId = 'landing' | 'login' | 'signup' | 'dashboard' | 'activate-teacher';

export interface ParsedAppRoute {
  publicRoute: PublicRouteId;
  activeTab: AppTabId;
  studentSubSection: StudentSubSection;
  peopleSubSection: PeopleSubSection;
  financeSubSection: FinanceSubSection;
  studentProfileId?: string;
}

const VALID_STUDENT_SUBS: StudentSubSection[] = [
  'all',
  'add',
  'active',
  'inactive',
  'archived',
  'import',
  'export'
];

const FINANCE_ROUTE_MAP: Record<string, FinanceSubSection> = {
  overview: 'overview',
  invoices: 'invoices',
  payments: 'payments',
  expenses: 'expenses',
  income: 'income',
  budgets: 'budgets',
  payroll: 'payroll',
  'profit-loss': 'profit_loss',
  profit_loss: 'profit_loss',
  'cash-flow': 'cash_flow',
  cash_flow: 'cash_flow',
  'fee-structures': 'fee_structures',
  fee_structures: 'fee_structures',
  reports: 'reports'
};

export function parseAppLocation(pathname: string, search: string = ''): ParsedAppRoute {
  const cleanPath = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';

  const defaults: ParsedAppRoute = {
    publicRoute: 'landing',
    activeTab: 'overview',
    studentSubSection: 'all',
    peopleSubSection: 'teachers',
    financeSubSection: 'overview'
  };

  if (cleanPath.startsWith('/activate-teacher') || search.includes('token=')) {
    return { ...defaults, publicRoute: 'activate-teacher' };
  }
  if (cleanPath === '/login') {
    return { ...defaults, publicRoute: 'login' };
  }
  if (cleanPath === '/signup') {
    return { ...defaults, publicRoute: 'signup' };
  }
  if (cleanPath === '/') {
    return defaults;
  }

  // Workspace Routes
  if (cleanPath === '/dashboard') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'overview' };
  }

  if (cleanPath === '/students' || cleanPath.startsWith('/students/')) {
    const rawSegment = pathname.slice('/students/'.length).split('/')[0] || '';
    const sub = rawSegment.toLowerCase();
    if (!sub || sub === 'all') {
      return { ...defaults, publicRoute: 'dashboard', activeTab: 'students', studentSubSection: 'all' };
    }
    if (VALID_STUDENT_SUBS.includes(sub as StudentSubSection)) {
      return {
        ...defaults,
        publicRoute: 'dashboard',
        activeTab: 'students',
        studentSubSection: sub as StudentSubSection
      };
    }
    return {
      ...defaults,
      publicRoute: 'dashboard',
      activeTab: 'students',
      studentSubSection: 'all',
      studentProfileId: decodeURIComponent(rawSegment)
    };
  }

  if (cleanPath === '/attendance') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'attendance' };
  }
  if (cleanPath === '/classes') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'classes' };
  }
  if (cleanPath === '/subjects') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'subjects' };
  }
  if (cleanPath === '/exams') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'exams' };
  }
  if (cleanPath === '/reports') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'reports' };
  }

  if (cleanPath === '/people' || cleanPath.startsWith('/people/')) {
    const sub = cleanPath.slice('/people/'.length).split('/')[0];
    const peopleSub: PeopleSubSection =
      sub === 'staff' ? 'staff' : sub === 'guardians' ? 'guardians' : 'teachers';
    return {
      ...defaults,
      publicRoute: 'dashboard',
      activeTab: 'people',
      peopleSubSection: peopleSub
    };
  }

  if (cleanPath === '/staff-attendance') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'staff_attendance' };
  }
  if (cleanPath === '/timetable') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'timetable' };
  }
  if (cleanPath === '/admissions') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'admissions' };
  }
  if (cleanPath === '/library') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'library' };
  }
  if (cleanPath === '/inventory') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'inventory' };
  }
  if (cleanPath === '/announcements') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'announcements' };
  }

  if (cleanPath === '/finance' || cleanPath.startsWith('/finance/')) {
    const sub = cleanPath.slice('/finance/'.length).split('/')[0];
    const financeSub = FINANCE_ROUTE_MAP[sub] || 'overview';
    return {
      ...defaults,
      publicRoute: 'dashboard',
      activeTab: 'fees',
      financeSubSection: financeSub
    };
  }

  if (cleanPath === '/settings') {
    return { ...defaults, publicRoute: 'dashboard', activeTab: 'settings' };
  }

  return { ...defaults, publicRoute: 'dashboard', activeTab: 'overview' };
}

export function buildWorkspacePath(
  tab: AppTabId,
  options?: {
    studentSubSection?: StudentSubSection;
    peopleSubSection?: PeopleSubSection;
    financeSubSection?: FinanceSubSection;
  }
): string {
  switch (tab) {
    case 'overview':
      return '/dashboard';
    case 'students': {
      const sub = options?.studentSubSection || 'all';
      return sub === 'all' ? '/students' : `/students/${sub}`;
    }
    case 'attendance':
      return '/attendance';
    case 'classes':
      return '/classes';
    case 'subjects':
      return '/subjects';
    case 'exams':
      return '/exams';
    case 'reports':
      return '/reports';
    case 'people': {
      const pSub = options?.peopleSubSection || 'teachers';
      return `/people/${pSub}`;
    }
    case 'staff_attendance':
      return '/staff-attendance';
    case 'timetable':
      return '/timetable';
    case 'admissions':
      return '/admissions';
    case 'library':
      return '/library';
    case 'inventory':
      return '/inventory';
    case 'announcements':
      return '/announcements';
    case 'fees': {
      const fSub = options?.financeSubSection || 'overview';
      if (fSub === 'overview') return '/finance';
      return `/finance/${fSub.replace(/_/g, '-')}`;
    }
    case 'settings':
      return '/settings';
    default:
      return '/dashboard';
  }
}
