'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatCurrencyTooltip, formatDateTooltip } from '@/lib/format';

export function SalesTrendChart({ data }: { data: { date: string; amount: number }[] }) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Sales Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} fontSize={12} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={12} tickLine={false} width={80} />
            <Tooltip formatter={formatCurrencyTooltip} labelFormatter={formatDateTooltip} />
            <Line type="monotone" dataKey="amount" stroke="var(--color-primary, #2563eb)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
