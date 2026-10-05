import { Router } from 'express';
import { requireAuthOrTest } from '../middlewares/authMiddleware';
import { getGeneration, getGenerationStatus, getGenerationBySession, getRecentGenerations, submitGeneration } from '../controllers/generateController';
import { ensureUserExists } from '../controllers/userController';

const router = Router();

router.get('/getGeneration', requireAuthOrTest, getGeneration);
router.get("/status/:sessionId", requireAuthOrTest, getGenerationStatus);
router.get("/session/:sessionId", requireAuthOrTest, getGenerationBySession);
router.get("/recent", requireAuthOrTest, getRecentGenerations);

// Apply requireAuth to submitGeneration
router.post('/submitGeneration', requireAuthOrTest, ensureUserExists, submitGeneration)

export default router;
