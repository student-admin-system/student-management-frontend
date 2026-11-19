'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Student, PaginatedResult, Subject, Level, StudentStatus } from '@/lib/types';
import { formatEGP } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import {
  Search,
  UserPlus,
  Phone,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  GraduationCap,
  CreditCard,
  FileText,
  Building,
} from 'lucide-react';

export default function StudentsPage() {
  const { isAdmin } = useAuth();
  useProtected();

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentStatus>('ALL');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'DEBT' | 'CLEAR'>('ALL');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Load subjects and their levels for cascading filters
  useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await api.get<Subject[]>('/subjects');
        setSubjects(data || []);
      } catch (err: any) {
        console.error('Failed to load subjects for filter:', err);
      }
    }
    loadSubjects();
  }, []);

  // Compute available levels for the currently selected subject
  const availableLevels = useMemo(() => {
    if (!selectedSubjectId) {
      // If no subject selected, list all active levels across all subjects
      const allLevels: Level[] = [];
      subjects.forEach((subj) => {
        if (subj.levels) {
          subj.levels.forEach((lvl) => {
            allLevels.push({ ...lvl, subject: subj });
          });
        }
      });
      return allLevels;
    }
    const found = subjects.find((s) => s.id === selectedSubjectId);
    return (found?.levels || []).map((lvl) => ({ ...lvl, subject: found }));
  }, [subjects, selectedSubjectId]);

  // When subject changes, reset level if not in available levels
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setPage(1);
    if (!subjectId) {
      setSelectedLevelId('');
    } else {
      const subject = subjects.find((s) => s.id === subjectId);
      const hasCurrentLevel = subject?.levels?.some((l) => l.id === selectedLevelId);
      if (!hasCurrentLevel) {
        setSelectedLevelId('');
      }
    }
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedSubjectId) count++;
    if (selectedLevelId) count++;
    if (statusFilter !== 'ALL') count++;
    if (debtFilter !== 'ALL') count++;
    return count;
  }, [searchQuery, selectedSubjectId, selectedLevelId, statusFilter, debtFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSubjectId('');
    setSelectedLevelId('');
    setStatusFilter('ALL');
    setDebtFilter('ALL');
    setPage(1);
  };

  // Fetch students with combined filters
  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
      if (selectedLevelId) params.set('levelId', selectedLevelId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (debtFilter === 'DEBT') params.set('hasDebt', 'true');
      if (debtFilter === 'CLEAR') params.set('hasDebt', 'false');

      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const res = await api.get<any>(`/students?${params.toString()}`);
      setStudents(res.data || []);
      setTotalPages(res.totalPages || res.pagination?.totalPages || 1);
      setTotal(res.total ?? res.pagination?.totalItems ?? (res.data || []).length);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل قائمة الطلاب');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedSubjectId, selectedLevelId, statusFilter, debtFilter, page, pageSize]);

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  // Export current filtered list to CSV
  const handleExportCSV = () => {
    const headers = [
      'رقم الطالب',
      'اسم الطالب',
      'المادة',
      'المستوى الدراسي',
      'هاتف الطالب',
      'هاتف ولي الأمر',
      'اسم ولي الأمر',
      'المدرسة',
      'الحالة',
      'الرصيد المستحق (ج.م)',
    ];

    const rows = students.map((s) => [
      s.studentNumber,
      s.fullName,
      s.subjectName || s.currentLevel?.subject?.name || '-',
      s.levelName || s.currentLevel?.name || '-',
      s.studentPhone || '',
      s.guardianPhone || '',
      s.guardianName || '',
      s.school || '',
      s.status === 'ACTIVE' ? 'نشط' : 'غير نشط',
      s.outstandingBalance || 0,
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSV(`دليل_الطلاب_${dateStr}`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">سجل الطلاب</h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {total} طالب
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            البحث والتصفية وإدارة ملفات الطلاب والمستويات الدراسية والمديونيات
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={students.length === 0}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all text-xs disabled:opacity-50"
            title="تصدير النتائج إلى ملف Excel / CSV"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>تصدير CSV</span>
          </button>

          <Link
            href="/students/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل طالب جديد</span>
          </Link>
        </div>
      </div>

      {/* Advanced Filters Card */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بالاسم، برقم الطالب (#12)، أو برقم الهاتف..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Active Filters Badge and Reset */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>إعادة ضبط التصفية ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Filter Selectors Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
          {/* Subject Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">المادة الدراسية</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            >
              <option value="">جميع المواد</option>
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Educational Level Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">المستوى الدراسي</label>
            <select
              value={selectedLevelId}
              onChange={(e) => {
                setSelectedLevelId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            >
              <option value="">جميع المستويات</option>
              {availableLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {!selectedSubjectId && lvl.subject?.name ? `${lvl.subject.name} - ` : ''}
                  {lvl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">حالة القيد</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="ACTIVE">الطلاب النشطون فقط</option>
              <option value="INACTIVE">الطلاب غير النشطين</option>
            </select>
          </div>

          {/* Debt / Balance Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">الموقف المالي</label>
            <select
              value={debtFilter}
              onChange={(e) => {
                setDebtFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden transition-all"
            >
              <option value="ALL">الكل (المدينون والخالصون)</option>
              <option value="DEBT">عليهم مديونيات مستحقة</option>
              <option value="CLEAR">مسدد بالكامل (لا مديونية)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Students Data Table Card */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50/80 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 w-24">رقم القيد</th>
                <th className="py-3.5 px-4">اسم الطالب</th>
                <th className="py-3.5 px-4">المادة والمستوى</th>
                <th className="py-3.5 px-4">أرقام الاتصال</th>
                <th className="py-3.5 px-4">الموقف المالي</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-center w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-semibold text-gray-500">
                        جاري تحميل وتصفية الطلاب...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-gray-800 text-base">لا يوجد طلاب مطابقون</div>
                      <p className="text-xs text-gray-500">
                        لم يتم العثور على أي طالب يطابق معايير التصفية الحالية. جرّب تعديل كلمات
                        البحث أو إعادة ضبط الفلاتر.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                        >
                          إعادة ضبط كافة الفلاتر
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const subjectName = student.subjectName || student.currentLevel?.subject?.name;
                  const levelName = student.levelName || student.currentLevel?.name;
                  const balance = Number(student.outstandingBalance ?? 0);

                  return (
                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Student Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        <span className="inline-block px-2.5 py-1 bg-blue-50 rounded-lg text-xs">
                          #{student.studentNumber}
                        </span>
                      </td>

                      {/* Full Name & School */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm hover:underline"
                        >
                          {student.fullName}
                        </Link>
                        {student.school && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                            <Building className="w-3 h-3" />
                            <span>{student.school}</span>
                          </div>
                        )}
                      </td>

                      {/* Subject & Level */}
                      <td className="py-3.5 px-4 text-gray-700">
                        {subjectName || levelName ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-gray-800">
                              {levelName || '-'}
                            </span>
                            {subjectName && (
                              <span className="text-[11px] text-gray-400 font-semibold">
                                {subjectName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">غير محدد</span>
                        )}
                      </td>

                      {/* Contact Phones */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="space-y-1">
                          {student.guardianPhone && (
                            <div className="flex items-center gap-1 text-gray-700 direction-ltr text-right">
                              <span className="text-[10px] text-gray-400 font-sans">ولي أمر:</span>
                              <span className="font-semibold">{student.guardianPhone}</span>
                            </div>
                          )}
                          {student.studentPhone && (
                            <div className="flex items-center gap-1 text-gray-500 direction-ltr text-right">
                              <span className="text-[10px] text-gray-400 font-sans">الطالب:</span>
                              <span>{student.studentPhone}</span>
                            </div>
                          )}
                          {!student.guardianPhone && !student.studentPhone && (
                            <span className="text-gray-400 text-xs font-sans">لا توجد أرقام</span>
                          )}
                        </div>
                      </td>

                      {/* Financial Balance */}
                      <td className="py-3.5 px-4">
                        {balance > 0 ? (
                          <Link
                            href={`/payments?studentId=${student.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-extrabold transition-colors"
                            title="تسجيل سداد مستحقات"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>{formatEGP(balance)}</span>
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>خالص</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {student.status === 'ACTIVE' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                            غير نشط
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/students/${student.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors"
                            title="عرض وتعديل الملف"
                          >
                            الملف
                          </Link>

                          <Link
                            href={`/reports/statement?studentId=${student.id}`}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-gray-100 transition-colors"
                            title="كشف حساب مالي"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/payments?studentId=${student.id}`}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="سداد دفعة"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Page Size Footer */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
              <span>
                عرض {(page - 1) * pageSize + 1} إلى {Math.min(page * pageSize, total)} من أصل{' '}
                <strong className="text-gray-900">{total}</strong> طالب
              </span>

              <div className="flex items-center gap-1 mr-4">
                <span>لكل صفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-hidden"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <span className="text-xs font-bold text-gray-700 px-2">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
