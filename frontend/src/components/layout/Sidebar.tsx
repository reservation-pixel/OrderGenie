'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, type NavItem } from './nav-items';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

function isLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const [manualToggle, setManualToggle] = useState<Record<string, boolean>>({});

  function defaultOpen(item: NavItem): boolean {
    return item.children?.some((child) => child.href && isLinkActive(pathname, child.href)) ?? false;
  }

  function isOpen(item: NavItem): boolean {
    return manualToggle[item.label] ?? defaultOpen(item);
  }

  function toggleSection(item: NavItem) {
    setManualToggle((prev) => ({ ...prev, [item.label]: !isOpen(item) }));
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-tight">
        OrderGenie
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          if (item.children) {
            const open = isOpen(item);
            const children = item.children.filter((child) => !child.adminOnly || isAdmin);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleSection(item)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                  <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
                </button>
                {open && (
                  <div className="mt-1 ml-3 space-y-1 border-l pl-2">
                    {children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = child.href ? isLinkActive(pathname, child.href) : false;
                      return (
                        <Link
                          key={child.href}
                          href={child.href ?? '#'}
                          onClick={onNavigate}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const active = item.href ? isLinkActive(pathname, item.href) : false;
          return (
            <Link
              key={item.href}
              href={item.href ?? '#'}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
