'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatCurrencyTooltip } from '@/lib/format';

export function OutletComparisonChart({ data }: { data: { outletName: string; revenue: number }[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outlet Comparison (14d)</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={12} />
            <YAxis type="category" dataKey="outletName" width={140} fontSize={11} tickLine={false} />
            <Tooltip formatter={formatCurrencyTooltip} />
            <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
