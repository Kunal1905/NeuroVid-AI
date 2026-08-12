import { Router } from "express";
import { getPlans } from "../controllers/plansController";

const router = Router();

router.get("/", getPlans);

export default router;
