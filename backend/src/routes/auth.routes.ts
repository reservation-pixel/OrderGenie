import { Router } from 'express';
import { loginHandler, meHandler } from '../controllers/auth.controller';
import { verifyJwt } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', loginHandler);
router.get('/me', verifyJwt, meHandler);

export default router;
