'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/authStore';

export function Header() {
  const { user } = useAuthStore();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-2 md:px-6">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        {user?.role === 'OUTLET_MANAGER' && <span className="text-sm text-muted-foreground">{user.outletName}</span>}

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-sm leading-tight sm:block">
            <div className="font-medium">{user?.name}</div>
            <div className="text-muted-foreground">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
