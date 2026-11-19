export type Role = 'ADMIN' | 'ASSISTANT';

export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export type BillingMethod = 'SUBSCRIPTION' | 'PER_LESSON';

export type ChargeType = 'SUBSCRIPTION' | 'PER_LESSON';

export type ChargeStatus = 'UNPAID' | 'PAID' | 'VOIDED' | 'WAIVED';

export type ChargeSource = 'ATTENDANCE' | 'MONTHLY_CONFIRMATION';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  isActive: boolean;
  levels?: Level[];
}

export interface Level {
  id: string;
  subjectId: string;
  name: string;
  isActive: boolean;
  subject?: Subject;
}

export interface MonthlyBillingState {
  id: string;
  studentId: string;
  month: string;
  isConfirmed: boolean;
  method?: BillingMethod;
  billingMethod?: BillingMethod;
  confirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Fee {
  id: string;
  levelId: string;
  month: string; // YYYY-MM
  subscriptionFee: number;
  perLessonFee: number;
  createdAt?: string;
  level?: Level;
}

export interface StudentCombinationHistory {
  id: string;
  studentId: string;
  month: string;
  levelId: string;
  level?: Level;
}

export interface StudentStatusHistory {
  id: string;
  studentId: string;
  status: StudentStatus;
  effectiveDate: string;
}

export interface Charge {
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  type: ChargeType;
  amount: number;
  source: ChargeSource;
  status: ChargeStatus;
  attendanceId?: string | null;
  payment?: Payment | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  chargeId: string;
  amount: number;
  receivedOn: string;
  userId: string;
  paymentGroupId: string;
  isVoided: boolean;
  createdAt: string;
  charge?: Charge;
  user?: { name: string };
}

export interface PaymentGroup {
  id: string;
  studentId: string;
  receivedOn: string;
  totalAmount: number;
  userId: string;
  isVoided: boolean;
  createdAt: string;
  payments: Payment[];
  user?: { name: string };
  recordedBy?: { id?: string; name: string };
}

export interface Attendance {
  id: string;
  studentId: string;
  lessonId: string;
  userId?: string;
  recordedById?: string;
  isVoided: boolean;
  createdAt?: string;
  entryTimestamp?: string;
  lessonNumber?: number;
  student?: Student;
  lesson?: {
    id: string;
    levelId: string;
    date: string;
    level?: Level;
  };
  charge?: Charge | null;
  user?: { name: string };
  recordedBy?: { id?: string; name: string };
}

export interface StudentAttendanceReportItem {
  lessonId: string;
  date: string;
  month?: string;
  lessonNumber: number;
  monthlyLessonNumber?: number;
  levelId?: string;
  levelName?: string;
  subjectName?: string;
  combination?: string;
  status: 'PRESENT' | 'ABSENT';
  statusLabel?: string;
  attendanceId?: string | null;
  entryTimestamp?: string | null;
  recordedBy?: { id?: string; name: string } | null;
  recordedByName?: string | null;
  isVoided?: boolean;
}

export interface StudentAttendanceReport {
  student: {
    id: string;
    studentNumber: number;
    fullName: string;
    levelName?: string;
    subjectName?: string;
    combination?: string;
    status: string;
    enrollmentDate?: string;
  };
  summary: {
    totalHeld: number;
    totalAttended: number;
    totalAbsent: number;
  };
  records: StudentAttendanceReportItem[];
  lessons?: StudentAttendanceReportItem[];
}

export interface Student {
  id: string;
  studentNumber: number;
  fullName: string;
  enrollmentDate: string;
  studentPhone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  school?: string | null;
  notes?: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  currentLevel?: Level | null;
  combination?: string | null;
  levelName?: string | null;
  subjectName?: string | null;
  subjectId?: string | null;
  combinationHistories?: StudentCombinationHistory[];
  statusHistories?: StudentStatusHistory[];
  attendances?: Attendance[];
  charges?: Charge[];
  paymentGroups?: PaymentGroup[];
  billingStates?: MonthlyBillingState[];
  monthlyBillingState?: MonthlyBillingState | null;
  outstandingBalance?: number;
  totalCharged?: number;
  totalPaid?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
