'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/csv';
import { formatEGP } from '@/lib/format';
import { Alert } from '@/components/Alert';
import {
  FileBarChart,
  Calendar,
  Download,
  CreditCard,
  Banknote,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface SummaryItem {
  subjectId: string;
  subjectName: string;
  levelId: string;
  levelName: string;
  charged: string;
  collected: string;
  waived: string;
  outstanding: string;
}

export default function FinancialSummaryPage() {
  useProtected(true); // Admin only

  const [month, setMonth] = useState('');

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);
  const [summaryList, setSummaryList] = useState<SummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!month) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{ month: string; summary: SummaryItem[] }>(
        `/reports/financial?month=${month}`
      );
      setSummaryList(res?.summary || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل الملخص المالي الشهري');
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExportCSV = () => {
    const headers = [
      'المادة',
      'المستوى',
      'المبالغ المفروضة (Charged)',
      'المبالغ المحصلة (Collected)',
      'المبالغ المعفاة (Waived)',
      'المبالغ المتبقية المستحقة (Outstanding)',
    ];

    const rows = summaryList.map((s) => [
      s.subjectName,
      s.levelName,
      s.charged,
      s.collected,
      s.waived,
      s.outstanding,
    ]);

    downloadCSV(`الملخص_المالي_الشهري_${month}`, headers, rows);
  };

  const totalCharged = summaryList.reduce((sum, s) => sum + parseFloat(s.charged || '0'), 0);
  const totalCollected = summaryList.reduce((sum, s) => sum + parseFloat(s.collected || '0'), 0);
  const totalWaived = summaryList.reduce((sum, s) => sum + parseFloat(s.waived || '0'), 0);
  const totalOutstanding = summaryList.reduce((sum, s) => sum + parseFloat(s.outstanding || '0'), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">الملخص المالي الشهري</h1>
          <p className="text-sm text-gray-500 mt-1">
            تقرير تفصيلي بالإيرادات والمبالغ المفروضة والمحصلة والمعفاة والمتأخرات لكل مادة ومستوى
          </p>
        </div>

        <button
          type="button"
          disabled={summaryList.length === 0}
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-sm transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>تصدير ملف Excel / CSV</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Month Selector */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3">
        <Calendar className="w-5 h-5 text-blue-600" />
        <label className="text-sm font-bold text-gray-800 shrink-0">الشهر المالي:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-medium">إجمالي المفروض (Charged)</span>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 font-mono">
            {formatEGP(totalCharged)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-emerald-600 font-medium">إجمالي المحصل (Collected)</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {formatEGP(totalCollected)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-purple-600 font-medium">إجمالي المعفى (Waived)</span>
          <div className="mt-2 text-2xl font-extrabold text-purple-600 font-mono">
            {formatEGP(totalWaived)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs text-rose-600 font-medium">إجمالي المتبقي (Outstanding)</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 font-mono">
            {formatEGP(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">المادة</th>
                <th className="py-3.5 px-4">المستوى الدراسي</th>
                <th className="py-3.5 px-4">المفروض</th>
                <th className="py-3.5 px-4">المحصل</th>
                <th className="py-3.5 px-4">المعفى</th>
                <th className="py-3.5 px-4">المتبقي المطلوب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    جاري تحميل الملخص المالي...
                  </td>
                </tr>
              ) : summaryList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    لا توجد بيانات مالية مسجلة لشهر {month}
                  </td>
                </tr>
              ) : (
                summaryList.map((item) => (
                  <tr key={item.levelId} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      {item.subjectName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700 text-xs">
                      {item.levelName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {formatEGP(item.charged)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      {formatEGP(item.collected)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-600">
                      {formatEGP(item.waived)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                      {formatEGP(item.outstanding)}
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
