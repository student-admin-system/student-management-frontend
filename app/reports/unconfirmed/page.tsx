'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/csv';
import { Alert } from '@/components/Alert';
import {
  AlertCircle,
  Calendar,
  Download,
  Receipt,
  ArrowUpLeft,
} from 'lucide-react';

interface UnconfirmedStudent {
  studentId: string;
  studentNumber: number;
  fullName: string;
  levelName?: string;
  guardianPhone?: string | null;
  unchargedAttendanceCount: number;
}

export default function UnconfirmedReportPage() {
  useProtected(true); // Admin only

  const [month, setMonth] = useState('');

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);
  const [list, setList] = useState<UnconfirmedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnconfirmed = useCallback(async () => {
    if (!month) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<any>(`/reports/unconfirmed?month=${month}`);
      const items = res?.students || (Array.isArray(res) ? res : []);
      setList(items);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل قائمة غير المؤكدين');
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchUnconfirmed();
  }, [fetchUnconfirmed]);

  const handleExportCSV = () => {
    const headers = [
      'رقم الطالب',
      'اسم الطالب',
      'المستوى الدراسي',
      'عدد الحصص غير المحسوبة',
      'هاتف ولي الأمر',
    ];

    const rows = list.map((s) => [
      s.studentNumber,
      s.fullName,
      s.levelName || '-',
      s.unchargedAttendanceCount,
      s.guardianPhone || '-',
    ]);

    downloadCSV(`اشتراكات_غير_مؤكدة_${month}`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            قائمة الاشتراكات غير المؤكدة
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كشف بالطلاب النشطين الذين لم يتم تأكيد طريقة محاسبتهم لشهر {month} مع عدد الحصص غير المحسوبة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-xs transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>الانتقال لشاشة تأكيد الاشتراكات</span>
          </Link>

          <button
            type="button"
            disabled={list.length === 0}
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Month Selector */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <label className="text-sm font-bold text-gray-800">اختر الشهر:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono"
          />
        </div>

        <div className="text-xs text-gray-500">
          إجمالي غير المؤكدين: <span className="font-bold text-gray-900">{list.length}</span> طالب
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">رقم الطالب</th>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">المستوى الدراسي</th>
                <th className="py-3 px-4">عدد الحصص بدون رسوم</th>
                <th className="py-3 px-4">هاتف ولي الأمر</th>
                <th className="py-3 px-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    جاري تحميل التقرير...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-green-600 font-bold">
                    تم تأكيد جميع اشتراكات الطلاب لشهر {month} بنجاح!
                  </td>
                </tr>
              ) : (
                list.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-600">
                      #{stu.studentNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <Link
                        href={`/students/${stu.studentId}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {stu.fullName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {stu.levelName || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {stu.unchargedAttendanceCount > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg text-xs">
                          {stu.unchargedAttendanceCount} حصص معلقة
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">لا يوجد حضور مسجل</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">
                      {stu.guardianPhone || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href="/billing"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <span>تأكيد الحساب</span>
                        <ArrowUpLeft className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
