'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const TABS = [
  { href: '/settings/api', label: 'Petpooja API' },
  { href: '/settings/sync', label: 'Sync Schedule' },
  { href: '/settings/users', label: 'Users' },
  { href: '/settings/roles', label: 'Roles' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/api-explorer', label: 'API Explorer' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && pathname !== '/settings/notifications') {
      router.replace('/settings/notifications');
    }
  }, [user, pathname, router]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.filter((tab) => user?.role === 'ADMIN' || tab.href === '/settings/notifications').map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              pathname === tab.href
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
