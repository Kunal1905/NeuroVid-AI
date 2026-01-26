import { Router } from 'express';
import { requireAuthOrTest } from '../middlewares/authMiddleware';
import { getGeneration, submitGeneration } from '../controllers/generateController';

const router = Router();

router.get('/getGeneration', requireAuthOrTest, getGeneration);

// Apply requireAuth to submitGeneration
router.post('/submitGeneration', requireAuthOrTest, submitGeneration)

export default router;
