import { env } from './config/env';
import { app } from './app';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { registerAllJobs } from './cron';
import { wireCronJobHandlers } from './cron/jobs';

app.use(notFoundHandler);
app.use(errorHandler);

wireCronJobHandlers();

app.listen(env.PORT, async () => {
  logger.info(`OrderGenie backend listening on port ${env.PORT}`);
  await registerAllJobs();
});
