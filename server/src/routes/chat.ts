import { Router } from "express";
import { requireAuthOrTest } from "../middlewares/authMiddleware";
import { chatCompletion } from "../controllers/chatController";

const router = Router();

router.post("/complete", requireAuthOrTest, chatCompletion);

export default router;
