'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Student, Charge, PaymentGroup } from '@/lib/types';
import { formatEGP } from '@/lib/format';
import { Alert } from '@/components/Alert';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  CreditCard,
  Search,
  CheckCircle,
  Calendar,
  DollarSign,
  User,
  History,
  Receipt,
  Trash2,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react';

function PaymentsContent() {
  const { user, isAdmin } = useAuth();
  useProtected();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get('studentId');

  // Mode: Settlement of unpaid charges vs Standalone monthly subscription payment
  const [activeTab, setActiveTab] = useState<'settlement' | 'subscription'>('settlement');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [unpaidCharges, setUnpaidCharges] = useState<Charge[]>([]);
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());

  // Payment form states
  const [receivedOn, setReceivedOn] = useState('');
  const [subMonth, setSubMonth] = useState('');
  const [subFee, setSubFee] = useState<{ subscriptionFee?: number; perLessonFee?: number } | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setReceivedOn(today);
    setSubMonth(today.slice(0, 7));
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Void payment group state
  const [voidPaymentGroupId, setVoidPaymentGroupId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

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

  // Load student charges & payment history
  const loadStudentData = useCallback(async (studentId: string) => {
    try {
      setIsLoadingDetails(true);
      setError(null);
      const studentData = await api.get<Student>(`/students/${studentId}`);
      setSelectedStudent(studentData);

      // Filter unpaid charges
      const unpaid = (studentData.charges || []).filter((c) => c.status === 'UNPAID');
      setUnpaidCharges(unpaid);

      // Pre-select all unpaid charges
      setSelectedChargeIds(new Set(unpaid.map((c) => c.id)));
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات الطالب والرسوم');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Fetch effective fee for subscription tab
  useEffect(() => {
    if (!selectedStudent || activeTab !== 'subscription' || !subMonth) return;
    const levelId = selectedStudent.currentLevel?.id;
    if (!levelId) return;

    api.get<any>(`/fees/effective?levelId=${levelId}&month=${subMonth}`)
      .then((fee) => setSubFee(fee))
      .catch(() => setSubFee(null));
  }, [selectedStudent, activeTab, subMonth]);

  // Check URL param on mount
  useEffect(() => {
    if (initialStudentId) {
      loadStudentData(initialStudentId);
    }
  }, [initialStudentId, loadStudentData]);

  // Select student from search
  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
    setSearchQuery('');
    setSearchResults([]);
    loadStudentData(s.id);
  };

  // Toggle charge selection
  const handleToggleCharge = (id: string) => {
    const next = new Set(selectedChargeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChargeIds(next);
  };

  // Calculate selected total
  const selectedTotal = unpaidCharges
    .filter((c) => selectedChargeIds.has(c.id))
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  // Record settlement payment (FR-PAY-01, BR-03, BR-24)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (selectedChargeIds.size === 0) {
      setError('يرجى تحديد بند رسوم واحد على الأقل للسداد');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      await api.post('/payments', {
        studentId: selectedStudent.id,
        chargeIds: Array.from(selectedChargeIds),
        receivedOn,
      });

      setSuccess(`تم تسجيل دفعة بقيمة ${formatEGP(selectedTotal)} بنجاح`);
      loadStudentData(selectedStudent.id);
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدفعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record Standalone Subscription Payment (SRS v2.0 - POST /api/payments/subscription)
  const handleRecordSubscriptionPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!subMonth) {
      setError('يرجى تحديد الشهر المراد سداد اشتراكه');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const res = await api.post<any>('/payments/subscription', {
        studentId: selectedStudent.id,
        month: subMonth,
        receivedOn,
      });

      const amount = res.charge?.amount || subFee?.subscriptionFee || '';
      setSuccess(`تم سداد وتفعيل الاشتراك الشهري لشهر (${subMonth}) بنجاح بقيمة ${formatEGP(amount)}`);
      loadStudentData(selectedStudent.id);
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل سداد الاشتراك الشهري');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void payment group (BR-07, FR-PAY-06)
  const handleVoidPaymentGroup = async () => {
    if (!voidPaymentGroupId) return;
    try {
      setIsVoiding(true);
      setError(null);
      await api.post(`/payments/groups/${voidPaymentGroupId}/void`);
      setSuccess('تم إلغاء الدفعة وإعادة الرسوم للحالة غير المدفوعة بنجاح');
      setVoidPaymentGroupId(null);
      if (selectedStudent) loadStudentData(selectedStudent.id);
    } catch (err: any) {
      setError(err?.message || 'تعذر إلغاء الدفعة');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">تسجيل المدفوعات والتحصيل</h1>
        <p className="text-sm text-gray-500 mt-1">
          سداد الرسوم المتأخرة، أو تسجيل سداد اشتراك شهري جديد مباشرة خارج شاشة الحضور (SRS v2.0)
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Student Search Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <label className="block text-sm font-bold text-gray-800">
          البحث عن الطالب (بالاسم أو رقم الطالب أو الهاتف)
        </label>
        <div className="relative">
          <Search className="w-5 h-5 absolute right-4 top-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث لاختيار الطالب..."
            className="w-full pr-12 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all font-medium"
          />
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="text-xs text-gray-500 py-2">جاري البحث...</div>
        )}

        {searchResults.length > 0 && (
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((stu) => (
              <button
                key={stu.id}
                type="button"
                onClick={() => handleSelectStudent(stu)}
                className="w-full text-right p-3 hover:bg-blue-50/50 flex items-center justify-between text-sm transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg text-xs">
                    #{stu.studentNumber}
                  </span>
                  <span className="font-bold text-gray-900">{stu.fullName}</span>
                  {stu.combination && (
                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {stu.combination}
                    </span>
                  )}
                </div>
                <span className="text-xs text-blue-600 font-bold">اختيار الطالب ←</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Student Details & Payment Workflow */}
      {selectedStudent && (
        <div className="space-y-6">
          {/* Student Header Info */}
          <div className="bg-gradient-to-l from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm bg-white/20 px-2.5 py-0.5 rounded-lg">
                  #{selectedStudent.studentNumber}
                </span>
                <h2 className="text-xl font-bold">{selectedStudent.fullName}</h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                المستوى: {selectedStudent.currentLevel?.name || '-'} | هاتف ولي الأمر: {selectedStudent.guardianPhone || 'غير مسجل'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">إجمالي الرسوم المستحقة</span>
              <div className="text-2xl font-extrabold text-amber-400">
                {formatEGP(selectedStudent.outstandingBalance ?? 0)}
              </div>
            </div>
          </div>

          {/* Workflow Tabs: Settlement vs Standalone Subscription */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('settlement')}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'settlement'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>سداد رسوم مستحقة ({unpaidCharges.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('subscription')}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'subscription'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>سداد اشتراك شهري جديد</span>
            </button>
          </div>

          {activeTab === 'settlement' ? (
            /* Settlement Form */
            <form onSubmit={handleRecordPayment} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <span>الرسوم المستحقة غير المسددة ({unpaidCharges.length})</span>
                </h3>

                {/* Received On Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <label className="text-xs font-bold text-gray-700">تاريخ الاستلام:</label>
                  <input
                    type="date"
                    required
                    value={receivedOn}
                    onChange={(e) => setReceivedOn(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {unpaidCharges.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  لا توجد أي رسوم مستحقة غير مسددة على هذا الطالب حالياً
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={
                                unpaidCharges.length > 0 &&
                                selectedChargeIds.size === unpaidCharges.length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChargeIds(new Set(unpaidCharges.map((c) => c.id)));
                                } else {
                                  setSelectedChargeIds(new Set());
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-4">الشهر</th>
                          <th className="py-3 px-4">نوع الرسم</th>
                          <th className="py-3 px-4">المبلغ</th>
                          <th className="py-3 px-4">تاريخ الاستحقاق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {unpaidCharges.map((charge) => {
                          const isChecked = selectedChargeIds.has(charge.id);
                          return (
                            <tr
                              key={charge.id}
                              onClick={() => handleToggleCharge(charge.id)}
                              className={`cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                              }`}
                            >
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-gray-700">
                                {charge.month}
                              </td>
                              <td className="py-3 px-4 font-medium">
                                <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-xs font-semibold">
                                  {charge.type === 'SUBSCRIPTION' ? 'اشتراك شهري' : 'حصة منفردة'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-emerald-600 font-mono">
                                {formatEGP(charge.amount)}
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-500">
                                {charge.createdAt?.split('T')[0] || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Submit */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">البنود المحددة:</span>
                      <span className="font-bold text-gray-900">{selectedChargeIds.size} بند</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">إجمالي المبلغ المطلوب:</span>
                      <span className="font-extrabold text-lg text-emerald-600 font-mono">
                        {formatEGP(selectedTotal)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || selectedChargeIds.size === 0}
                      className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>تأكيد استلام الدفعة ({formatEGP(selectedTotal)})</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* Standalone Monthly Subscription Form (SRS v2.0) */
            <form onSubmit={handleRecordSubscriptionPayment} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span>سداد اشتراك شهري جديد (خارج تسجيل الحضور)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  يقوم هذا الإجراء بقفل نظام محاسبة الطالب للشهر المختار على نظام (اشتراك شهري)، وإنشاء رسم الاشتراك وتسجيل سداده فورياً.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الشهر المراد سداده (YYYY-MM):</label>
                  <input
                    type="month"
                    required
                    value={subMonth}
                    onChange={(e) => setSubMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ استلام الدفعة:</label>
                  <input
                    type="date"
                    required
                    value={receivedOn}
                    onChange={(e) => setReceivedOn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                </div>
              </div>

              {subFee && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs text-emerald-800 font-bold">قيمة الاشتراك الشهري لهذا المستوى:</div>
                    <div className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
                      {formatEGP(subFee.subscriptionFee)}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري السداد...' : 'سداد وتفعيل الاشتراك'}</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Payment History Card (BR-07, FR-PAY-06) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-600" />
                <span>سجل دفعات الطالب السابقة</span>
              </h3>
              <span className="text-xs text-gray-500">
                {selectedStudent.paymentGroups?.length || 0} دفعة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">تاريخ الاستلام</th>
                    <th className="py-3 px-4">إجمالي الدفعة</th>
                    <th className="py-3 px-4">المسؤول عن التسجيل</th>
                    <th className="py-3 px-4">الحالة</th>
                    {isAdmin && <th className="py-3 px-4 text-center">إجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!selectedStudent.paymentGroups ||
                  selectedStudent.paymentGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400 text-xs">
                        لا توجد دفعات سابقة مسجلة
                      </td>
                    </tr>
                  ) : (
                    selectedStudent.paymentGroups.map((group) => (
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
                                className="text-xs text-red-600 hover:text-red-800 font-bold px-2.5 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* Void Payment Group Modal (FR-PAY-06) */}
      <ConfirmModal
        isOpen={!!voidPaymentGroupId}
        title="إلغاء دفعة مسددة"
        message="هل أنت متأكد من إلغاء هذه الدفعة ككل؟ سيتم إلغاء سجلات السداد المرتبطة بها وإعادة الرسوم إلى حالة غير مدفوعة."
        confirmText="تأكيد الإلغاء"
        isDanger={true}
        isLoading={isVoiding}
        onConfirm={handleVoidPaymentGroup}
        onCancel={() => setVoidPaymentGroupId(null)}
      />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
