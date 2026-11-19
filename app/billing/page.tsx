'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { BillingMethod } from '@/lib/types';
import { Alert } from '@/components/Alert';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Receipt,
  Calendar,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Check,
  Search,
  Filter,
} from 'lucide-react';

interface BillingCandidate {
  studentId: string;
  studentNumber: number;
  fullName: string;
  levelName: string;
  isConfirmed: boolean;
  confirmedMethod?: BillingMethod | null;
  suggestedMethod: BillingMethod;
  selectedMethod: BillingMethod;
  unchargedAttendanceCount: number;
}

export default function BillingPage() {
  const { isAdmin } = useAuth();
  useProtected(true); // Admin only

  const [month, setMonth] = useState('');

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);
  const [candidates, setCandidates] = useState<BillingCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reopen month state (BR-08)
  const [reopenStudentId, setReopenStudentId] = useState<string | null>(null);
  const [isReopening, setIsReopening] = useState(false);

  // Search filter
  const [filterQuery, setFilterQuery] = useState('');
  const [filterConfirmed, setFilterConfirmed] = useState<'all' | 'unconfirmed' | 'confirmed'>('all');

  const fetchCandidates = useCallback(async () => {
    if (!month) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<any[]>(`/billing/candidates?month=${month}`);

      // Map to state with selectedMethod prefilled with suggestedMethod or confirmedMethod
      const mapped: BillingCandidate[] = (data || []).map((item) => ({
        studentId: item.studentId || item.id,
        studentNumber: item.studentNumber,
        fullName: item.fullName,
        levelName: item.levelName || item.currentLevel?.name || '-',
        isConfirmed: !!item.isConfirmed,
        confirmedMethod: item.confirmedMethod,
        suggestedMethod: item.suggestedMethod || 'SUBSCRIPTION',
        selectedMethod: item.confirmedMethod || item.suggestedMethod || 'SUBSCRIPTION',
        unchargedAttendanceCount: item.unchargedAttendanceCount ?? 0,
      }));

      setCandidates(mapped);

      // By default select unconfirmed students
      const unconfirmedSet = new Set<string>();
      mapped.forEach((c) => {
        if (!c.isConfirmed) unconfirmedSet.add(c.studentId);
      });
      setSelectedIds(unconfirmedSet);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات المحاسبة الشهرية');
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Toggle selection checkbox
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Toggle all visible unconfirmed
  const handleSelectAllUnconfirmed = () => {
    const unconfirmed = candidates.filter((c) => !c.isConfirmed);
    if (selectedIds.size === unconfirmed.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unconfirmed.map((c) => c.studentId)));
    }
  };

  // Change selected method for candidate
  const handleMethodChange = (id: string, method: BillingMethod) => {
    setCandidates((prev) =>
      prev.map((c) => (c.studentId === id ? { ...c, selectedMethod: method } : c))
    );
  };

  // Confirm billing for selected candidates
  const handleConfirmBilling = async () => {
    const toConfirm = candidates.filter((c) => selectedIds.has(c.studentId) && !c.isConfirmed);
    if (toConfirm.length === 0) {
      setError('يرجى تحديد طلاب غير مؤكدين أولاً');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.post('/billing/confirm', {
        month,
        confirmations: toConfirm.map((c) => ({
          studentId: c.studentId,
          method: c.selectedMethod,
        })),
      });

      setSuccess(`تم تأكيد طريقة المحاسبة وتوليد الرسوم لعدد (${toConfirm.length}) طالب بنجاح`);
      fetchCandidates();
    } catch (err: any) {
      setError(err?.message || 'تعذر تأكيد الاشتراكات');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reopen month (BR-08)
  const handleReopen = async () => {
    if (!reopenStudentId) return;
    try {
      setIsReopening(true);
      setError(null);
      await api.post('/billing/reopen', {
        studentId: reopenStudentId,
        month,
      });
      setSuccess('تم إعادة فتح الشهر للطالب بنجاح وإلغاء الرسوم السابقة');
      setReopenStudentId(null);
      fetchCandidates();
    } catch (err: any) {
      setError(err?.message || 'تعذر إعادة فتح الشهر');
    } finally {
      setIsReopening(false);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    if (filterConfirmed === 'confirmed' && !c.isConfirmed) return false;
    if (filterConfirmed === 'unconfirmed' && c.isConfirmed) return false;
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.studentNumber.toString().includes(q)
      );
    }
    return true;
  });

  const unconfirmedCount = candidates.filter((c) => !c.isConfirmed).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">تأكيد الاشتراكات الشهرية</h1>
          <p className="text-sm text-gray-500 mt-1">
            اختيار وتأكيد طريقة محاسبة الطلاب (اشتراك شهري أو حصص منفردة) وتوليد الرسوم
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-xs">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-700">الشهر:</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm font-bold text-gray-900 bg-transparent outline-hidden font-mono"
          />
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Unconfirmed Summary Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-base">
              الطلاب غير المؤكدين لشهر {month}
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              يوجد <span className="font-bold">{unconfirmedCount}</span> طالب لم يتم تأكيد طريقة محاسبتهم بعد
            </p>
          </div>
        </div>

        {unconfirmedCount > 0 && (
          <button
            type="button"
            disabled={isSubmitting || selectedIds.size === 0}
            onClick={handleConfirmBilling}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-sm transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            {isSubmitting ? (
              <span>جاري التأكيد...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>تأكيد المحددين ({selectedIds.size}) وتوليد الرسوم</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو رقمه..."
            className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterConfirmed('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterConfirmed === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الكل ({candidates.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterConfirmed('unconfirmed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterConfirmed === 'unconfirmed'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            غير المؤكدين ({unconfirmedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterConfirmed('confirmed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterConfirmed === 'confirmed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            المؤكدين ({candidates.length - unconfirmedCount})
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size === candidates.filter((c) => !c.isConfirmed).length
                    }
                    onChange={handleSelectAllUnconfirmed}
                    className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-4 w-24">رقم الطالب</th>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">المستوى</th>
                <th className="py-3 px-4">حصص غير محسوبة</th>
                <th className="py-3 px-4">طريقة المحاسبة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    جاري تحميل قائمة الطلاب...
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    لا يوجد طلاب مطابقين
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr
                    key={c.studentId}
                    className={`hover:bg-blue-50/30 transition-colors ${
                      selectedIds.has(c.studentId) && !c.isConfirmed
                        ? 'bg-blue-50/20'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      {!c.isConfirmed && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.studentId)}
                          onChange={() => handleToggleSelect(c.studentId)}
                          className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-600">
                      #{c.studentNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {c.fullName}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {c.levelName}
                    </td>
                    <td className="py-3 px-4">
                      {c.unchargedAttendanceCount > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg text-xs">
                          {c.unchargedAttendanceCount} حصص
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.isConfirmed ? (
                        <span className="font-bold text-gray-800 text-xs">
                          {c.confirmedMethod === 'SUBSCRIPTION'
                            ? 'اشتراك شهري'
                            : 'محاسبة بالحصة'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name={`method-${c.studentId}`}
                              value="SUBSCRIPTION"
                              checked={c.selectedMethod === 'SUBSCRIPTION'}
                              onChange={() =>
                                handleMethodChange(c.studentId, 'SUBSCRIPTION')
                              }
                              className="text-blue-600"
                            />
                            <span>اشتراك شهري</span>
                          </label>
                          <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name={`method-${c.studentId}`}
                              value="PER_LESSON"
                              checked={c.selectedMethod === 'PER_LESSON'}
                              onChange={() =>
                                handleMethodChange(c.studentId, 'PER_LESSON')
                              }
                              className="text-blue-600"
                            />
                            <span>محاسبة بالحصة</span>
                          </label>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.isConfirmed ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          مؤكد
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          غير مؤكد
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.isConfirmed && (
                        <button
                          type="button"
                          onClick={() => setReopenStudentId(c.studentId)}
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إعادة فتح</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reopen Confirmation Modal (BR-08) */}
      <ConfirmModal
        isOpen={!!reopenStudentId}
        title="إعادة فتح الشهر للطالب"
        message="وفقاً لقاعدة العمل (BR-08)، إعادة فتح الشهر ستلغي كافة الرسوم المولدة من التأكيد السابق (يجب ألا تكون مدفوعة)، وتُبقي على الحضور، وتعيد الطالب لحالة غير مؤكد لتتمكن من إعادة اختيار الطريقة وتأكيدها بأثر رجعي."
        confirmText="تأكيد إعادة الفتح"
        isDanger={true}
        isLoading={isReopening}
        onConfirm={handleReopen}
        onCancel={() => setReopenStudentId(null)}
      />
    </div>
  );
}
