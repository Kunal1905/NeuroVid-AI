import { Router } from 'express';
import { requireAuthOrTest } from '../middlewares/authMiddleware';
import { getGeneration, getGenerationStatus, getGenerationBySession, getRecentGenerations, submitGeneration } from '../controllers/generateController';

const router = Router();

router.get('/getGeneration', requireAuthOrTest, getGeneration);
router.get("/status/:sessionId", requireAuthOrTest, getGenerationStatus);
router.get("/session/:sessionId", requireAuthOrTest, getGenerationBySession);
router.get("/recent", requireAuthOrTest, getRecentGenerations);

// Apply requireAuth to submitGeneration
router.post('/submitGeneration', requireAuthOrTest, submitGeneration)

export default router;
