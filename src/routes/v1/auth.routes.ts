import { Router } from 'express';
import { register, login, googleOAuth, refresh, logout } from '../../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleOAuth);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
