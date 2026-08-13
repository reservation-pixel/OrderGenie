import path from 'path';
import next from 'next';
import { env } from './config/env';
import { app } from './app';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { registerAllJobs } from './cron';
import { wireCronJobHandlers } from './cron/jobs';

// Production-only entrypoint for the single-Render-service deployment: embeds
// the built Next.js frontend inside this Node process so API + web app share
// one port/origin. Local dev is unaffected — it still runs the two apps as
// separate processes via the root `npm run dev` (see server.ts for the
// standalone backend entrypoint used there).
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '../../frontend') });
const handle = nextApp.getRequestHandler();

wireCronJobHandlers();

nextApp.prepare().then(async () => {
  app.use((req, res) => handle(req, res)); // anything not matched by /health or /api routes
  app.use(errorHandler);

  app.listen(env.PORT, async () => {
    logger.info(`OrderGenie combined server listening on port ${env.PORT}`);
    await registerAllJobs();
  });
});
