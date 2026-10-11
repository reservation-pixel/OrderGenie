/**
 * Recharts defaults its axis ticks to #666 and its tooltip to a white card, neither of which
 * reads on a dark background. Spreading these onto every chart keeps both themes legible.
 */
export const axisProps = {
  stroke: 'var(--border)',
  tick: { fill: 'var(--muted-foreground)' },
} as const;

export const tooltipProps = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--popover-foreground)',
  },
  labelStyle: { color: 'var(--popover-foreground)' },
  itemStyle: { color: 'var(--popover-foreground)' },
  cursor: { fill: 'var(--accent)' },
} as const;

/** Series colours, in the order charts should consume them. */
export const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
] as const;
