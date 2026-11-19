'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Level, Student, StudentAttendanceReport } from '@/lib/types';
import { downloadCSV } from '@/lib/csv';
import { Alert } from '@/components/Alert';
import {
  CalendarCheck,
  Calendar,
  Layers,
  Download,
  Users,
  CheckCircle,
  HelpCircle,
  Search,
  UserCheck,
  Hash,
  XCircle,
  User,
} from 'lucide-react';

interface AttendanceReportData {
  lesson: any;
  lessonNumber?: number;
  attendances: any[];
  informationalAbsentList: { id: string; studentNumber: number; fullName: string }[];
}

function AttendanceReportContent() {
  useProtected();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get('studentId');

  // Report view modes: 'lesson' (Daily Lesson Attendance) vs 'student' (Student Cumulative Attendance Report)
  const [viewMode, setViewMode] = useState<'lesson' | 'student'>(initialStudentId ? 'student' : 'lesson');

  // Lesson view filters
  const [date, setDate] = useState('');
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);
  const [levelId, setLevelId] = useState('');
  const [levels, setLevels] = useState<Level[]>([]);
  const [lessonReportData, setLessonReportData] = useState<AttendanceReportData | null>(null);

  // Student view search & report
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<Student[]>([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentReport, setStudentReport] = useState<StudentAttendanceReport | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load levels
  useEffect(() => {
    async function loadLevels() {
      try {
        const data = await api.get<Level[]>('/subjects/levels');
        setLevels(data || []);
        if (data && data.length > 0) setLevelId(data[0].id);
      } catch {
        setError('تعذر تحميل بيانات المستويات');
      }
    }
    loadLevels();
  }, []);

  // Fetch lesson report
  const fetchLessonReport = useCallback(async () => {
    if (!levelId || !date || viewMode !== 'lesson') return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<AttendanceReportData>(
        `/reports/attendance?levelId=${levelId}&date=${date}`
      );
      setLessonReportData(res);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل تقرير الحضور');
    } finally {
      setIsLoading(false);
    }
  }, [levelId, date, viewMode]);

  useEffect(() => {
    fetchLessonReport();
  }, [fetchLessonReport]);

  // Load student report
  const fetchStudentReport = useCallback(async (stuId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const rep = await api.get<StudentAttendanceReport>(`/attendance/student/${stuId}`);
      setStudentReport(rep);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل تقرير حضور الطالب');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check URL studentId
  useEffect(() => {
    if (initialStudentId) {
      setViewMode('student');
      api.get<Student>(`/students/${initialStudentId}`).then((stu) => {
        setSelectedStudent(stu);
      }).catch(() => {});
      fetchStudentReport(initialStudentId);
    }
  }, [initialStudentId, fetchStudentReport]);

  // Search students for student report view
  useEffect(() => {
    if (!studentSearchQuery.trim()) {
      setStudentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingStudent(true);
        const res = await api.get<any>(
          `/students?q=${encodeURIComponent(studentSearchQuery.trim())}&limit=8`
        );
        const list = res.data || (Array.isArray(res) ? res : []);
        setStudentSearchResults(list);
      } catch {
        setStudentSearchResults([]);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [studentSearchQuery]);

  const handleSelectStudent = (stu: Student) => {
    setSelectedStudent(stu);
    setStudentSearchQuery('');
    setStudentSearchResults([]);
    fetchStudentReport(stu.id);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (viewMode === 'lesson') {
      if (!lessonReportData) return;
      const headers = [
        'رقم الطالب',
        'اسم الطالب',
        'حالة الحضور',
        'المسؤول عن التسجيل',
      ];
      const presentRows = lessonReportData.attendances.map((a) => [
        a.student?.studentNumber,
        a.student?.fullName,
        'حاضر',
        a.recordedBy?.name || a.user?.name || '-',
      ]);
      const absentRows = lessonReportData.informationalAbsentList.map((a) => [
        a.studentNumber,
        a.fullName,
        'لم يُسجل حضوره (استرشادي)',
        '-',
      ]);
      downloadCSV(
        `تقرير_حضور_درس_${date}`,
        headers,
        [...presentRows, ...absentRows]
      );
    } else {
      if (!studentReport) return;
      const headers = [
        'تاريخ الحصة',
        'رقم الحصة بالشهر',
        'المستوى والمادة',
        'حالة الحضور',
        'المسؤول',
      ];
      const records = studentReport.records || (studentReport as any).lessons || [];
      const rows = records.map((r: any) => [
        r.date,
        `حصة #${r.lessonNumber ?? r.monthlyLessonNumber ?? '-'}`,
        r.levelName ? `${r.subjectName || ''} - ${r.levelName}` : r.combination || '-',
        r.status === 'PRESENT' ? 'حاضر' : 'غائب',
        r.recordedBy?.name ?? (typeof r.recordedBy === 'string' ? r.recordedBy : '-'),
      ]);
      downloadCSV(
        `تقرير_حضور_الطالب_${studentReport.student.fullName}`,
        headers,
        rows
      );
    }
  };

  const presentCount = lessonReportData?.attendances?.length || 0;
  const unrecordedCount = lessonReportData?.informationalAbsentList?.length || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">تقرير الحضور والغياب</h1>
          <p className="text-sm text-gray-500 mt-1">
            كشف حضور الدرس اليومي حسب المستوى، أو تقرير الحضور والغياب الشامل لطالب محدد (SRS v2.0)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={
              viewMode === 'lesson'
                ? !lessonReportData || (presentCount === 0 && unrecordedCount === 0)
                : !studentReport || studentReport.records.length === 0
            }
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-md shadow-emerald-500/20 text-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setViewMode('lesson')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            viewMode === 'lesson'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>كشف حضور درس محدد</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('student')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            viewMode === 'student'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>تقرير حضور وغياب طالب (شامل)</span>
        </button>
      </div>

      {viewMode === 'lesson' ? (
        /* Lesson Attendance View */
        <div className="space-y-6">
          {/* Date & Level Selectors */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>تاريخ الدرس:</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>المستوى الدراسي:</span>
              </label>
              <select
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.subject?.name ? `${lvl.subject.name} - ` : ''}
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-800 font-bold">تسلسل الحصة:</span>
                <div className="text-sm font-extrabold text-blue-900 mt-0.5">
                  {lessonReportData?.lessonNumber
                    ? `حصة رقم ${lessonReportData.lessonNumber}`
                    : 'حصة جديدة'}
                </div>
              </div>
              <span className="font-mono text-xs text-blue-600 font-bold bg-white px-2 py-1 rounded-md border border-blue-200">
                {date.slice(0, 7)}
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium">عدد الحضور الفعلي</span>
                <div className="mt-1 text-2xl font-black text-emerald-600 font-mono">
                  {presentCount} <span className="text-xs text-gray-500 font-normal">طالب</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium">
                  طلاب مسجلون لم يُسجل حضورهم (استرشادي)
                </span>
                <div className="mt-1 text-2xl font-black text-amber-600 font-mono">
                  {unrecordedCount} <span className="text-xs text-gray-500 font-normal">طالب</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <HelpCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Present Students Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>الطلاب الحاضرون ({presentCount})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">رقم الطالب</th>
                    <th className="py-3 px-4">اسم الطالب</th>
                    <th className="py-3 px-4">حالة الحضور</th>
                    <th className="py-3 px-4">المسؤول عن التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        جاري تحميل التقرير...
                      </td>
                    </tr>
                  ) : !lessonReportData || lessonReportData.attendances.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        لا يوجد حضور مسجل في هذا الدرس
                      </td>
                    </tr>
                  ) : (
                    lessonReportData.attendances.map((att) => (
                      <tr key={att.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-gray-600">
                          #{att.student?.studentNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {att.student?.fullName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            حاضر
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {att.recordedBy?.name || att.user?.name || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Absent / Unrecorded Students List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>طلاب مسجلون لم يُسجل حضورهم بعد ({unrecordedCount})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">رقم الطالب</th>
                    <th className="py-3 px-4">اسم الطالب</th>
                    <th className="py-3 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!lessonReportData ||
                  lessonReportData.informationalAbsentList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-gray-400 text-xs">
                        لا يوجد طلاب غائبون
                      </td>
                    </tr>
                  ) : (
                    lessonReportData.informationalAbsentList.map((stu) => (
                      <tr key={stu.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-mono font-semibold text-gray-600">
                          #{stu.studentNumber}
                        </td>
                        <td className="py-3 px-4 text-gray-800">{stu.fullName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            لم يُسجل حضوره
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
      ) : (
        /* Student Cumulative Attendance Report View (SRS v2.0) */
        <div className="space-y-6">
          {/* Student Search */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <label className="block text-sm font-bold text-gray-800">
              اختر الطالب لعرض تقرير الحضور والغياب الشامل
            </label>
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-3.5 text-gray-400" />
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطالب أو رقمه..."
                className="w-full pr-12 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all font-medium"
              />
            </div>

            {isSearchingStudent && (
              <div className="text-xs text-gray-500 py-2">جاري البحث عن الطلاب...</div>
            )}

            {studentSearchResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {studentSearchResults.map((stu) => (
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
                    <span className="text-xs text-blue-600 font-bold">عرض التقرير ←</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Student Attendance Report Content */}
          {studentReport && (
            <div className="space-y-6">
              {/* Student Header */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-white/20 px-2.5 py-0.5 rounded-lg text-xs">
                      #{studentReport.student.studentNumber}
                    </span>
                    <h2 className="text-xl font-bold">{studentReport.student.fullName}</h2>
                  </div>
                  <p className="text-xs text-blue-200 mt-1">
                    المستوى: {studentReport.student.combination || (studentReport.student.levelName ? `${studentReport.student.subjectName || ''} - ${studentReport.student.levelName}` : 'المستوى الحالي')}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-blue-300">نسبة الحضور</span>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {studentReport.summary.totalHeld > 0
                      ? `${Math.round(
                          (studentReport.summary.totalAttended / studentReport.summary.totalHeld) * 100
                        )}%`
                      : '100%'}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <span className="text-xs text-gray-500 font-bold">إجمالي الحصص المنعقدة:</span>
                  <div className="text-2xl font-black text-gray-900 font-mono mt-1">
                    {studentReport.summary.totalHeld} حصة
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <span className="text-xs text-emerald-700 font-bold">عدد مرات الحضور:</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                    {studentReport.summary.totalAttended} مرة
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <span className="text-xs text-rose-700 font-bold">عدد مرات الغياب:</span>
                  <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                    {studentReport.summary.totalAbsent} مرة
                  </div>
                </div>
              </div>

              {/* Chronological List of Lessons */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    <span>سجل الحصص المنعقدة وحالة حضور الطالب</span>
                  </h3>
                  <span className="text-xs text-gray-500">
                    {(studentReport.records || (studentReport as any).lessons || []).length} حصة مسجلة
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">تاريخ الحصة</th>
                        <th className="py-3 px-4">رقم الحصة بالشهر</th>
                        <th className="py-3 px-4">المستوى والمادة</th>
                        <th className="py-3 px-4">المسؤول عن التسجيل</th>
                        <th className="py-3 px-4">حالة الحضور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const records = studentReport.records || (studentReport as any).lessons || [];
                        if (records.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-gray-400">
                                لا توجد حصص منعقدة في فترات قيد الطالب النشطة
                              </td>
                            </tr>
                          );
                        }
                        return records.map((rec: any) => {
                          const lessonNum = rec.lessonNumber ?? rec.monthlyLessonNumber ?? '-';
                          const comboText = rec.levelName ? `${rec.subjectName || ''} - ${rec.levelName}` : rec.combination || '-';
                          const recorder = rec.recordedBy?.name ?? (typeof rec.recordedBy === 'string' ? rec.recordedBy : '-');
                          return (
                            <tr key={rec.lessonId} className="hover:bg-gray-50/50">
                              <td className="py-3 px-4 font-mono font-bold text-gray-700">
                                {rec.date}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-black">
                                  حصة رقم {lessonNum}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-600">
                                {comboText}
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-500">
                                {recorder}
                              </td>
                              <td className="py-3 px-4">
                                {rec.status === 'PRESENT' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>حاضر</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>غائب</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AttendanceReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AttendanceReportContent />
    </Suspense>
  );
}
