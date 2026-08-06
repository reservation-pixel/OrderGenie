'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function SettingsIndexPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    router.replace(user?.role === 'ADMIN' ? '/settings/api' : '/settings/notifications');
  }, [user, router]);

  return null;
}
