const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value ?? 0);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value ?? 0);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// Loosely-typed variants for use as Recharts Tooltip/Axis formatter callbacks,
// whose value/label types vary by chart and are frequently `unknown | undefined`.
export function formatCurrencyTooltip(value: unknown): string {
  return formatCurrency(Number(value));
}

export function formatDateTooltip(value: unknown): string {
  return formatDate(String(value));
}
