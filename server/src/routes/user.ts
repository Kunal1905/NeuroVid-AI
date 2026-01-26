import { Router } from 'express';
import { requireAuthOrTest, requireAuthTokenOrTest } from '../middlewares/authMiddleware';
import { getUser, createOrUpdateUser, ensureUserExists } from '../controllers/userController';

const router = Router();

// Debug incoming headers
router.use((req, _res, next) => {
  console.log('User routes headers:', req.headers);
  next();
});

// Protected: Get current user data
router.get('/me', requireAuthOrTest, ensureUserExists, getUser);

// Create/update user on first login (call from client post-signup)
router.post('/create', requireAuthTokenOrTest, createOrUpdateUser);

export default router;
