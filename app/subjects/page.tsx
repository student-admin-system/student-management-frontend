'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { Subject, Level } from '@/lib/types';
import { Alert } from '@/components/Alert';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  BookOpen,
  Plus,
  Layers,
  Edit,
  Power,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function SubjectsPage() {
  useProtected(true); // Admin only

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add Subject Modal
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  // Edit Subject Modal
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [isUpdatingSubject, setIsUpdatingSubject] = useState(false);

  // Add Level Modal
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [levelName, setLevelName] = useState('');
  const [isSavingLevel, setIsSavingLevel] = useState(false);

  // Edit Level Modal
  const [editLevel, setEditLevel] = useState<Level | null>(null);
  const [editLevelName, setEditLevelName] = useState('');
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false);

  // Toggle active confirmation
  const [toggleSubject, setToggleSubject] = useState<Subject | null>(null);
  const [toggleLevel, setToggleLevel] = useState<Level | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Permanent Delete Subject Modal (BR-27)
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<Subject[]>('/subjects');
      setSubjects(data || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل المواد والمستويات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    try {
      setIsSavingSubject(true);
      setError(null);
      await api.post('/subjects', { name: subjectName.trim() });
      setSuccess('تمت إضافة المادة بنجاح');
      setIsAddSubjectOpen(false);
      setSubjectName('');
      fetchSubjects();
    } catch (err: any) {
      setError(err?.message || 'تعذر إضافة المادة');
    } finally {
      setIsSavingSubject(false);
    }
  };

  // Update Subject
  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject || !editSubjectName.trim()) return;
    try {
      setIsUpdatingSubject(true);
      setError(null);
      await api.patch(`/subjects/${editSubject.id}`, { name: editSubjectName.trim() });
      setSuccess('تم تحديث اسم المادة بنجاح');
      setEditSubject(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err?.message || 'تعذر تعديل المادة');
    } finally {
      setIsUpdatingSubject(false);
    }
  };

  // Toggle Subject Active/Inactive (FR-ACA-01)
  const handleToggleSubjectActive = async () => {
    if (!toggleSubject) return;
    try {
      setIsToggling(true);
      setError(null);
      await api.patch(`/subjects/${toggleSubject.id}`, { isActive: !toggleSubject.isActive });
      setSuccess(
        toggleSubject.isActive
          ? 'تم إلغاء تفعيل المادة'
          : 'تم تفعيل المادة بنجاح'
      );
      setToggleSubject(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err?.message || 'تعذر تغيير حالة تفعيل المادة');
    } finally {
      setIsToggling(false);
    }
  };

  // Create Level
  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSubjectId || !levelName.trim()) return;
    try {
      setIsSavingLevel(true);
      setError(null);
      await api.post('/subjects/levels', {
        subjectId: targetSubjectId,
        name: levelName.trim(),
      });
      setSuccess('تمت إضافة المستوى بنجاح');
      setIsAddLevelOpen(false);
      setLevelName('');
      fetchSubjects();
    } catch (err: any) {
      setError(err?.message || 'تعذر إضافة المستوى');
    } finally {
      setIsSavingLevel(false);
    }
  };

  // Update Level
  const handleUpdateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLevel || !editLevelName.trim()) return;
    try {
      setIsUpdatingLevel(true);
      setError(null);
      await api.patch(`/subjects/levels/${editLevel.id}`, { name: editLevelName.trim() });
      setSuccess('تم تحديث اسم المستوى بنجاح');
      setEditLevel(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err?.message || 'تعذر تعديل المستوى');
    } finally {
      setIsUpdatingLevel(false);
    }
  };

  // Toggle Level Active/Inactive (FR-ACA-01)
  const handleToggleLevelActive = async () => {
    if (!toggleLevel) return;
    try {
      setIsToggling(true);
      setError(null);
      await api.patch(`/subjects/levels/${toggleLevel.id}`, { isActive: !toggleLevel.isActive });
      setSuccess(
        toggleLevel.isActive
          ? 'تم إلغاء تفعيل المستوى'
          : 'تم تفعيل المستوى بنجاح'
      );
      setToggleLevel(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err?.message || 'تعذر تغيير حالة تفعيل المستوى');
    } finally {
      setIsToggling(false);
    }
  };

  // Permanent Delete Subject (Admin Only - BR-27)
  const handleDeleteSubject = async () => {
    if (!deleteSubject) return;
    try {
      setIsDeletingSubject(true);
      setError(null);
      await api.delete(`/subjects/${deleteSubject.id}`);
      setSuccess(`تم حذف مادة "${deleteSubject.name}" وكافة مستوياتها وبياناتها نهائياً`);
      setDeleteSubject(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف المادة نهائياً');
    } finally {
      setIsDeletingSubject(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">المواد والمستويات الدراسية</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة الهيكل الأكاديمي (المواد والمستويات التابعة لها) وحالات التفعيل
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubjectName('');
            setIsAddSubjectOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مادة جديدة</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Subjects Cards List */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span>جاري تحميل المواد والمستويات...</span>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-xs">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">لا توجد مواد دراسية مسجلة</h3>
          <p className="text-xs text-gray-500 mt-1">ابدأ بإضافة مادة دراسية أولى لتنظيم مستويات الطلاب والمجموعات</p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all ${
                sub.isActive ? 'border-gray-200' : 'border-gray-200 opacity-70 bg-gray-50/50'
              }`}
            >
              {/* Subject Header */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{sub.name}</h2>
                      {sub.isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          نشطة
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                          معطلة
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {sub.levels?.length || 0} مستويات دراسية
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetSubjectId(sub.id);
                      setLevelName('');
                      setIsAddLevelOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مستوى</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditSubject(sub);
                      setEditSubjectName(sub.name);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    title="تعديل اسم المادة"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setToggleSubject(sub)}
                    className={`p-2 rounded-xl transition-colors ${
                      sub.isActive
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={sub.isActive ? 'تعطيل المادة' : 'تفعيل المادة'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteSubject(sub)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف المادة نهائياً وكافة بياناتها"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Levels List */}
              <div className="p-5">
                {!sub.levels || sub.levels.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">
                    لا توجد مستويات دراسية لهذه المادة بعد
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sub.levels.map((lvl) => (
                      <div
                        key={lvl.id}
                        className={`p-4 rounded-xl border flex items-center justify-between ${
                          lvl.isActive
                            ? 'bg-white border-gray-200'
                            : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="font-bold text-sm text-gray-800">
                            {lvl.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditLevel(lvl);
                              setEditLevelName(lvl.name);
                            }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="تعديل اسم المستوى"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setToggleLevel(lvl)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              lvl.isActive
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={lvl.isActive ? 'تعطيل المستوى' : 'تفعيل المستوى'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Subject Modal */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">إضافة مادة دراسية جديدة</h3>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المادة</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="مثال: الرياضيات، الفيزياء..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingSubject}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-xs disabled:opacity-50"
                >
                  {isSavingSubject ? 'جاري الحفظ...' : 'حفظ المادة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تعديل اسم المادة</h3>
            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المادة</label>
                <input
                  type="text"
                  required
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSubject(null)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSubject}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-xs disabled:opacity-50"
                >
                  {isUpdatingSubject ? 'جاري الحفظ...' : 'تحديث الاسم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Level Modal */}
      {isAddLevelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">إضافة مستوى دراسي جديد</h3>
            <form onSubmit={handleCreateLevel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">المادة</label>
                <select
                  value={targetSubjectId}
                  onChange={(e) => setTargetSubjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المستوى</label>
                <input
                  type="text"
                  required
                  value={levelName}
                  onChange={(e) => setLevelName(e.target.value)}
                  placeholder="مثال: الصف الأول الثانوي، الصف الثاني..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLevelOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingLevel}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-xs disabled:opacity-50"
                >
                  {isSavingLevel ? 'جاري الحفظ...' : 'حفظ المستوى'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Level Modal */}
      {editLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تعديل اسم المستوى</h3>
            <form onSubmit={handleUpdateLevel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المستوى</label>
                <input
                  type="text"
                  required
                  value={editLevelName}
                  onChange={(e) => setEditLevelName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditLevel(null)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLevel}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-xs disabled:opacity-50"
                >
                  {isUpdatingLevel ? 'جاري الحفظ...' : 'تحديث الاسم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Subject Confirm Modal */}
      <ConfirmModal
        isOpen={!!toggleSubject}
        title={toggleSubject?.isActive ? 'تعطيل المادة' : 'إعادة تفعيل المادة'}
        message={
          toggleSubject?.isActive
            ? 'وفقاً للمتطلب (FR-ACA-01)، لا يمكن تعطيل مادة إذا كان بها طلاب نشطون حالياً. هل ترغب في المتابعة؟'
            : 'سيتم إعادة تفعيل هذه المادة وإتاحتها للاستخدام.'
        }
        confirmText={toggleSubject?.isActive ? 'تعطيل المادة' : 'تفعيل المادة'}
        isDanger={toggleSubject?.isActive}
        isLoading={isToggling}
        onConfirm={handleToggleSubjectActive}
        onCancel={() => setToggleSubject(null)}
      />

      {/* Toggle Level Confirm Modal */}
      <ConfirmModal
        isOpen={!!toggleLevel}
        title={toggleLevel?.isActive ? 'تعطيل المستوى' : 'إعادة تفعيل المستوى'}
        message={
          toggleLevel?.isActive
            ? 'وفقاً للمتطلب (FR-ACA-01)، لا يمكن تعطيل مستوى إذا كان به طلاب نشطون حالياً. هل ترغب في المتابعة؟'
            : 'سيتم إعادة تفعيل هذا المستوى وإتاحته للاستخدام.'
        }
        confirmText={toggleLevel?.isActive ? 'تعطيل المستوى' : 'تفعيل المستوى'}
        isDanger={toggleLevel?.isActive}
        isLoading={isToggling}
        onConfirm={handleToggleLevelActive}
        onCancel={() => setToggleLevel(null)}
      />

      {/* Permanent Delete Subject Confirm Modal (BR-27) */}
      <ConfirmModal
        isOpen={!!deleteSubject}
        title="حذف نهائي للمادة الدراسية"
        message={`هل أنت متأكد من حذف مادة "${deleteSubject?.name || ''}" ومستوياتها وكافة الحصص والرسوم والسجلات المرتبطة بها نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`}
        confirmText="نعم، احذف نهائياً"
        cancelText="إلغاء"
        isDanger={true}
        isLoading={isDeletingSubject}
        onConfirm={handleDeleteSubject}
        onCancel={() => setDeleteSubject(null)}
      />
    </div>
  );
}
