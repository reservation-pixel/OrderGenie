import { LoginMarketingPanel } from '@/components/auth/LoginMarketingPanel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex">
        <LoginMarketingPanel />
      </div>
      <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4 py-12">
        {children}
      </div>
    </div>
  );
}
