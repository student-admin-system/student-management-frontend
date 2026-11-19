'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useProtected } from '@/lib/use-protected';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { Alert } from '@/components/Alert';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Settings,
  Store,
  Users,
  UserPlus,
  KeyRound,
  Power,
  Lock,
  CheckCircle,
  Pencil,
} from 'lucide-react';

export default function SettingsPage() {
  const { user: currentUser, refreshUser } = useAuth();
  useProtected(true); // Admin only

  // Business Name
  const [businessName, setBusinessName] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Assistants List
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Edit User Name Modal
  const [editNameTargetUser, setEditNameTargetUser] = useState<User | null>(null);
  const [editNameVal, setEditNameVal] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Create Assistant Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Disable / Enable User Modal
  const [toggleTargetUser, setToggleTargetUser] = useState<User | null>(null);
  const [isTogglingUser, setIsTogglingUser] = useState(false);

  // Change Own Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newOwnPassword, setNewOwnPassword] = useState('');
  const [isChangingOwnPassword, setIsChangingOwnPassword] = useState(false);

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch settings & users
  const loadData = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      setError(null);
      const [settingsData, usersData] = await Promise.all([
        api.get<any>('/settings'),
        api.get<User[]>('/users'),
      ]);

      if (settingsData?.businessName) {
        setBusinessName(settingsData.businessName);
      }
      setUsers(usersData || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل الإعدادات والمستخدمين');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Business Name (FR-ACA-03)
  const handleSaveBusinessName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    try {
      setIsSavingSettings(true);
      setError(null);
      await api.patch('/settings', { businessName: businessName.trim() });
      if (currentUser?.id && currentUser.role === 'ADMIN') {
        try {
          await api.patch(`/users/${currentUser.id}`, { name: businessName.trim() });
        } catch {
          // ignore if user patch fails as backend settingsService already syncs it
        }
      }
      await refreshUser();
      setSuccess('تم حفظ اسم المعلم / المركز بنجاح وتحديث بيانات لوحة التحكم');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ الإعدادات');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Edit User Display Name
  const handleEditUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameTargetUser || !editNameVal.trim()) return;
    try {
      setIsEditingName(true);
      setError(null);
      await api.patch(`/users/${editNameTargetUser.id}`, {
        name: editNameVal.trim(),
      });
      if (editNameTargetUser.role === 'ADMIN') {
        try {
          await api.patch('/settings', { businessName: editNameVal.trim() });
          setBusinessName(editNameVal.trim());
        } catch {}
      }
      await refreshUser();
      setSuccess(`تم تحديث الاسم إلى (${editNameVal.trim()}) بنجاح`);
      setEditNameTargetUser(null);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'تعذر تعديل الاسم');
    } finally {
      setIsEditingName(false);
    }
  };

  // Create Assistant User (FR-ACC-02)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword || !newName.trim()) return;
    try {
      setIsCreating(true);
      setError(null);
      await api.post('/users', {
        username: newUsername.trim(),
        password: newPassword,
        name: newName.trim(),
      });
      setSuccess('تم إنشاء حساب المساعد بنجاح');
      setIsCreateOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'تعذر إنشاء الحساب');
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle Assistant Active/Inactive (FR-ACC-02, FR-ACC-03)
  const handleToggleUserActive = async () => {
    if (!toggleTargetUser) return;
    try {
      setIsTogglingUser(true);
      setError(null);
      await api.patch(`/users/${toggleTargetUser.id}`, {
        isActive: !toggleTargetUser.isActive,
      });
      setSuccess(
        toggleTargetUser.isActive
          ? 'تم تعطيل حساب المساعد بنجاح (لن يتمكن من تسجيل الدخول)'
          : 'تم إعادة تفعيل حساب المساعد بنجاح'
      );
      setToggleTargetUser(null);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'تعذر تغيير حالة الحساب');
    } finally {
      setIsTogglingUser(false);
    }
  };

  // Reset Assistant Password (PERM-01)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordVal) return;
    try {
      setIsResetting(true);
      setError(null);
      await api.post(`/users/${resetTargetUser.id}/reset-password`, {
        newPassword: resetPasswordVal,
      });
      setSuccess(`تم إعادة تعيين كلمة مرور ${resetTargetUser.name} بنجاح`);
      setResetTargetUser(null);
      setResetPasswordVal('');
    } catch (err: any) {
      setError(err?.message || 'تعذر إعادة تعيين كلمة المرور');
    } finally {
      setIsResetting(false);
    }
  };

  // Change Own Password
  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newOwnPassword) return;
    try {
      setIsChangingOwnPassword(true);
      setError(null);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword: newOwnPassword,
      });
      setSuccess('تم تغيير كلمة المرور الخاصة بك بنجاح');
      setCurrentPassword('');
      setNewOwnPassword('');
    } catch (err: any) {
      setError(err?.message || 'تعذر تغيير كلمة المرور');
    } finally {
      setIsChangingOwnPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">إعدادات النظام والحسابات</h1>
        <p className="text-sm text-gray-500 mt-1">
          تعديل اسم النشاط، إدارة حسابات المساعدين، وتعيين كلمات المرور
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Name Settings Card (FR-ACA-03) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Store className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">اسم المعلم / المركز التعليمي</h2>
          </div>

          <form onSubmit={handleSaveBusinessName} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الاسم الظاهر في النظام والتقارير
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="مثال: سنتر الأوائل - أستاذ محمد"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                وفقاً للمتطلب (FR-ACA-03)، اسم المعلم إعداد قابل للتعديل وغير مثبت بالكود
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {isSavingSettings ? 'جاري الحفظ...' : 'حفظ الاسم'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Own Password Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Lock className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">تغيير كلمة المرور الخاصة بك</h2>
          </div>

          <form onSubmit={handleChangeOwnPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                كلمة المرور الجديدة (6 خانات على الأقل)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newOwnPassword}
                onChange={(e) => setNewOwnPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingOwnPassword}
                className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {isChangingOwnPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Assistant User Management (FR-ACC-01, FR-ACC-02) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>إدارة حسابات المساعدين (فريق العمل)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              يمكن للمدير إنشاء حسابات للمساعدين، تعطيلها، وإعادة تعيين كلمات المرور
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewUsername('');
              setNewPassword('');
              setNewName('');
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مساعد جديد</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">الاسم</th>
                <th className="py-3 px-4">اسم المستخدم</th>
                <th className="py-3 px-4">الدور</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    جاري تحميل المستخدمين...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    لا يوجد مستخدمون مسجلون
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-bold text-gray-900">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">
                      {u.username}
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          مدير النظام
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                          مساعد
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          نشط
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          معطل
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditNameTargetUser(u);
                            setEditNameVal(u.name);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-bold px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100"
                          title="تعديل الاسم"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل الاسم</span>
                        </button>

                        {u.role !== 'ADMIN' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetUser(u);
                                setResetPasswordVal('');
                              }}
                              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-bold px-2 py-1 bg-amber-50 rounded-lg hover:bg-amber-100"
                              title="إعادة تعيين كلمة المرور"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>كلمة المرور</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setToggleTargetUser(u)}
                              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                                u.isActive
                                  ? 'text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100'
                                  : 'text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100'
                              }`}
                              title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{u.isActive ? 'تعطيل' : 'تفعيل'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Assistant Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">إنشاء حساب مساعد جديد</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: سارة أحمد"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  اسم المستخدم (للدخول)
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="مثال: sara_assistant"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  كلمة المرور (6 خانات على الأقل)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono text-left"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-xs disabled:opacity-50"
                >
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Assistant Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              إعادة تعيين كلمة مرور: {resetTargetUser.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              أدخل كلمة المرور الجديدة لهذا الحساب (6 خانات على الأقل)
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono text-left"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 text-xs disabled:opacity-50"
                >
                  {isResetting ? 'جاري التعيين...' : 'تعيين كلمة المرور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Display Name Modal */}
      {editNameTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              تعديل اسم {editNameTargetUser.role === 'ADMIN' ? 'مدير النظام / المعلم' : 'المساعد'}: {editNameTargetUser.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              الاسم الجديد سيظهر في لوحة التحكم وشريط التنقل وكافة العمليات المسجلة
            </p>
            <form onSubmit={handleEditUserName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الاسم الكامل الجديد
                </label>
                <input
                  type="text"
                  required
                  value={editNameVal}
                  onChange={(e) => setEditNameVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditNameTargetUser(null)}
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isEditingName}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-xs disabled:opacity-50"
                >
                  {isEditingName ? 'جاري التحديث...' : 'حفظ الاسم الجديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle User Active Modal */}
      <ConfirmModal
        isOpen={!!toggleTargetUser}
        title={toggleTargetUser?.isActive ? 'تعطيل حساب المساعد' : 'إعادة تفعيل حساب المساعد'}
        message={
          toggleTargetUser?.isActive
            ? `هل أنت متأكد من تعطيل حساب (${toggleTargetUser?.name})؟ لن يتمكن من تسجيل الدخول إلى النظام، وستبقى كافة السجلات التي أدخلها منسوبة إليه.`
            : `هل ترغب في إعادة تفعيل حساب (${toggleTargetUser?.name})؟`
        }
        confirmText={toggleTargetUser?.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
        isDanger={toggleTargetUser?.isActive}
        isLoading={isTogglingUser}
        onConfirm={handleToggleUserActive}
        onCancel={() => setToggleTargetUser(null)}
      />
    </div>
  );
}
