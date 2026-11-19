'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Level, Fee } from '@/lib/types';
import { formatEGP } from '@/lib/format';
import { Alert } from '@/components/Alert';
import {
  DollarSign,
  Plus,
  Layers,
  Calendar,
  Lock,
  History,
  CheckCircle,
} from 'lucide-react';

export default function FeesPage() {
  useProtected(true); // Admin only

  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [fees, setFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set/Edit Fee Form
  const [month, setMonth] = useState('');

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);
  const [subscriptionFee, setSubscriptionFee] = useState<string>('');
  const [perLessonFee, setPerLessonFee] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Load levels
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const data = await api.get<Level[]>('/subjects/levels');
        setLevels(data || []);
        if (data && data.length > 0) {
          setSelectedLevelId(data[0].id);
        }
      } catch {
        setError('تعذر تحميل بيانات المستويات');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Load fees history for selected level
  const fetchFees = useCallback(async () => {
    if (!selectedLevelId || !month) return;
    try {
      const data = await api.get<Fee[]>(`/fees?levelId=${selectedLevelId}`);
      setFees(data || []);

      // If fees exist for current month or recent, fill in inputs
      const currentMonthFee = (data || []).find((f) => f.month === month);
      if (currentMonthFee) {
        setSubscriptionFee(currentMonthFee.subscriptionFee.toString());
        setPerLessonFee(currentMonthFee.perLessonFee.toString());
      } else if (data && data.length > 0) {
        // Carry forward suggestion
        setSubscriptionFee(data[0].subscriptionFee.toString());
        setPerLessonFee(data[0].perLessonFee.toString());
      } else {
        setSubscriptionFee('');
        setPerLessonFee('');
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات المصروفات');
    }
  }, [selectedLevelId, month]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  // Submit / Upsert Fee (BR-17.3, BR-17.4)
  const handleSubmitFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLevelId || !month) return;

    const subNum = parseFloat(subscriptionFee);
    const lessonNum = parseFloat(perLessonFee);

    if (isNaN(subNum) || subNum < 0 || isNaN(lessonNum) || lessonNum < 0) {
      setError('يرجى إدخال قيم صحيحة للمصروفات (0 أو أكثر)');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await api.post('/fees', {
        levelId: selectedLevelId,
        month,
        subscriptionFee: subNum,
        perLessonFee: lessonNum,
      });

      setSuccess(`تم حفظ وتحديد مصروفات شهر ${month} بنجاح`);
      fetchFees();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ المصروفات');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLevel = levels.find((l) => l.id === selectedLevelId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">إدارة المصروفات والرسوم</h1>
        <p className="text-sm text-gray-500 mt-1">
          تحديد قيمة الاشتراك الشهري ورسم الحصة المنفردة لكل مستوى دراسي اعتباراً من أول الشهر
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Level Selector */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3">
        <Layers className="w-5 h-5 text-blue-600" />
        <label className="text-sm font-bold text-gray-800 shrink-0">اختر المستوى الدراسي:</label>
        <select
          value={selectedLevelId}
          onChange={(e) => setSelectedLevelId(e.target.value)}
          className="w-full sm:w-80 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
        >
          {levels.map((lvl) => (
            <option key={lvl.id} value={lvl.id}>
              {lvl.subject?.name ? `${lvl.subject.name} - ` : ''}
              {lvl.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Set / Update Fee Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">
              تحديد مصروفات شهر جديد / تحديث المصروفات
            </h2>
          </div>

          <form onSubmit={handleSubmitFee} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>الشهر المطبق عليه (YYYY-MM)</span>
              </label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                يسري التعديل من اليوم الأول للشهر. إذا وُجدت رسوم غير ملغاة بالشهر يتم تجميد المصروفات.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رسوم الاشتراك الشهري (ج.م)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={subscriptionFee}
                  onChange={(e) => setSubscriptionFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رسم الحصة المنفردة (ج.م)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={perLessonFee}
                  onChange={(e) => setPerLessonFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving || !selectedLevelId}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-500/20 text-sm transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <span>جاري الحفظ...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>حفظ وتثبيت المصروفات لهذا الشهر</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Historical Fees List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <span>سجل المصروفات المحددة للمستوى</span>
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {fees.length} تعديل
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">الشهر الساري</th>
                  <th className="py-3 px-4">الاشتراك الشهري</th>
                  <th className="py-3 px-4">رسم الحصة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      لم يتم تسجيل مصروفات لهذا المستوى بعد
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">
                        {fee.month}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {formatEGP(fee.subscriptionFee)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {formatEGP(fee.perLessonFee)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
