'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  Receipt,
  BookOpen,
  FolderTree,
  DollarSign,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Wallet,
  Layers,
  FileText,
} from 'lucide-react';

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const adminMenuRef = useRef<HTMLDivElement>(null);
  const reportsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (adminMenuRef.current && !adminMenuRef.current.contains(target)) {
        setAdminMenuOpen(false);
      }
      if (reportsMenuRef.current && !reportsMenuRef.current.contains(target)) {
        setReportsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAdminMenuOpen(false);
        setReportsOpen(false);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setAdminMenuOpen(false);
    setReportsOpen(false);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // If on login page, don't show navigation
  if (pathname === '/login') return null;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const isReportsActive = pathname.startsWith('/reports');
  const isAdminMenuActive =
    pathname.startsWith('/subjects') ||
    pathname.startsWith('/fees');

  const navLinkClass = (path: string) => `
    flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150
    ${
      isActive(path)
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50/70'
    }
  `;

  const dropdownTriggerClass = (active: boolean) => `
    flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150
    ${
      active
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50/70'
    }
  `;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Desktop Navigation */}
          <div className="flex items-center gap-5 lg:gap-7">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-black text-lg sm:text-xl text-gray-900 group transition-all"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight font-extrabold text-gray-900">نظام إدارة الطلاب</span>
                <span className="text-[10px] font-semibold text-blue-600 tracking-wider">
                  الإصدار الذكي 2.0
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link href="/" className={navLinkClass('/')}>
                <LayoutDashboard className="w-4 h-4" />
                <span>الرئيسية</span>
              </Link>

              <Link href="/students" className={navLinkClass('/students')}>
                <Users className="w-4 h-4" />
                <span>الطلاب</span>
              </Link>

              <Link href="/attendance" className={navLinkClass('/attendance')}>
                <CalendarCheck className="w-4 h-4" />
                <span>تسجيل الحضور</span>
              </Link>

              <Link href="/payments" className={navLinkClass('/payments')}>
                <CreditCard className="w-4 h-4" />
                <span>المدفوعات</span>
              </Link>

              {/* Management Dropdown for Admin */}
              {isAdmin && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(!adminMenuOpen);
                      setReportsOpen(false);
                      setUserMenuOpen(false);
                    }}
                    className={dropdownTriggerClass(isAdminMenuActive)}
                    aria-expanded={adminMenuOpen}
                  >
                    <Layers className="w-4 h-4" />
                    <span>الإدارة والتهيئة</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        adminMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {adminMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-gray-100 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 tracking-wider">
                        التهيئة الأكاديمية والمالية
                      </div>

                      <Link
                        href="/subjects"
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50/80 transition-colors group"
                      >
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800 group-hover:text-blue-700">
                            المواد والمستويات
                          </div>
                          <div className="text-xs text-gray-500">المناهج والصفوف الدراسية</div>
                        </div>
                      </Link>

                      <Link
                        href="/fees"
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50/80 transition-colors group"
                      >
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800 group-hover:text-blue-700">
                            لائحة المصروفات
                          </div>
                          <div className="text-xs text-gray-500">تسعير الحصص والاشتراكات الشهرية</div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Reports Dropdown */}
              <div className="relative" ref={reportsMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setReportsOpen(!reportsOpen);
                    setAdminMenuOpen(false);
                    setUserMenuOpen(false);
                  }}
                  className={dropdownTriggerClass(isReportsActive)}
                  aria-expanded={reportsOpen}
                >
                  <FileBarChart className="w-4 h-4" />
                  <span>التقارير</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      reportsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {reportsOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-gray-100 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 tracking-wider">
                      التقارير التشغيلية
                    </div>

                    <Link
                      href="/reports/statement"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>كشف حساب طالب</span>
                    </Link>

                    <Link
                      href="/reports/attendance"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                    >
                      <CalendarCheck className="w-4 h-4 text-emerald-500" />
                      <span>تقرير الحضور اليومي</span>
                    </Link>

                    <Link
                      href="/reports/collections"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                    >
                      <Wallet className="w-4 h-4 text-amber-500" />
                      <span>تحصيلات اليوم</span>
                    </Link>

                    {isAdmin && (
                      <>
                        <div className="border-t border-gray-100 my-1.5"></div>
                        <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 tracking-wider">
                          التقارير المالية والرقابية
                        </div>

                        <Link
                          href="/reports/debtors"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-700 font-medium transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>قائمة المدينين والمتأخرات</span>
                        </Link>

                        <Link
                          href="/reports/financial"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>الملخص المالي الشهري</span>
                        </Link>

                        <Link
                          href="/reports/unconfirmed"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>الاشتراكات غير المؤكدة</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Direct Settings Link */}
              {isAdmin && (
                <Link href="/settings" className={navLinkClass('/settings')} title="إعدادات النظام">
                  <Settings className="w-4 h-4" />
                  <span>الإعدادات</span>
                </Link>
              )}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setAdminMenuOpen(false);
                    setReportsOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl hover:bg-gray-100/80 transition-all border border-transparent hover:border-gray-200"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {user.name.trim().charAt(0) || 'أ'}
                  </div>

                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-sm font-bold text-gray-800 leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                      {user.role === 'ADMIN' ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">مدير النظام</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3 text-blue-600" />
                          <span className="text-blue-700 font-bold">مساعد</span>
                        </>
                      )}
                    </span>
                  </div>

                  <ChevronDown
                    className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="font-bold text-sm text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">@{user.username}</div>
                      <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                        {user.role === 'ADMIN' ? 'صلاحيات كاملة (مدير)' : 'صلاحيات مساعد'}
                      </div>
                    </div>

                    {isAdmin && (
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                      >
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span>إعدادات النظام والنسخ الاحتياطي</span>
                      </Link>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-bold transition-colors text-right"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-6 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-150 shadow-2xl">
          {user && (
            <div className="p-3 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {user.name.trim().charAt(0) || 'أ'}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-gray-900">{user.name}</div>
                  <div className="text-xs text-blue-700 font-semibold">
                    {user.role === 'ADMIN' ? 'مدير النظام' : 'مساعد'}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-gray-400 px-3 py-1">الرئيسية والعمليات</div>

            <Link href="/" className={navLinkClass('/')}>
              <LayoutDashboard className="w-4 h-4" />
              <span>لوحة التحكم الرئيسية</span>
            </Link>

            <Link href="/students" className={navLinkClass('/students')}>
              <Users className="w-4 h-4" />
              <span>سجل ودليل الطلاب</span>
            </Link>

            <Link href="/attendance" className={navLinkClass('/attendance')}>
              <CalendarCheck className="w-4 h-4" />
              <span>تسجيل الحضور اليومي</span>
            </Link>

            <Link href="/payments" className={navLinkClass('/payments')}>
              <CreditCard className="w-4 h-4" />
              <span>تسجيل المدفوعات والتحصيل</span>
            </Link>

            {isAdmin && (
              <>
                <div className="text-[11px] font-bold text-gray-400 px-3 pt-3 pb-1">
                  الإدارة الأكاديمية والمالية
                </div>

                <Link href="/subjects" className={navLinkClass('/subjects')}>
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>المواد والمستويات التعليمية</span>
                </Link>

                <Link href="/fees" className={navLinkClass('/fees')}>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>لائحة المصروفات</span>
                </Link>
              </>
            )}

            <div className="text-[11px] font-bold text-gray-400 px-3 pt-3 pb-1">التقارير والكشوف</div>

            <Link href="/reports/statement" className={navLinkClass('/reports/statement')}>
              <FileText className="w-4 h-4 text-blue-500" />
              <span>كشف حساب طالب</span>
            </Link>

            <Link href="/reports/attendance" className={navLinkClass('/reports/attendance')}>
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              <span>تقرير الحضور والغياب</span>
            </Link>

            <Link href="/reports/collections" className={navLinkClass('/reports/collections')}>
              <Wallet className="w-4 h-4 text-amber-500" />
              <span>تحصيلات اليوم</span>
            </Link>

            {isAdmin && (
              <>
                <Link href="/reports/debtors" className={navLinkClass('/reports/debtors')}>
                  <span className="w-2 h-2 rounded-full bg-rose-500 ml-1"></span>
                  <span>قائمة المدينين (المتأخرات)</span>
                </Link>

                <Link href="/reports/financial" className={navLinkClass('/reports/financial')}>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 ml-1"></span>
                  <span>الملخص المالي الشهري</span>
                </Link>

                <Link href="/reports/unconfirmed" className={navLinkClass('/reports/unconfirmed')}>
                  <span className="w-2 h-2 rounded-full bg-amber-500 ml-1"></span>
                  <span>الاشتراكات غير المؤكدة</span>
                </Link>

                <div className="pt-2"></div>
                <Link href="/settings" className={navLinkClass('/settings')}>
                  <Settings className="w-4 h-4" />
                  <span>إعدادات النظام</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
