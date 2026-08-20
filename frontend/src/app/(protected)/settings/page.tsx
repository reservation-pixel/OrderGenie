'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { allowedSettingsTabsFor } from './layout';

export default function SettingsIndexPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    router.replace(allowedSettingsTabsFor(user?.role)[0]);
  }, [user, router]);

  return null;
}
