import { Router } from 'express';
import { requireAuthOrTest } from '../middlewares/authMiddleware';
import { getSurvey } from '../controllers/surveyController';
import { submitSurvey } from '../controllers/surveyController';

const router = Router();

// Get current user data
router.get('/surveyData', requireAuthOrTest, getSurvey);

router.post('/submitSurvey', requireAuthOrTest, submitSurvey)

export default router;
