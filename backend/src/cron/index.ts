import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { SyncType } from '@prisma/client';
import { prisma } from '../config/db';
import { CRON_TIMEZONE } from '../config/constants';
import { logger } from '../utils/logger';

type JobHandler = () => Promise<void>;

const jobRegistry = new Map<SyncType, ScheduledTask>();

// Replaced with real sync service calls once the Petpooja sync services exist (see src/services/sync/*).
const jobHandlers: Record<SyncType, JobHandler> = {
  SALES: async () => logger.info('[cron] SALES sync tick (handler not yet wired)'),
  INVENTORY: async () => logger.info('[cron] INVENTORY sync tick (handler not yet wired)'),
  PURCHASE: async () => logger.info('[cron] PURCHASE sync tick (handler not yet wired)'),
  HISTORICAL: async () => logger.info('[cron] HISTORICAL sync tick (handler not yet wired)'),
  TRANSFER: async () => logger.info('[cron] TRANSFER sync tick (handler not yet wired)'),
};

export function setJobHandler(syncType: SyncType, handler: JobHandler) {
  jobHandlers[syncType] = handler;
}

async function registerJob(syncType: SyncType) {
  const schedule = await prisma.syncSchedule.findUnique({ where: { syncType } });
  if (!schedule || !schedule.isEnabled) return;

  const task = cron.schedule(
    schedule.cronExpression,
    async () => {
      try {
        await jobHandlers[syncType]();
        await prisma.syncSchedule.update({ where: { syncType }, data: { lastRunAt: new Date() } });
      } catch (err) {
        logger.error(`[cron] ${syncType} job failed`, { err });
      }
    },
    { timezone: CRON_TIMEZONE }
  );

  jobRegistry.set(syncType, task);
  logger.info(`[cron] Registered ${syncType} job: ${schedule.cronExpression}`);
}

export async function registerAllJobs() {
  for (const syncType of Object.values(SyncType)) {
    await registerJob(syncType);
  }
}

export async function rescheduleJob(syncType: SyncType) {
  const existing = jobRegistry.get(syncType);
  if (existing) {
    existing.stop();
    jobRegistry.delete(syncType);
  }
  await registerJob(syncType);
}
