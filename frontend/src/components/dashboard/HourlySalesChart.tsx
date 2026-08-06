'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatCurrencyTooltip } from '@/lib/format';

export function HourlySalesChart({ data }: { data: { hour: number; amount: number }[] }) {
  const formatted = data.map((d) => ({ ...d, label: `${d.hour}:00` }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hourly Sales (Today)</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" fontSize={11} tickLine={false} interval={2} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={12} width={70} />
            <Tooltip formatter={formatCurrencyTooltip} />
            <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
