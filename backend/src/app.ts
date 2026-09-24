import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import apiRoutes from './routes';
import { activityLogger } from './middleware/activityLog.middleware';

export const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// In front of the whole API so every mutating endpoint is audited, including future ones.
app.use('/api', activityLogger, apiRoutes);
