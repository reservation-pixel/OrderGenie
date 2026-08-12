'use client';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { TrendingUp, Boxes, ClipboardList, Store, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { label: 'Sales Insights', icon: TrendingUp },
  { label: 'Inventory Control', icon: Boxes },
  { label: 'Purchase Orders', icon: ClipboardList },
  { label: 'Multi-Outlet', icon: Store },
];

// Illustrative only — this page renders before login, so it must never be wired
// to a real query (that would leak business data to a logged-out visitor).
const TREND_POINTS = [12, 18, 15, 24, 20, 30, 26].map((v, i) => ({ i, v }));
const TOP_ITEMS = [
  { name: '15" Pizza', hint: 'Capiche' },
  { name: 'Tiramisu', hint: 'Capiche' },
  { name: 'Dragon Roll', hint: 'Aiko' },
];

export function LoginMarketingPanel() {
  return (
    <div className="flex w-full flex-col justify-center gap-10 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-12 py-12 dark:from-indigo-950/40 dark:via-background dark:to-violet-950/30">
      <div className="flex items-center gap-3">
        <img src="/brand/logo-mark.png" alt="" className="h-10 w-10 rounded-lg" />
        <span className="text-2xl font-semibold tracking-tight">
          Order<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Genie</span>
        </span>
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          All your restaurant data.
          <br />
          One <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">powerful</span> platform.
        </h1>
        <p className="max-w-md text-muted-foreground">
          OrderGenie helps you track sales, inventory, purchase orders, and ingredient reconciliation across every
          outlet — in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {FEATURES.map((f) => (
          <div key={f.label} className="flex items-center gap-1.5 text-sm text-foreground/80">
            <f.icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {f.label}
          </div>
        ))}
      </div>

      <div className="max-w-md overflow-hidden rounded-xl border bg-card/80 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">Today's Overview</span>
          <span className="text-xs text-muted-foreground">Illustrative preview</span>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Today's Sales</div>
            <div className="text-lg font-semibold">₹1,25,430</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Orders</div>
            <div className="text-lg font-semibold">352</div>
          </div>
        </div>
        <div className="h-16 px-4 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TREND_POINTS}>
              <defs>
                <linearGradient id="loginTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fill="url(#loginTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 px-4 pb-4 pt-2">
          <div className="text-xs font-medium text-muted-foreground">Top Selling Items</div>
          {TOP_ITEMS.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <span>{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.hint}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        Access is managed by your OrderGenie administrator.
      </div>
    </div>
  );
}
