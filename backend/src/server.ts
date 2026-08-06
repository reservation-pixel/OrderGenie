import { env } from './config/env';
import { app } from './app';
import { logger } from './utils/logger';
import { registerAllJobs } from './cron';
import { wireCronJobHandlers } from './cron/jobs';

wireCronJobHandlers();

app.listen(env.PORT, async () => {
  logger.info(`OrderGenie backend listening on port ${env.PORT}`);
  await registerAllJobs();
});
