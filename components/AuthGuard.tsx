'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = pathname === '/login';

  useEffect(() => {
    if (!isLoading && !user && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isLoading, user, isPublicRoute, router]);

  // If on public login route, render children directly
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // While verifying authentication or if unauthenticated, show clean loading state and NEVER leak children/API calls
  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-500">جاري التحقق من الصلاحيات...</p>
      </div>
    );
  }

  // Authenticated: render protected page content
  return <>{children}</>;
}
