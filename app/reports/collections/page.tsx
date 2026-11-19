'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/csv';
import { formatEGP } from '@/lib/format';
import { Alert } from '@/components/Alert';
import {
  Banknote,
  Calendar,
  Download,
  User,
  CreditCard,
} from 'lucide-react';

interface DailyCollectionItem {
  id: string;
  amount: string;
  receivedOn: string;
  entryTimestamp: string;
  student: {
    id: string;
    studentNumber: number;
    fullName: string;
  };
  recordedBy: {
    id: string;
    name: string;
    username: string;
  };
}

export default function DailyCollectionsPage() {
  const { user, isAdmin } = useAuth();
  useProtected();

  const [date, setDate] = useState('');

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);
  const [payments, setPayments] = useState<DailyCollectionItem[]>([]);
  const [totalAmount, setTotalAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    if (!date) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{
        date: string;
        totalAmount: string;
        paymentsCount: number;
        payments: DailyCollectionItem[];
      }>(`/reports/collections?date=${date}`);

      setPayments(res?.payments || []);
      setTotalAmount(res?.totalAmount || '0');
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل تحصيلات اليوم');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleExportCSV = () => {
    const headers = [
      'رقم الطالب',
      'اسم الطالب',
      'مبلغ السداد',
      'تاريخ الاستلام',
      'وقت التسجيل',
      'المسؤول عن التحصيل',
    ];

    const rows = payments.map((p) => [
      p.student?.studentNumber,
      p.student?.fullName,
      p.amount,
      p.receivedOn,
      new Date(p.entryTimestamp).toLocaleTimeString('ar-EG'),
      p.recordedBy?.name || '-',
    ]);

    downloadCSV(`تحصيلات_${date}`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            تقرير التحصيلات اليومية
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? 'كشف بجميع المبالغ المحصلة في اليوم المحدد وهوية المستخدم المسجل'
              : 'كشف بالمبالغ التي قمت بتحصيلها وتسجيلها في اليوم المحدد'}
          </p>
        </div>

        <button
          type="button"
          disabled={payments.length === 0}
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-sm transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>تصدير ملف Excel / CSV</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Date Selector & Total KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <label className="text-sm font-bold text-gray-800 shrink-0">تاريخ التحصيل:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">إجمالي تحصيلات اليوم</span>
            <div className="mt-1 text-2xl font-black text-emerald-600 font-mono">
              {formatEGP(totalAmount)}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Banknote className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>سجل المدفوعات المسددة ({payments.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">رقم الطالب</th>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">المبلغ المسدد</th>
                <th className="py-3 px-4">تاريخ الاستلام</th>
                <th className="py-3 px-4">وقت التسجيل</th>
                <th className="py-3 px-4">المسؤول عن التسجيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    جاري تحميل التحصيلات...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    لا توجد أي تحصيلات مسجلة في هذا التاريخ
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-600">
                      #{p.student?.studentNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <Link
                        href={`/students/${p.student?.id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {p.student?.fullName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-base">
                      {formatEGP(p.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-700">
                      {p.receivedOn}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">
                      {new Date(p.entryTimestamp).toLocaleTimeString('ar-EG')}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{p.recordedBy?.name || '-'}</span>
                      </span>
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
