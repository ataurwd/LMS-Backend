import { Router } from 'express';
import { register, login, googleOAuth } from '../../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleOAuth);

export default router;
