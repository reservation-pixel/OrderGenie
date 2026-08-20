import { PurchaseOrderStatus, WebhookOutcome } from '@prisma/client';
import { prisma } from '../../config/db';
import { logger } from '../../utils/logger';

export interface WebhookLogInput {
  rawPayload: unknown;
  petpoojaPurchaseId: string | null;
  poNumber: string | null;
  menuSharingCode: string | null;
  outcome: WebhookOutcome;
  httpStatusCode: number;
  outletId?: string | null;
  purchaseOrderId?: string | null;
  status?: PurchaseOrderStatus | null;
  writeResult?: string | null;
  failureReason?: string | null;
}

const REDACTED = '[REDACTED]';

function redactPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const p = payload as Record<string, unknown>;
  return {
    ...p,
    app_secret: p.app_secret ? REDACTED : p.app_secret,
    access_token: p.access_token ? REDACTED : p.access_token,
  };
}

/**
 * Records one row per inbound PO webhook call, success or rejected. Must never
 * throw back to its caller — a broken audit write can't be allowed to affect the
 * response Petpooja actually receives from the webhook endpoint.
 */
export async function logPurchaseOrderWebhookCall(input: WebhookLogInput): Promise<void> {
  try {
    await prisma.purchaseOrderWebhookLog.create({
      data: {
        rawPayload: redactPayload(input.rawPayload) as object,
        petpoojaPurchaseId: input.petpoojaPurchaseId,
        poNumber: input.poNumber,
        menuSharingCode: input.menuSharingCode,
        outcome: input.outcome,
        httpStatusCode: input.httpStatusCode,
        outletId: input.outletId ?? null,
        purchaseOrderId: input.purchaseOrderId ?? null,
        status: input.status ?? null,
        writeResult: input.writeResult ?? null,
        failureReason: input.failureReason ?? null,
      },
    });
  } catch (err) {
    logger.error('Failed to write purchase order webhook log', { err });
  }
}
