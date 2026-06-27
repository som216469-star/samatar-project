export interface Student {
  id: string;
  fullName: string;
  class: string;
  gender: string;
  guardianPhone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AttendanceRecord {
  date: string;
  studentId: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  timestamp: string;
  sessionType?: 'before_break' | 'after_break';
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName?: string; // dynamically appended for lists
  month: string;
  year: number;
  amount: number;
  paidAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  createdAt: string;
  updatedAt: string;
  history: Array<{
    action: string;
    amount: number;
    date: string;
  }>;
}

export interface SchoolClass {
  id: string;
  className: string;
  teacherName: string;
  roomNumber: string;
  description: string;
  createdAt: string;
}

export interface SchoolSubject {
  id: string;
  subjectName: string;
  subjectCode: string;
  className: string;
  teacherName: string;
  createdAt: string;
}

export interface ExamScore {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  subjectName: string;
  examName: string;
  term: string;
  maxMarks: number;
  marksObtained: number;
  grade: string;
  examDate: string;
  createdAt: string;
}

export interface SystemSettings {
  schoolName: string;
  currency: string;
  feeAmount: number;
  systemTheme: 'light' | 'dark';
}

export interface DbStatus {
  connected: boolean;
  fallbackMode: boolean;
  customSupabaseActive?: boolean;
  customSupabaseConfigured?: boolean;
  supabaseUrl: string;
  sqlScript: string;
}
