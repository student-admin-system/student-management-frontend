'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Student, Level, StudentAttendanceReport } from '@/lib/types';
import { formatEGP } from '@/lib/format';
import { Alert } from '@/components/Alert';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  User,
  ArrowRight,
  Phone,
  School,
  Calendar,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  AlertTriangle,
  History,
  BookOpen,
  UserX,
  UserCheck,
  CheckCircle,
  Receipt,
  Banknote,
  Clock,
  RotateCcw,
  Hash,
  XCircle,
  Sparkles,
} from 'lucide-react';

function StudentDetailContent() {
  const { user, isAdmin } = useAuth();
  useProtected();
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceReport, setAttendanceReport] = useState<StudentAttendanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit info modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEnrollmentDate, setEditEnrollmentDate] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianPhone, setEditGuardianPhone] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Change combination modal state
  const [isCombinationOpen, setIsCombinationOpen] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [newLevelId, setNewLevelId] = useState('');
  const [combinationEffectiveMonth, setCombinationEffectiveMonth] = useState('');
  const [isSavingCombination, setIsSavingCombination] = useState(false);

  // Status toggle state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Delete student modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Void payment group state
  const [voidPaymentGroupId, setVoidPaymentGroupId] = useState<string | null>(null);
  const [isVoidingPayment, setIsVoidingPayment] = useState(false);

  // Waive charge state
  const [waiveChargeId, setWaiveChargeId] = useState<string | null>(null);
  const [isWaivingCharge, setIsWaivingCharge] = useState(false);

  // Reopen monthly billing state (SRS v2.0 - Admin only)
  const [reopenMonth, setReopenMonth] = useState<string | null>(null);
  const [isReopening, setIsReopening] = useState(false);

  const fetchStudent = useCallback(async () => {
    if (!studentId) return;
    try {
      setIsLoading(true);
      setError(null);
      const [data, attRep] = await Promise.all([
        api.get<Student>(`/students/${studentId}`),
        api.get<StudentAttendanceReport>(`/attendance/student/${studentId}`).catch(() => null),
      ]);
      setStudent(data);
      if (attRep) setAttendanceReport(attRep);

      // Populate edit fields
      setEditFullName(data.fullName);
      setEditEnrollmentDate(data.enrollmentDate);
      setEditStudentPhone(data.studentPhone || '');
      setEditGuardianName(data.guardianName || '');
      setEditGuardianPhone(data.guardianPhone || '');
      setEditSchool(data.school || '');
      setEditNotes(data.notes || '');
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات الطالب');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudent();
    // Also load levels for combinations
    api.get<Level[]>('/subjects/levels').then((lvls) => {
      setLevels(lvls || []);
      if (lvls && lvls.length > 0) setNewLevelId(lvls[0].id);
    }).catch(() => {});
  }, [fetchStudent]);

  // Handle Edit Info Save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingEdit(true);
      setError(null);
      await api.patch(`/students/${studentId}`, {
        fullName: editFullName.trim(),
        enrollmentDate: editEnrollmentDate,
        studentPhone: editStudentPhone.trim() || null,
        guardianName: editGuardianName.trim() || null,
        guardianPhone: editGuardianPhone.trim() || null,
        school: editSchool.trim() || null,
        notes: editNotes.trim() || null,
      });
      setSuccess('تم تحديث بيانات الطالب بنجاح');
      setIsEditOpen(false);
      fetchStudent();
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث بيانات الطالب');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Change Combination Save (BR-14)
  const handleSaveCombination = async () => {
    if (!newLevelId || !combinationEffectiveMonth) {
      setError('يرجى تحديد المستوى وشهر السريان');
      return;
    }
    try {
      setIsSavingCombination(true);
      setError(null);
      await api.post(`/students/${studentId}/combination`, {
        levelId: newLevelId,
        month: combinationEffectiveMonth,
      });
      setSuccess('تم تحديث المستوى الدراسي للطالب بنجاح');
      setIsCombinationOpen(false);
      fetchStudent();
    } catch (err: any) {
      setError(err?.message || 'تعذر تغيير المستوى الدراسي');
    } finally {
      setIsSavingCombination(false);
    }
  };

  // Handle Toggle Status (BR-15)
  const handleToggleStatus = async () => {
    if (!student) return;
    try {
      setIsSavingStatus(true);
      setError(null);
      const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/students/${studentId}/status`, {
        status: nextStatus,
      });
      setSuccess(
        nextStatus === 'ACTIVE'
          ? 'تم تفعيل الطالب وتطبيق نظام المحاسبة التلقائي'
          : 'تم تعطيل الطالب بنجاح'
      );
      setIsStatusModalOpen(false);
      fetchStudent();
    } catch (err: any) {
      setError(err?.message || 'تعذر تغيير حالة الطالب');
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Handle Delete Student Permanently (BR-23 / D3)
  const handleDeleteStudent = async () => {
    if (!student) return;
    if (deleteConfirmationText.trim() !== student.fullName.trim()) {
      setError('اسم الطالب غير مطابق');
      return;
    }
    try {
      setIsDeleting(true);
      setError(null);
      await api.delete(`/students/${studentId}`);
      router.push('/students');
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف الطالب');
      setIsDeleting(false);
    }
  };

  // Handle Void Payment Group (BR-07, FR-PAY-06)
  const handleVoidPaymentGroup = async () => {
    if (!voidPaymentGroupId) return;
    try {
      setIsVoidingPayment(true);
      setError(null);
      await api.post(`/payments/groups/${voidPaymentGroupId}/void`);
      setSuccess('تم إلغاء سداد الدفعة بنجاح وإعادة الرسوم للحالة غير المدفوعة');
      setVoidPaymentGroupId(null);
      fetchStudent();
    } catch (err: any) {
      setError(err?.message || 'تعذر إلغاء الدفعة');
    } finally {
      setIsVoidingPayment(false);
    }
  };

  // Handle Waive Charge (BR-22)
  const handleWaiveCharge = async () => {
    if (!waiveChargeId) return;
    try {
      setIsWaivingCharge(true);
      setError(null);
      await api.post(`/charges/${waiveChargeId}/waive`);
      setSuccess('تم إعفاء الطالب من الرسوم المحددة بنجاح');
      setWaiveChargeId(null);
      fetchStudent();
    } catch (err: any) {
      setError(err?.message || 'تعذر إعفاء الرسوم');
    } finally {
      setIsWaivingCharge(false);
    }
  };

  // Handle Reopen Monthly Billing State (SRS v2.0, PERM-11)
  const handleReopenMonth = async () => {
    if (!reopenMonth || !studentId) return;
    try {
      setIsReopening(true);
      setError(null);
      await api.post('/billing/reopen', {
        studentId,
        month: reopenMonth,
      });
      setSuccess(`تم إعادة ضبط طريقة الدفع لشهر (${reopenMonth}) بنجاح`);
      setReopenMonth(null);
      fetchStudent();
    } catch (err: any) {
      setError(err?.message || 'تعذر إعادة ضبط طريقة الدفع');
    } finally {
      setIsReopening(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500">لم يتم العثور على بيانات هذا الطالب</p>
        <Link href="/students" className="text-blue-600 font-bold hover:underline">
          العودة لسجل الطلاب
        </Link>
      </div>
    );
  }

  const canEditEnrollment =
    (!student.attendances || student.attendances.filter((a) => !a.isVoided).length === 0) &&
    (!student.charges || student.charges.filter((c) => c.status !== 'VOIDED').length === 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="p-2 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-600 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-500 text-sm">#{student.studentNumber}</span>
              <h1 className="text-2xl font-extrabold text-gray-900">{student.fullName}</h1>
              {student.status === 'ACTIVE' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                  نشط
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                  غير نشط
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              تاريخ الالتحاق: <span className="font-semibold text-gray-700">{student.enrollmentDate}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/reports/statement?studentId=${student.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>كشف حساب الطالب</span>
          </Link>

          <Link
            href={`/payments?studentId=${student.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>تسجيل دفعة</span>
          </Link>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>تعديل البيانات</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCombinationOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>تغيير المستوى</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStatusModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-colors border cursor-pointer ${
                  student.status === 'ACTIVE'
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                    : 'border-green-200 bg-green-50 hover:bg-green-100 text-green-800'
                }`}
              >
                {student.status === 'ACTIVE' ? (
                  <>
                    <UserX className="w-4 h-4" />
                    <span>تعطيل (غير نشط)</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>تفعيل الطالب</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setIsDeleteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف نهائي</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Financial Summary KPIs (formatEGP) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-medium">إجمالي المبالغ المفروضة</span>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 font-mono">
            {formatEGP(student.totalCharged ?? 0)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-medium">إجمالي المدفوعات المسددة</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {formatEGP(student.totalPaid ?? 0)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-medium">الرصيد المستحق (الديون)</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 font-mono">
            {formatEGP(student.outstandingBalance ?? 0)}
          </div>
        </div>
      </div>

      {/* Student Profile Info Grid */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
        <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          <span>المعلومات الشخصية والأكاديمية</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <span className="text-xs text-gray-400 block mb-1">المستوى الحالي:</span>
            <span className="font-bold text-gray-900">
              {student.currentLevel?.name || student.combination || '-'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">هاتف الطالب:</span>
            <span className="font-semibold text-gray-700 font-mono">
              {student.studentPhone || 'غير مسجل'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">اسم ولي الأمر:</span>
            <span className="font-semibold text-gray-700">
              {student.guardianName || 'غير مسجل'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">هاتف ولي الأمر:</span>
            <span className="font-semibold text-gray-700 font-mono">
              {student.guardianPhone || 'غير مسجل'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">المدرسة:</span>
            <span className="font-semibold text-gray-700">{student.school || 'غير مسجلة'}</span>
          </div>

          <div className="sm:col-span-3">
            <span className="text-xs text-gray-400 block mb-1">ملاحظات:</span>
            <span className="text-gray-600">{student.notes || 'لا توجد ملاحظات'}</span>
          </div>
        </div>
      </div>

      {/* Monthly Billing States & Reopen Month (SRS v2.0 - Admin Only) */}
      {student.billingStates && student.billingStates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>طريقة المحاسبة الشهرية وحالة القفل</span>
            </h3>
            <span className="text-xs text-gray-500">
              {student.billingStates.length} شهر مسجل
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">الشهر</th>
                  <th className="py-3 px-4">طريقة المحاسبة المعتمدة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">تاريخ الاعتماد</th>
                  {isAdmin && <th className="py-3 px-4 text-center">إجراءات المدير</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {student.billingStates.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-800">{st.month}</td>
                    <td className="py-3 px-4">
                      {st.method === 'SUBSCRIPTION' || (st as any).billingMethod === 'SUBSCRIPTION' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          اشتراك شهري
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          نظام بالحصة
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {st.isConfirmed ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                          مقفل ومؤكد
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold">
                          معلق / مفتوح
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {st.confirmedAt?.split('T')[0] || '-'}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center">
                        {st.isConfirmed && (
                          <button
                            type="button"
                            onClick={() => setReopenMonth(st.month)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                            title="إعادة ضبط طريقة الدفع للشهر وإلغاء الرسوم غير المسددة"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>إعادة ضبط طريقة الدفع (Reopen)</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Attendance Report (SRS v2.0 - Summary cards & chronological held lessons) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>تقرير حضور وغياب الطالب المنظم (SRS v2.0)</span>
          </h3>
          <span className="text-xs text-gray-500">
            يشمل كافة الحصص المنعقدة لمستوى الطالب خلال فترات قيده النشطة
          </span>
        </div>

        {/* Summary Cards */}
        {attendanceReport && attendanceReport.summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50/70 border border-blue-200/70 p-4 rounded-2xl">
              <span className="text-xs text-blue-800 font-bold">إجمالي الحصص المنعقدة:</span>
              <div className="text-2xl font-black text-blue-900 font-mono mt-1">
                {attendanceReport.summary.totalHeld} حصة
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/70 p-4 rounded-2xl">
              <span className="text-xs text-emerald-800 font-bold">عدد مرات الحضور:</span>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {attendanceReport.summary.totalAttended} مرة
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/70 p-4 rounded-2xl">
              <span className="text-xs text-rose-800 font-bold">عدد مرات الغياب:</span>
              <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                {attendanceReport.summary.totalAbsent} مرة
              </div>
            </div>
          </div>
        )}

        {/* Chronological Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">تاريخ الحصة</th>
                <th className="py-3 px-4">رقم الحصة بالشهر</th>
                <th className="py-3 px-4">المستوى والمادة</th>
                <th className="py-3 px-4">المسؤول عن التسجيل</th>
                <th className="py-3 px-4">حالة الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const records = attendanceReport?.records || (attendanceReport as any)?.lessons || [];
                if (records.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        لا توجد حصص منعقدة مسجلة لهذا الطالب حتى الآن
                      </td>
                    </tr>
                  );
                }
                return records.map((rec: any) => {
                  const lessonNum = rec.lessonNumber ?? rec.monthlyLessonNumber ?? '-';
                  const comboText = rec.levelName ? `${rec.subjectName || ''} - ${rec.levelName}` : rec.combination || '-';
                  const recorder = rec.recordedBy?.name ?? (typeof rec.recordedBy === 'string' ? rec.recordedBy : '-');
                  return (
                    <tr key={rec.lessonId} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-semibold text-gray-700 font-mono">
                        {rec.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-black">
                          حصة رقم {lessonNum}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {comboText}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {recorder}
                      </td>
                      <td className="py-3 px-4">
                        {rec.status === 'PRESENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>حاضر</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>غائب</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charges & Financial Records */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-600" />
            <span>سجل الرسوم والمطالبات</span>
          </h3>
          <span className="text-xs text-gray-500">
            {student.charges?.length || 0} رسم مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">الشهر</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">المصدر</th>
                <th className="py-3 px-4">الحالة</th>
                {isAdmin && <th className="py-3 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!student.charges || student.charges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    لا توجد رسوم مسجلة لهذا الطالب
                  </td>
                </tr>
              ) : (
                student.charges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-gray-700">
                      {charge.month}
                    </td>
                    <td className="py-3 px-4">
                      {charge.type === 'SUBSCRIPTION' ? 'اشتراك شهري' : 'حصة منفردة'}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 font-mono">
                      {formatEGP(charge.amount)}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {charge.source === 'ATTENDANCE' ? 'حضور حصة' : 'تأكيد شهري'}
                    </td>
                    <td className="py-3 px-4">
                      {charge.status === 'PAID' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          مدفوع
                        </span>
                      )}
                      {charge.status === 'UNPAID' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          مستحق غير مدفوع
                        </span>
                      )}
                      {charge.status === 'WAIVED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                          معفى
                        </span>
                      )}
                      {charge.status === 'VOIDED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 line-through">
                          ملغي
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center">
                        {charge.status === 'UNPAID' && (
                          <button
                            type="button"
                            onClick={() => setWaiveChargeId(charge.id)}
                            className="text-xs text-purple-600 hover:text-purple-800 font-bold px-2 py-1 bg-purple-50 rounded-lg hover:bg-purple-100 cursor-pointer"
                          >
                            إعفاء من الرسوم
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments History Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <span>سجل المدفوعات المسددة</span>
          </h3>
          <span className="text-xs text-gray-500">
            {student.paymentGroups?.length || 0} دفعة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">تاريخ الاستلام</th>
                <th className="py-3 px-4">إجمالي الدفعة</th>
                <th className="py-3 px-4">المسؤول عن التسجيل</th>
                <th className="py-3 px-4">الرسوم المسددة</th>
                <th className="py-3 px-4">الحالة</th>
                {isAdmin && <th className="py-3 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!student.paymentGroups || student.paymentGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    لا توجد مدفوعات مسجلة
                  </td>
                </tr>
              ) : (
                student.paymentGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-700">
                      {group.receivedOn}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600 font-mono">
                      {formatEGP(group.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {group.recordedBy?.name || group.user?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">
                      {group.payments?.length || 0} بنود رسوم
                    </td>
                    <td className="py-3 px-4">
                      {group.isVoided ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 line-through">
                          ملغاة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          مؤكدة
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center">
                        {!group.isVoided && (
                          <button
                            type="button"
                            onClick={() => setVoidPaymentGroupId(group.id)}
                            className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                          >
                            إلغاء الدفعة
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histories: Combination & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Combination History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <span>سجل المستويات والمواد (شهرياً)</span>
          </h3>
          <ul className="divide-y divide-gray-100 text-sm">
            {student.combinationHistories?.map((h) => (
              <li key={h.id} className="py-2.5 flex justify-between items-center">
                <span className="font-mono font-bold text-gray-700">{h.month}</span>
                <span className="font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg text-xs">
                  {h.level?.name || 'مستوى'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Status History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>سجل تغييرات الحالة</span>
          </h3>
          <ul className="divide-y divide-gray-100 text-sm">
            {student.statusHistories?.map((s) => (
              <li key={s.id} className="py-2.5 flex justify-between items-center">
                <span className="font-mono text-gray-600">{s.effectiveDate}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    s.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Edit Modal (FR-STU-07) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تعديل بيانات الطالب</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">اسم الطالب رباعي</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  تاريخ الالتحاق
                  {!canEditEnrollment && (
                    <span className="text-xs text-amber-600 font-normal mr-2">
                      (مقفل لوجود حضور أو رسوم)
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  required
                  disabled={!canEditEnrollment}
                  value={editEnrollmentDate}
                  onChange={(e) => setEditEnrollmentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">هاتف الطالب</label>
                  <input
                    type="tel"
                    value={editStudentPhone}
                    onChange={(e) => setEditStudentPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">هاتف ولي الأمر</label>
                  <input
                    type="tel"
                    value={editGuardianPhone}
                    onChange={(e) => setEditGuardianPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-left font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={editGuardianName}
                  onChange={(e) => setEditGuardianName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">المدرسة</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Combination Modal (BR-14) */}
      {isCombinationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تغيير المستوى الدراسي</h3>
            <p className="text-xs text-gray-500 mb-4">
              حسب قواعد العمل (BR-14)، يسري التغيير من أول يوم في الشهر المحدد.
            </p>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">المستوى الجديد</label>
                <select
                  value={newLevelId}
                  onChange={(e) => setNewLevelId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.subject?.name ? `${l.subject.name} - ` : ''}
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">شهر السريان (YYYY-MM)</label>
                <input
                  type="month"
                  value={combinationEffectiveMonth}
                  onChange={(e) => setCombinationEffectiveMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCombinationOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isSavingCombination}
                  onClick={handleSaveCombination}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCombination ? 'جاري الحفظ...' : 'تأكيد التغيير'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      <ConfirmModal
        isOpen={isStatusModalOpen}
        title={student.status === 'ACTIVE' ? 'تعطيل حساب الطالب' : 'إعادة تفعيل الطالب'}
        message={
          student.status === 'ACTIVE'
            ? 'سيتم تحويل حالة الطالب إلى "غير نشط". لن يظهر في البحث الافتراضي للحضور ولن يشمله تأكيد الاشتراكات الشهرية القادمة مع الحفاظ الكامل على كافة سجلاته وديونه.'
            : 'سيتم إعادة تفعيل الطالب إلى "نشط"، وسيطبق عليه نظام محاسبة الحصص تلقائياً للشهر الحالي.'
        }
        confirmText={student.status === 'ACTIVE' ? 'تعطيل الطالب' : 'تفعيل الطالب'}
        isDanger={student.status === 'ACTIVE'}
        isLoading={isSavingStatus}
        onConfirm={handleToggleStatus}
        onCancel={() => setIsStatusModalOpen(false)}
      />

      {/* Reopen Month Confirmation Modal (SRS v2.0 - Admin Only) */}
      <ConfirmModal
        isOpen={!!reopenMonth}
        title={`إعادة ضبط طريقة الدفع لشهر (${reopenMonth})`}
        message="وفقاً لـ (SRS v2.0 / PERM-11)، سيؤدي هذا الإجراء إلى فتح الشهر مجدداً وإلغاء الرسوم غير المسددة أو المعفاة المرتبطة به. إذا كانت هناك رسوم مسددة، يجب إلغاء دفعة السداد أولاً."
        confirmText="تأكيد إعادة الضبط"
        isDanger={false}
        isLoading={isReopening}
        onConfirm={handleReopenMonth}
        onCancel={() => setReopenMonth(null)}
      />

      {/* Delete Confirmation Modal (BR-23 / D3) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">حذف الطالب نهائياً (إجراء لا رجعة فيه)</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              وفقاً للمتطلب (BR-23)، هذا الإجراء سيحذف الطالب ({student.fullName}) نهائياً وكافة بياناته وسجلات الحضور والرسوم والمدفوعات، ولن يمكن استرجاعها إطلاقاً.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                لتأكيد الحذف، اكتب اسم الطالب كاملاً: <span className="text-red-600">{student.fullName}</span>
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="اكتب اسم الطالب هنا للتأكيد"
                className="w-full px-3 py-2 bg-red-50/50 border border-red-200 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-sm cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim() !== student.fullName.trim() || isDeleting}
                onClick={handleDeleteStudent}
                className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 text-sm disabled:opacity-40 cursor-pointer"
              >
                {isDeleting ? 'جاري الحذف...' : 'حذف نهائي الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Payment Group Modal */}
      <ConfirmModal
        isOpen={!!voidPaymentGroupId}
        title="إلغاء دفعة مسددة"
        message="هل أنت متأكد من رغبتك في إلغاء هذه الدفعة ككل؟ سيتم إلغاء سجلات السداد المرتبطة بها وإعادة الرسوم إلى حالة غير مدفوعة."
        confirmText="تأكيد الإلغاء"
        isDanger={true}
        isLoading={isVoidingPayment}
        onConfirm={handleVoidPaymentGroup}
        onCancel={() => setVoidPaymentGroupId(null)}
      />

      {/* Waive Charge Modal */}
      <ConfirmModal
        isOpen={!!waiveChargeId}
        title="إعفاء من الرسوم"
        message="هل أنت متأكد من إعفاء الطالب من هذا الرسم بالكامل؟ سيتم تغيير حالة الرسم إلى (معفى) واستبعاده من إجمالي المبالغ المستحقة."
        confirmText="تأكيد الإعفاء"
        isDanger={false}
        isLoading={isWaivingCharge}
        onConfirm={handleWaiveCharge}
        onCancel={() => setWaiveChargeId(null)}
      />
    </div>
  );
}

export default function StudentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <StudentDetailContent />
    </Suspense>
  );
}
