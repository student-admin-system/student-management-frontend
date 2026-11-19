'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Subject, Level } from '@/lib/types';
import { formatEGP } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Alert } from '@/components/Alert';
import {
  Users,
  Download,
  Filter,
  CreditCard,
  Phone,
  BookOpen,
} from 'lucide-react';

interface DebtorItem {
  studentId: string;
  studentNumber: number;
  fullName: string;
  guardianPhone?: string | null;
  studentPhone?: string | null;
  levelId?: string | null;
  levelName?: string | null;
  totalUnpaid: string;
  oldestUnpaidMonth?: string | null;
  unpaidChargesCount: number;
}

export default function DebtorsReportPage() {
  useProtected(true); // Admin only

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');

  const [debtors, setDebtors] = useState<DebtorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subjects & levels
  useEffect(() => {
    async function loadStructure() {
      try {
        const subs = await api.get<Subject[]>('/subjects');
        setSubjects(subs || []);
      } catch {
        setError('تعذر تحميل بيانات المواد');
      }
    }
    loadStructure();
  }, []);

  // Fetch debtors
  const fetchDebtors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
      if (selectedLevelId) params.set('levelId', selectedLevelId);

      const data = await api.get<DebtorItem[]>(`/reports/debtors?${params.toString()}`);
      setDebtors(data || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل قائمة المدينين');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubjectId, selectedLevelId]);

  useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableLevels = activeSubject?.levels || [];

  const handleExportCSV = () => {
    const headers = [
      'رقم الطالب',
      'اسم الطالب',
      'المستوى والمادة',
      'إجمالي المبلغ المستحق',
      'أقدم شهر غير مسدد',
      'عدد الرسوم غير المسددة',
      'هاتف ولي الأمر',
      'هاتف الطالب',
    ];

    const rows = debtors.map((d) => [
      d.studentNumber,
      d.fullName,
      d.levelName || '-',
      d.totalUnpaid,
      d.oldestUnpaidMonth || '-',
      d.unpaidChargesCount,
      d.guardianPhone || '-',
      d.studentPhone || '-',
    ]);

    downloadCSV('قائمة_المدينين_والمتأخرات', headers, rows);
  };

  const totalOutstanding = debtors.reduce(
    (sum, d) => sum + parseFloat(d.totalUnpaid || '0'),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            قائمة المدينين (المتأخرات المالية)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كشف بجميع الطلاب الذين عليهم رسوم مستحقة غير مدفوعة مع إمكانية التصفية والتصدير
          </p>
        </div>

        <button
          type="button"
          disabled={debtors.length === 0}
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-sm transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>تصدير ملف Excel / CSV</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-medium">عدد الطلاب المدينين</span>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 font-mono">
            {debtors.length} <span className="text-xs text-gray-500 font-normal">طالب</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-medium">إجمالي المبالغ المتأخرة</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 font-mono">
            {formatEGP(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-700">تصفية حسب:</span>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">المادة:</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSelectedLevelId('');
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-hidden"
          >
            <option value="">جميع المواد</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level Filter */}
        {selectedSubjectId && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">المستوى:</label>
            <select
              value={selectedLevelId}
              onChange={(e) => setSelectedLevelId(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-hidden"
            >
              <option value="">جميع المستويات</option>
              {availableLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Debtors Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">رقم الطالب</th>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">المستوى / المادة</th>
                <th className="py-3 px-4">إجمالي المبلغ المستحق</th>
                <th className="py-3 px-4">أقدم شهر متأخر</th>
                <th className="py-3 px-4">هاتف ولي الأمر</th>
                <th className="py-3 px-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    جاري تحميل التقرير...
                  </td>
                </tr>
              ) : debtors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-emerald-600 font-bold">
                    لا يوجد أي ديون أو مبالغ متأخرة! كافة الرسوم مسددة بالكامل.
                  </td>
                </tr>
              ) : (
                debtors.map((d) => (
                  <tr key={d.studentId} className="hover:bg-rose-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-600">
                      #{d.studentNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <Link
                        href={`/students/${d.studentId}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {d.fullName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {d.levelName || '-'}
                    </td>
                    <td className="py-3 px-4 font-black text-rose-600 font-mono text-base">
                      {formatEGP(d.totalUnpaid)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-700">
                      {d.oldestUnpaidMonth || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">
                      {d.guardianPhone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{d.guardianPhone}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/payments?studentId=${d.studentId}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        سداد الدفعة
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
