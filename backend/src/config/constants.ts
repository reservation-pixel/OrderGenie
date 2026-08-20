export const DEFAULT_CRON_EXPRESSIONS: Record<'SALES' | 'PURCHASE' | 'HISTORICAL', string> = {
  SALES: '*/5 * * * *',
  PURCHASE: '*/5 * * * *',
  HISTORICAL: '0 2 * * *',
};

export const CRON_TIMEZONE = 'Asia/Kolkata';

export const LOW_STOCK_DEFAULT_THRESHOLD = 10;
