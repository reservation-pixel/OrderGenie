import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import apiRoutes from './routes';

export const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', apiRoutes);
