'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { formatEGP } from '@/lib/format';
import {
  CalendarCheck,
  AlertCircle,
  CreditCard,
  Banknote,
  UserPlus,
  Users,
  Receipt,
  FileBarChart,
  ArrowUpLeft,
} from 'lucide-react';

interface DashboardStats {
  businessName?: string;
  activeStudentsCount?: number;
  todayAttendanceCount?: number;
  attendanceTodayCount?: number;
  unconfirmedBillingCount?: number;
  totalOutstandingBalance?: string | number;
  totalOutstanding?: string | number;
  todayCollectionsAmount?: string | number;
  todayCollections?: string | number;
}

export default function DashboardPage() {
  const { user, isAdmin, isAssistant } = useAuth();
  const { isLoading: isAuthLoading } = useProtected();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<DashboardStats>('/dashboard');
        setStats(data);
      } catch (err: any) {
        setError(err?.message || 'تعذر تحميل بيانات لوحة التحكم');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (isAuthLoading || !user) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayName = isAdmin ? (stats?.businessName || user.name) : user.name;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome header */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs mb-3">
            {isAdmin ? 'حساب مدير النظام' : 'حساب مساعد'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            مرحباً بك، {displayName}
          </h1>
          <p className="mt-2 text-blue-100 text-sm max-w-xl">
            {stats?.businessName ? `${stats.businessName} • ` : ''}نظام إدارة المجموعات والطلاب، متابعة الحضور اليومي، وتسجيل الاشتراكات والمدفوعات
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/attendance"
            className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm"
          >
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            <span>تسجيل حضور</span>
          </Link>
          <Link
            href="/payments"
            className="flex items-center gap-2 bg-blue-800/80 hover:bg-blue-800 text-white font-bold px-5 py-3 rounded-2xl border border-white/20 transition-all text-sm"
          >
            <CreditCard className="w-5 h-5" />
            <span>تسجيل دفعة</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs animate-pulse h-32"
            ></div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Active Students */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium text-sm">الطلاب النشطون</span>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900">
                  {stats?.activeStudentsCount ?? 0}
                </span>
                <span className="text-xs text-gray-500 mr-1.5">طالب</span>
              </div>
              <Link
                href="/students"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5"
              >
                <span>دليل الطلاب</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Today's Attendance */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium text-sm">
                {isAdmin ? 'إجمالي حضور اليوم' : 'حضور سجلته اليوم'}
              </span>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900">
                  {stats?.todayAttendanceCount ?? stats?.attendanceTodayCount ?? 0}
                </span>
                <span className="text-xs text-gray-500 mr-1.5">طالب</span>
              </div>
              <Link
                href="/attendance"
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
              >
                <span>تسجيل</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Today's Collections */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium text-sm">
                {isAdmin ? 'تحصيلات اليوم' : 'تحصيلات سجلتها اليوم'}
              </span>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Banknote className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-gray-900 font-mono">
                  {formatEGP(stats?.todayCollectionsAmount ?? stats?.todayCollections ?? 0)}
                </span>
              </div>
              <Link
                href="/reports/collections"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
              >
                <span>تقرير</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Admin only: Unconfirmed Billing Count */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium text-sm">
                  اشتراكات غير مؤكدة
                </span>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-gray-900">
                    {stats?.unconfirmedBillingCount ?? 0}
                  </span>
                  <span className="text-xs text-gray-500 mr-1.5">طالب</span>
                </div>
                <Link
                  href="/billing"
                  className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5"
                >
                  <span>تأكيد الآن</span>
                  <ArrowUpLeft className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Admin only: Total Outstanding */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium text-sm">
                  المبالغ المستحقة
                </span>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-gray-900 font-mono">
                    {formatEGP(stats?.totalOutstandingBalance ?? stats?.totalOutstanding ?? 0)}
                  </span>
                </div>
                <Link
                  href="/reports/debtors"
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5"
                >
                  <span>المدينين</span>
                  <ArrowUpLeft className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">الإجراءات السريعة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            href="/students/new"
            className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
          >
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                تسجيل طالب جديد
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                إضافة بيانات طالب ومستواه التعليمي
              </p>
            </div>
          </Link>

          <Link
            href="/students"
            className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
          >
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                قائمة الطلاب
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                البحث والتصفية وعرض ملفات الطلاب
              </p>
            </div>
          </Link>

          <Link
            href="/attendance"
            className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
          >
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">
                تسجيل الحضور
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                تسجيل حضور الطلاب بالدرس والمجموعة
              </p>
            </div>
          </Link>

          <Link
            href="/payments"
            className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
          >
            <div className="p-3 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-teal-600 transition-colors">
                تسجيل المدفوعات
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                سداد الرسوم والاشتراكات المستحقة
              </p>
            </div>
          </Link>

          {isAdmin && (
            <>
              <Link
                href="/billing"
                className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
              >
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-amber-600 transition-colors">
                    تأكيد الاشتراكات
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    تحديد طريقة المحاسبة وتوليد الرسوم
                  </p>
                </div>
              </Link>

              <Link
                href="/reports/financial"
                className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
              >
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <FileBarChart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-purple-600 transition-colors">
                    التقارير المالية
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    كشوف الحسابات والمدينين والملخص المالي
                  </p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
