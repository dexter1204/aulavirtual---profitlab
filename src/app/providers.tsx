'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { AppShell } from '@/components/AppShell';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </AuthProvider>
  );
}
