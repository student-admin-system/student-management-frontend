'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Level } from '@/lib/types';
import { Alert } from '@/components/Alert';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ArrowRight, UserPlus, AlertTriangle } from 'lucide-react';

export default function NewStudentPage() {
  useProtected();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');

  useEffect(() => {
    setEnrollmentDate(new Date().toISOString().split('T')[0]);
  }, []);
  const [levelId, setLevelId] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [school, setSchool] = useState('');
  const [notes, setNotes] = useState('');

  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Warnings / modals for FR-STU-02 and FR-STU-05
  const [showNoPhoneWarning, setShowNoPhoneWarning] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string[] | null>(null);

  useEffect(() => {
    async function loadLevels() {
      try {
        setIsLoadingLevels(true);
        const data = await api.get<Level[]>('/subjects/levels');
        setLevels(data || []);
        if (data && data.length > 0) {
          setLevelId(data[0].id);
        }
      } catch (err: any) {
        // Fallback: list subjects and flatten their levels
        try {
          const subjects = await api.get<any[]>('/subjects');
          const allLevels: Level[] = [];
          for (const s of subjects) {
            if (s.levels) {
              for (const l of s.levels) {
                allLevels.push({ ...l, subject: s });
              }
            }
          }
          setLevels(allLevels);
          if (allLevels.length > 0) setLevelId(allLevels[0].id);
        } catch {
          setError('تعذر تحميل قائمة المستويات الدراسية');
        }
      } finally {
        setIsLoadingLevels(false);
      }
    }
    loadLevels();
  }, []);

  const executeRegistration = async (ignoreDuplicates = false) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setDuplicateWarning(null);

      const payload = {
        fullName: fullName.trim(),
        enrollmentDate,
        levelId,
        studentPhone: studentPhone.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        school: school.trim() || undefined,
        notes: notes.trim() || undefined,
        ignoreDuplicates,
      };

      const result = await api.post<any>('/students', payload);
      router.push(`/students/${result.id || result.student?.id}`);
    } catch (err: any) {
      if (err.data?.duplicates && err.data?.duplicates.length > 0) {
        setDuplicateWarning(err.data.duplicates);
      } else {
        setError(err.message || 'حدث خطأ أثناء تسجيل الطالب');
      }
    } finally {
      setIsSubmitting(false);
      setShowNoPhoneWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('يرجى إدخال اسم الطالب كاملاً');
      return;
    }
    if (!levelId) {
      setError('يرجى اختيار المستوى الدراسي');
      return;
    }
    if (!enrollmentDate) {
      setError('يرجى اختيار تاريخ الالتحاق');
      return;
    }

    // FR-STU-02: If both phone numbers are empty, warn before saving
    if (!studentPhone.trim() && !guardianPhone.trim()) {
      setShowNoPhoneWarning(true);
      return;
    }

    await executeRegistration();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="p-2 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-600 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">تسجيل طالب جديد</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              إضافة طالب جديد وتوليد رقم قيد وتأكيد محاسبة الحصص تلقائياً
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Duplicate warning (FR-STU-05) */}
      {duplicateWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900">تنبيه تشابه أسماء (طالب مكرر محتمل)</h3>
              <p className="text-sm text-amber-700 mt-1">
                يوجد طالب أو أكثر مسجلين بنفس الاسم أو اسم مشابه جداً:
              </p>
              <ul className="list-disc list-inside text-sm text-amber-800 font-semibold mt-2">
                {duplicateWarning.map((d, idx) => (
                  <li key={idx}>{d}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-3">
                هل أنت متأكد من رغبتك في متابعة تسجيل هذا الطالب كطالب مستقل جديد؟
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDuplicateWarning(null)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              إلغاء والتحقق
            </button>
            <button
              type="button"
              onClick={() => executeRegistration(true)}
              className="px-5 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700"
            >
              متابعة التسجيل على أي حال
            </button>
          </div>
        </div>
      )}

      {/* No phone warning modal (FR-STU-02) */}
      <ConfirmModal
        isOpen={showNoPhoneWarning}
        title="تنبيه: لا يوجد أرقام هواتف"
        message="لم يتم إدخال أي رقم هاتف (لا للطالب ولا لولي الأمر). هل ترغب في حفظ بيانات الطالب بدون أرقام اتصال؟ يمكن للمسؤول إضافة الأرقام لاحقاً."
        confirmText="حفظ بدون هاتف"
        cancelText="الرجوع لإدخال هاتف"
        isDanger={false}
        isLoading={isSubmitting}
        onConfirm={() => executeRegistration()}
        onCancel={() => setShowNoPhoneWarning(false)}
      />

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              اسم الطالب رباعي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد محمد علي محمود"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            />
          </div>

          {/* Level / Subject */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              المستوى الدراسي / المادة <span className="text-red-500">*</span>
            </label>
            {isLoadingLevels ? (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400">
                جاري تحميل المستويات...
              </div>
            ) : levels.length === 0 ? (
              <div className="text-xs text-red-600 p-2">
                لا توجد مستويات مسجلة! يرجى إضافة مادة ومستوى أولاً من صفحة المواد.
              </div>
            ) : (
              <select
                required
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.subject?.name ? `${lvl.subject.name} - ` : ''}
                    {lvl.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Enrollment Date */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              تاريخ الالتحاق <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={enrollmentDate}
              onChange={(e) => setEnrollmentDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              يتم تثبيت محاسبة الحصص تلقائياً لشهر الالتحاق
            </p>
          </div>

          {/* Student Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              هاتف الطالب (اختياري)
            </label>
            <input
              type="tel"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              placeholder="مثال: 01012345678"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all text-left font-mono"
            />
          </div>

          {/* Guardian Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              هاتف ولي الأمر (اختياري)
            </label>
            <input
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="مثال: 01098765432"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all text-left font-mono"
            />
          </div>

          {/* Guardian Name */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              اسم ولي الأمر (اختياري)
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="اسم الأب أو ولي الأمر"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            />
          </div>

          {/* School */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              المدرسة (اختياري)
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="اسم المدرسة المقيد بها"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات خاصة بالطالب..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all resize-none"
            ></textarea>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            href="/students"
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 text-sm transition-colors"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>حفظ وتسجيل الطالب</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
