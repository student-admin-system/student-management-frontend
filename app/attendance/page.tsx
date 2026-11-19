'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Level, Student, Attendance } from '@/lib/types';
import { formatEGP } from '@/lib/format';
import { Alert } from '@/components/Alert';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  UserCheck,
  Calendar,
  Layers,
  CreditCard,
  UserX,
  Sparkles,
  Hash,
  Clock,
} from 'lucide-react';

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  useProtected();

  const [date, setDate] = useState('');
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const [levelId, setLevelId] = useState('');
  const [levels, setLevels] = useState<Level[]>([]);
  const [effectiveFee, setEffectiveFee] = useState<{
    subscriptionFee?: string | number;
    perLessonFee?: string | number;
  } | null>(null);
  const [isLoadingStructure, setIsLoadingStructure] = useState(true);

  // Dynamic lesson number
  const [lessonNumber, setLessonNumber] = useState<number | null>(null);

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [submittingStudentId, setSubmittingStudentId] = useState<string | null>(null);

  // Lesson attendance & absent list
  const [recordedList, setRecordedList] = useState<Attendance[]>([]);
  const [absentList, setAbsentList] = useState<Array<{ id: string; studentNumber: number; fullName: string }>>([]);
  const [activeTab, setActiveTab] = useState<'recorded' | 'absent'>('recorded');
  const [isLoadingRecorded, setIsLoadingRecorded] = useState(false);

  // Operation feedback
  const [latestResult, setLatestResult] = useState<{
    success: boolean;
    studentName: string;
    billingInfo: string;
    paid: boolean;
    lessonNumber?: number;
    note?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Void modal
  const [voidAttendanceId, setVoidAttendanceId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  // Load levels
  useEffect(() => {
    async function init() {
      try {
        setIsLoadingStructure(true);
        const lvls = await api.get<Level[]>('/subjects/levels');
        setLevels(lvls || []);
        if (lvls && lvls.length > 0) {
          setLevelId(lvls[0].id);
        }
      } catch {
        try {
          const subjects = await api.get<any[]>('/subjects');
          const flat: Level[] = [];
          for (const s of subjects) {
            if (s.levels) {
              for (const l of s.levels) flat.push({ ...l, subject: s });
            }
          }
          setLevels(flat);
          if (flat.length > 0) setLevelId(flat[0].id);
        } catch {
          setError('تعذر تحميل بيانات المواد والمستويات');
        }
      } finally {
        setIsLoadingStructure(false);
      }
    }
    init();
  }, []);

  // Load effective fees for selected level and month
  useEffect(() => {
    if (!levelId || !date) return;
    async function loadFee() {
      try {
        const month = date.slice(0, 7);
        const fee = await api.get<any>(`/fees/effective?levelId=${levelId}&month=${month}`);
        setEffectiveFee(fee);
      } catch {
        setEffectiveFee(null);
      }
    }
    loadFee();
  }, [levelId, date]);

  // Load lesson attendances & absent list (with dynamic lesson numbering)
  const fetchLessonAttendance = useCallback(async () => {
    if (!levelId || !date) return;
    try {
      setIsLoadingRecorded(true);
      const res = await api.get<any>(`/attendance/lesson?levelId=${levelId}&date=${date}`);
      if (res && res.attendances) {
        setRecordedList(res.attendances || []);
        setAbsentList(res.informationalAbsentList || []);
        setLessonNumber(res.lessonNumber ?? null);
      } else if (Array.isArray(res)) {
        setRecordedList(res);
        setAbsentList([]);
      } else {
        setRecordedList([]);
        setAbsentList([]);
      }
    } catch {
      setRecordedList([]);
      setAbsentList([]);
    } finally {
      setIsLoadingRecorded(false);
    }
  }, [levelId, date]);

  useEffect(() => {
    fetchLessonAttendance();
  }, [fetchLessonAttendance]);

  // Search students for attendance (FR-STU-04)
  useEffect(() => {
    if (!searchQuery.trim() || !levelId) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const month = date.slice(0, 7);
        const res = await api.get<any>(
          `/students?q=${encodeURIComponent(
            searchQuery.trim()
          )}&forAttendance=true&levelId=${levelId}&month=${month}&pageSize=10`
        );
        const list = res.data || (Array.isArray(res) ? res : []);
        setSearchResults(list);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, levelId, date]);

  // Record attendance with specified billing action (SRS v2.0)
  const handleRecord = async (
    studentId: string,
    studentName: string,
    billingAction?: 'PAY_PER_LESSON' | 'ATTEND_UNPAID' | 'PAY_SUBSCRIPTION'
  ) => {
    if (!levelId || !date) {
      setError('يرجى تحديد المستوى والتاريخ أولاً');
      return;
    }

    try {
      setSubmittingStudentId(studentId);
      setError(null);
      setLatestResult(null);

      const res = await api.post<any>('/attendance', {
        studentId,
        levelId,
        lessonDate: date,
        billingAction: billingAction || 'PAY_PER_LESSON',
      });

      // Clear search query
      setSearchQuery('');
      setSearchResults([]);

      // Extract clear feedback message based on billing result
      let billingInfo = 'تم تسجيل الحضور بنجاح';
      let isPaid = false;

      if (res.billingResult === 'CHARGE_CREATED_AND_PAID') {
        const amt = res.charge?.amount || effectiveFee?.perLessonFee || '';
        billingInfo = `تم تسجيل الحضور وسداد رسوم الحصة فورياً (${formatEGP(amt)})`;
        isPaid = true;
      } else if (res.billingResult === 'SUBSCRIPTION_PAID') {
        const amt = res.charge?.amount || effectiveFee?.subscriptionFee || '';
        billingInfo = `تم تثبيت نظام الاشتراك الشهري وسداد الاشتراك بالكامل (${formatEGP(amt)})`;
        isPaid = true;
      } else if (res.billingResult === 'CHARGE_CREATED') {
        const amt = res.charge?.amount || effectiveFee?.perLessonFee || '';
        billingInfo = `تم تسجيل الحضور بنظام الحصة - رسم الحصة مستحق لاحقاً (${formatEGP(amt)})`;
        isPaid = false;
      } else if (res.billingResult === 'SUBSCRIPTION_COVERED') {
        billingInfo = 'مغطى بالاشتراك الشهري للطالب (حضور مباشر بدون رسوم إضافية)';
        isPaid = true;
      }

      setLatestResult({
        success: true,
        studentName: res.studentName || studentName,
        billingInfo,
        paid: isPaid,
        lessonNumber: res.lessonNumber,
        note: res.note,
      });

      fetchLessonAttendance();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الحضور');
    } finally {
      setSubmittingStudentId(null);
    }
  };

  // Void attendance (PERM-08 with Cairo timezone check)
  const handleVoidAttendance = async () => {
    if (!voidAttendanceId) return;
    try {
      setIsVoiding(true);
      setError(null);
      await api.post(`/attendance/${voidAttendanceId}/void`);
      setVoidAttendanceId(null);
      fetchLessonAttendance();
    } catch (err: any) {
      setError(err?.message || 'تعذر إلغاء الحضور');
    } finally {
      setIsVoiding(false);
    }
  };

  const selectedLevel = levels.find((l) => l.id === levelId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              تسجيل الحضور اليومي
            </h1>
            {lessonNumber && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                <Hash className="w-3.5 h-3.5" />
                <span>حصة رقم {lessonNumber} لهذا الشهر</span>
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            حدد التاريخ والمستوى الدراسي، ثم ابحث بالاسم أو الرقم لتسجيل حضور وسداد الطلاب فوراً (SRS v2.0)
          </p>
        </div>

        {effectiveFee && (
          <div className="inline-flex items-center gap-3 bg-blue-50 border border-blue-200/80 px-4 py-2 rounded-2xl text-xs font-semibold text-blue-900 self-start sm:self-auto">
            <span>
              سعر الحصة: <strong className="text-sm text-blue-700 font-extrabold">{formatEGP(effectiveFee.perLessonFee)}</strong>
            </span>
            <span className="text-blue-300">|</span>
            <span>
              الاشتراك الشهري: <strong className="text-sm text-blue-700 font-extrabold">{formatEGP(effectiveFee.subscriptionFee)}</strong>
            </span>
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Lesson Selector Bar (SRS v2.0: Level + Date only, No Groups) */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>تاريخ الحصة</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
          />
        </div>

        {/* Level */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>المستوى / المادة</span>
          </label>
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
          >
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.subject?.name ? `${lvl.subject.name} - ` : ''}
                {lvl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Summary Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-3 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-blue-600">الحصة الحالية</div>
            <div className="text-sm font-black text-gray-900 mt-0.5">
              {selectedLevel ? `${selectedLevel.subject?.name || ''} - ${selectedLevel.name}` : '-'}
            </div>
          </div>
          <div className="text-left">
            <span className="px-3 py-1 rounded-xl bg-white text-blue-700 font-black text-xs shadow-2xs border border-blue-200">
              {lessonNumber ? `حصة #${lessonNumber}` : 'درس جديد'}
            </span>
          </div>
        </div>
      </div>

      {/* Immediate Billing Result Banner */}
      {latestResult && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between animate-in fade-in zoom-in-95 duration-150 border ${
            latestResult.paid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2
              className={`w-6 h-6 shrink-0 ${
                latestResult.paid ? 'text-emerald-600' : 'text-blue-600'
              }`}
            />
            <div>
              <div className="font-bold text-base flex items-center gap-2">
                <span>{latestResult.studentName}</span>
                {latestResult.paid && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>تم السداد فورياً</span>
                  </span>
                )}
                {latestResult.lessonNumber && (
                  <span className="text-xs text-gray-500 font-bold">
                    (حصة رقم {latestResult.lessonNumber})
                  </span>
                )}
              </div>
              <div className="text-xs mt-0.5 font-medium opacity-90">
                {latestResult.billingInfo}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLatestResult(null)}
            className="text-xs font-bold px-3 py-1 bg-white/80 hover:bg-white rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Search and Streamlined Attendance Section */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>البحث وتسجيل حضور الطالب</span>
          </h2>
          <div className="text-xs text-gray-500">
            اكتب رقم الطالب أو اسمه باللغة العربية للبحث الفوري
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطالب أو اسمه لتسجيل الحضور..."
            className="w-full pr-12 pl-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all shadow-inner"
          />
        </div>

        {/* Search Results Dropdown/List with Streamlined v2.0 Billing Badges & Actions */}
        {isSearching && (
          <div className="py-4 text-center text-xs text-gray-500 animate-pulse">
            جاري البحث عن الطلاب المطابقين...
          </div>
        )}

        {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            لم يتم العثور على طالب نشط في هذا المستوى بهذا الاسم أو الرقم
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden bg-white shadow-xl">
            {searchResults.map((stu) => {
              const alreadyRecorded = recordedList.some(
                (r) => r.studentId === stu.id && !r.isVoided
              );

              const billingState = stu.monthlyBillingState;
              const isConfirmed = billingState?.isConfirmed;
              const isSub = isConfirmed && billingState.billingMethod === 'SUBSCRIPTION';
              const isPerLesson = isConfirmed && billingState.billingMethod === 'PER_LESSON';
              const isUnconfirmed = !isConfirmed;

              const isSubmitting = submittingStudentId === stu.id;

              return (
                <div
                  key={stu.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-blue-50/30 transition-colors"
                >
                  {/* Student Details */}
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-xl text-xs font-mono shrink-0">
                      #{stu.studentNumber}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900 text-base">{stu.fullName}</span>
                        {/* Student academic level / combination */}
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                          {stu.combination || stu.levelName || 'المستوى الحالي'}
                        </span>
                        {/* Billing status badge */}
                        {isSub && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                            اشتراك شهري (مدفوع)
                          </span>
                        )}
                        {isPerLesson && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                            نظام بالحصة
                          </span>
                        )}
                        {isUnconfirmed && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                            أول حضور للشهر
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-medium mt-1 flex flex-wrap items-center gap-3">
                        <span>هاتف: {stu.studentPhone || stu.guardianPhone || 'غير مسجل'}</span>
                        {stu.outstandingBalance !== undefined && stu.outstandingBalance > 0 && (
                          <span className="text-rose-600 font-bold">
                            متأخرات: {formatEGP(stu.outstandingBalance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions according to SRS v2.0 Workflow */}
                  <div className="shrink-0">
                    {alreadyRecorded ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>مسجل بالفعل بالدرس</span>
                      </span>
                    ) : isSub ? (
                      /* Confirmed Subscription: 1-Tap Attendance with NO payment options */
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleRecord(stu.id, stu.fullName, 'PAY_PER_LESSON')}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{isSubmitting ? 'جاري التسجيل...' : 'تسجيل الحضور (اشتراك)'}</span>
                      </button>
                    ) : isPerLesson ? (
                      /* Confirmed Per-Lesson: Pay Now (Default) or Attend Unpaid */
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRecord(stu.id, stu.fullName, 'PAY_PER_LESSON')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>دفع الحصة الآن ({formatEGP(effectiveFee?.perLessonFee)})</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRecord(stu.id, stu.fullName, 'ATTEND_UNPAID')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>حضور بدون دفع / آجل</span>
                        </button>
                      </div>
                    ) : (
                      /* Unconfirmed (First attendance in month): 3 Options */
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Option 1: Pay Per-Lesson Now (Default) */}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRecord(stu.id, stu.fullName, 'PAY_PER_LESSON')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          title="تثبيت نظام الحصة وسداد الحصة فورياً"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>دفع الحصة الآن ({formatEGP(effectiveFee?.perLessonFee)})</span>
                        </button>

                        {/* Option 2: Attend Unpaid */}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRecord(stu.id, stu.fullName, 'ATTEND_UNPAID')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer disabled:opacity-50"
                          title="تثبيت نظام الحصة مع تسجيل رسم آجل"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>حضور بدون دفع / آجل</span>
                        </button>

                        {/* Option 3: Pay Subscription Now */}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRecord(stu.id, stu.fullName, 'PAY_SUBSCRIPTION')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          title="تثبيت نظام الاشتراك الشهري وسداد الاشتراك بالكامل الآن"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>دفع اشتراك الشهر ({formatEGP(effectiveFee?.subscriptionFee)})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs: Recorded Students vs Absent List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('recorded')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'recorded'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>الطلاب المسجلين بالدرس ({recordedList.filter((r) => !r.isVoided).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('absent')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'absent'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>طلاب لم يحضروا بعد ({absentList.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchLessonAttendance}
            className="text-xs text-blue-600 hover:underline font-bold self-end sm:self-auto cursor-pointer"
          >
            تحديث القائمة
          </button>
        </div>

        {activeTab === 'recorded' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/70 text-gray-600 text-xs font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">رقم الطالب</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">المسؤول عن التسجيل</th>
                  <th className="py-3 px-4">حالة الحضور</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingRecorded ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      جاري تحميل الحضور...
                    </td>
                  </tr>
                ) : recordedList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      لم يتم تسجيل أي طالب بعد في هذا الدرس والتاريخ
                    </td>
                  </tr>
                ) : (
                  recordedList.map((att) => (
                    <tr
                      key={att.id}
                      className={att.isVoided ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50/40'}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-600">
                        #{att.student?.studentNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {att.student?.fullName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {att.recordedBy?.name || att.user?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {att.isVoided ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 line-through">
                            ملغي
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            حاضر
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!att.isVoided && (
                          <button
                            type="button"
                            onClick={() => setVoidAttendanceId(att.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                            title="إلغاء الحضور (نفس اليوم للقائم بالتسجيل، أو في أي وقت للمدير)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>إلغاء</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Absent List Tab */
          <div className="p-4 sm:p-6 space-y-3">
            <p className="text-xs text-gray-500">
              قائمة الطلاب النشطين المسجلين في هذا المستوى ولم يتم تسجيل حضورهم في هذا الدرس بعد:
            </p>
            {absentList.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                جميع الطلاب المقيدين في هذا المستوى حضروا الدرس!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {absentList.map((stu) => (
                  <div
                    key={stu.id}
                    className="p-3 bg-gray-50 border border-gray-200/70 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-mono text-xs font-bold text-gray-500">
                        #{stu.studentNumber}
                      </span>
                      <span className="text-xs font-bold text-gray-800 truncate">
                        {stu.fullName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRecord(stu.id, stu.fullName)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      تسجيل
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Void Attendance Modal */}
      <ConfirmModal
        isOpen={!!voidAttendanceId}
        title="تأكيد إلغاء الحضور"
        message="هل أنت متأكد من إلغاء هذا الحضور؟ ملاحظة: يمكن للمساعد إلغاء الحضور الذي سجله بنفسه في نفس اليوم بتوقيت القاهرة فقط. إذا كانت الحصة مدفوعة، يجب إلغاء دفعة السداد أولاً."
        confirmText="نعم، قم بالإلغاء"
        cancelText="تراجع"
        isDanger={true}
        isLoading={isVoiding}
        onConfirm={handleVoidAttendance}
        onCancel={() => setVoidAttendanceId(null)}
      />
    </div>
  );
}
