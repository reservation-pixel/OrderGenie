import type { PurchaseOrderStatus } from '@/types/api';

export const STATUS_VARIANT: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  PARTIALLY_RECEIVED: 'default',
  RECEIVED: 'secondary',
  CANCELLED: 'destructive',
};
