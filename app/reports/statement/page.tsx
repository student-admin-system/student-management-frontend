'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Student } from '@/lib/types';
import { formatEGP } from '@/lib/format';
import { Alert } from '@/components/Alert';
import {
  FileText,
  Search,
  Printer,
  Calendar,
  Receipt,
  Banknote,
  User,
} from 'lucide-react';

function StatementReportContent() {
  useProtected();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get('studentId');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printDate, setPrintDate] = useState('');

  useEffect(() => {
    setPrintDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Search students
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get<any>(
          `/students?q=${encodeURIComponent(searchQuery.trim())}&limit=8`
        );
        const list = res.data || (Array.isArray(res) ? res : []);
        setSearchResults(list);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadStudent = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<Student>(`/students/${id}`);
      setStudent(data);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات كشف حساب الطالب');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialStudentId) {
      loadStudent(initialStudentId);
    }
  }, [initialStudentId, loadStudent]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Non-printable Controls */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">كشف حساب طالب</h1>
            <p className="text-sm text-gray-500 mt-1">
              عرض مفصل لسجل حضور الطالب ورسومه ومدفوعاته والرصيد المستحق مع إمكانية الطباعة
            </p>
          </div>

          {student && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب (PDF)</span>
            </button>
          )}
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Search */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <label className="block text-xs font-bold text-gray-700">
            البحث عن طالب لاصدار كشف الحساب
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الطالب أو الهاتف..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((stu) => (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => {
                    setStudent(stu);
                    setSearchQuery('');
                    setSearchResults([]);
                    loadStudent(stu.id);
                  }}
                  className="w-full text-right p-3 hover:bg-blue-50/50 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-600">
                      #{stu.studentNumber}
                    </span>
                    <span className="font-bold text-gray-900">{stu.fullName}</span>
                  </div>
                  <span className="text-blue-600 font-bold">عرض الكشف ←</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Printable Statement Document */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span>جاري تجهيز كشف الحساب...</span>
        </div>
      ) : student ? (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-gray-200 shadow-xs print:border-none print:shadow-none print:p-0 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">كشف حساب طالب</h2>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                تاريخ الطباعة: {printDate}
              </p>
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-gray-400">رقم الطالب</span>
              <div className="text-xl font-black text-blue-600">
                #{student.studentNumber}
              </div>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-gray-50 rounded-2xl text-xs print:bg-white print:border print:border-gray-200">
            <div>
              <span className="text-gray-400 block mb-0.5">اسم الطالب:</span>
              <span className="font-bold text-gray-900 text-sm">{student.fullName}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">المستوى الحالي:</span>
              <span className="font-semibold text-gray-800">
                {student.currentLevel?.name || '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">تاريخ الالتحاق:</span>
              <span className="font-semibold text-gray-800 font-mono">
                {student.enrollmentDate}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">هاتف ولي الأمر:</span>
              <span className="font-semibold text-gray-800 font-mono">
                {student.guardianPhone || '-'}
              </span>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-xs text-gray-500 block mb-1">إجمالي الرسوم</span>
              <span className="text-xl font-black text-gray-900 font-mono">
                {formatEGP(student.totalCharged ?? 0)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800">
              <span className="text-xs text-emerald-600 block mb-1">إجمالي المسدد</span>
              <span className="text-xl font-black text-emerald-700 font-mono">
                {formatEGP(student.totalPaid ?? 0)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800">
              <span className="text-xs text-rose-600 block mb-1">الرصيد المتبقي (المستحق)</span>
              <span className="text-xl font-black text-rose-700 font-mono">
                {formatEGP(student.outstandingBalance ?? 0)}
              </span>
            </div>
          </div>

          {/* Charges Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>الرسوم والمستحقات</span>
            </h3>
            <table className="w-full text-right text-xs border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3">الشهر</th>
                  <th className="py-2.5 px-3">نوع الرسم</th>
                  <th className="py-2.5 px-3">المبلغ</th>
                  <th className="py-2.5 px-3">المصدر</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!student.charges || student.charges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400">
                      لا توجد رسوم مسجلة
                    </td>
                  </tr>
                ) : (
                  student.charges.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 px-3 font-mono font-semibold">{c.month}</td>
                      <td className="py-2 px-3">
                        {c.type === 'SUBSCRIPTION' ? 'اشتراك شهري' : 'حصة منفردة'}
                      </td>
                      <td className="py-2 px-3 font-bold font-mono">{formatEGP(c.amount)}</td>
                      <td className="py-2 px-3">
                        {c.source === 'ATTENDANCE' ? 'حضور حصة' : 'تأكيد شهري'}
                      </td>
                      <td className="py-2 px-3 font-bold">
                        {c.status === 'PAID' && <span className="text-green-700">مسدد</span>}
                        {c.status === 'UNPAID' && <span className="text-rose-600">غير مسدد</span>}
                        {c.status === 'WAIVED' && <span className="text-purple-600">معفى</span>}
                        {c.status === 'VOIDED' && <span className="text-gray-400 line-through">ملغي</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payments Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>المدفوعات المسددة</span>
            </h3>
            <table className="w-full text-right text-xs border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3">تاريخ الاستلام</th>
                  <th className="py-2.5 px-3">المبلغ الإجمالي</th>
                  <th className="py-2.5 px-3">المستلم</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!student.paymentGroups || student.paymentGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">
                      لا توجد مدفوعات مسجلة
                    </td>
                  </tr>
                ) : (
                  student.paymentGroups.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono font-semibold">{p.receivedOn}</td>
                      <td className="py-2 px-3 font-bold text-emerald-700 font-mono">
                        {formatEGP(p.totalAmount)}
                      </td>
                      <td className="py-2 px-3">{p.recordedBy?.name || p.user?.name || '-'}</td>
                      <td className="py-2 px-3 font-bold">
                        {p.isVoided ? (
                          <span className="text-gray-400 line-through">ملغاة</span>
                        ) : (
                          <span className="text-green-700">مؤكدة</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Attendance Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>سجل الحضور</span>
            </h3>
            <table className="w-full text-right text-xs border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3">تاريخ الحصة</th>
                  <th className="py-2.5 px-3">المستوى</th>
                  <th className="py-2.5 px-3">المسؤول</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!student.attendances || student.attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">
                      لا يوجد حضور مسجل
                    </td>
                  </tr>
                ) : (
                  student.attendances.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {a.lesson?.date}
                      </td>
                      <td className="py-2 px-3">{a.lesson?.level?.name || '-'}</td>
                      <td className="py-2 px-3">{a.recordedBy?.name || a.user?.name || '-'}</td>
                      <td className="py-2 px-3 font-bold">
                        {a.isVoided ? (
                          <span className="text-gray-400 line-through">ملغي</span>
                        ) : (
                          <span className="text-green-700">حاضر</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-400 text-sm">
          يرجى البحث واختيار طالب لعرض كشف حسابه المفصل
        </div>
      )}
    </div>
  );
}

export default function StatementReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <StatementReportContent />
    </Suspense>
  );
}
