export const DEFAULT_CRON_EXPRESSIONS: Record<'SALES' | 'INVENTORY' | 'PURCHASE' | 'HISTORICAL', string> = {
  SALES: '*/5 * * * *',
  INVENTORY: '*/10 * * * *',
  PURCHASE: '*/15 * * * *',
  HISTORICAL: '0 2 * * *',
};

export const CRON_TIMEZONE = 'Asia/Kolkata';

export const LOW_STOCK_DEFAULT_THRESHOLD = 10;

export const HISTORICAL_SYNC_WINDOW_DAYS = 7;
