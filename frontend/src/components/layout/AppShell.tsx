'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSidebarStore } from '@/store/sidebarStore';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isHydrated } = useSidebarStore();
  const collapsed = isCollapsed && isHydrated;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          'hidden shrink-0 border-r bg-background transition-all md:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
