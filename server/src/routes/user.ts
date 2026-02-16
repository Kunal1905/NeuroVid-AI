import { Router } from 'express';
import { requireAuth, requireAuthOrTest, requireAuthTokenOrTest_DEBUG } from '../middlewares/authMiddleware';
import { getUser, createOrUpdateUser, ensureUserExists, getUserStats } from '../controllers/userController';

const router = Router();

// Debug incoming headers
router.use((req, _res, next) => {
  console.log('User routes headers (RELOADED):', req.headers);
  console.log(req.headers.authorization);
  next();
});

// Protected: Get current user data
router.get('/me', requireAuthOrTest, ensureUserExists, getUser);

// Protected: Get user stats
router.get('/stats', requireAuthOrTest, getUserStats);

// Create/update user on first login (call from client post-signup)
router.post('/create', requireAuthTokenOrTest_DEBUG, createOrUpdateUser);

export default router;
