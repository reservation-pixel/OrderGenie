'use client';

import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister';
import { AuthCacheReset } from '@/components/shared/AuthCacheReset';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    // Outside QueryClientProvider so Toaster, which reads useTheme, sits inside it.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthCacheReset />
        {children}
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegister />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
