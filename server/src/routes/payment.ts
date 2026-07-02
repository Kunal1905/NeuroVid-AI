import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { requireAuthTokenOrTest_DEBUG } from "../middlewares/authMiddleware";
import { db } from "../services/db";
import { users } from "../models/user";
import { eq } from "drizzle-orm";

const router = Router();

const plans = {
  starter: {
    id: "starter",
    name: "Starter",
    amount: 19900,
    currency: "INR",
    description: "Starter access with essential features",
    credits: 10,
  },
  pro: {
    id: "pro",
    name: "Pro",
    amount: 49900,
    currency: "INR",
    description: "Advanced access for power learners",
    credits: 50,
  },
  team: {
    id: "team",
    name: "Team",
    amount: 99900,
    currency: "INR",
    description: "Collaboration features for teams",
    credits: 200,
  },
} as const;

const createOrderSchema = z.object({
  planId: z.enum(["starter", "pro", "team"]),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  planId: z.enum(["starter", "pro", "team"]).optional(),
});

router.post("/create-order", requireAuthTokenOrTest_DEBUG, async (req, res) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request payload" });
    }

    const authUser = (req as any).auth?.userId;
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const plan = plans[parsed.data.planId];
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    console.log("🔍 Debug - Razorpay keys:");
    console.log("   keyId:", keyId ? "[SET]" : "[NOT SET]");
    console.log("   keySecret:", keySecret ? "[SET]" : "[NOT SET]");
    console.log("   All env vars present:", Object.keys(process.env));

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Razorpay keys are not configured", debug: { keyIdSet: !!keyId, keySecretSet: !!keySecret } });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const receipt = `nv_${plan.id}_${Date.now()}`;

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: plan.currency,
        receipt,
        notes: {
          planId: plan.id,
          userId: authUser,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        error: "Failed to create Razorpay order",
        details: data,
      });
    }

    return res.json({
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      planName: plan.name,
      description: plan.description,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/verify", requireAuthTokenOrTest_DEBUG, async (req, res) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request payload" });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: "Razorpay secret is not configured" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = parsed.data;
    const authUserId = (req as any).auth?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ verified: false, error: "Invalid signature" });
    }

    // Verify planId exists in plans
    const usedPlanId = planId || "starter"; // default to starter if not provided
    if (!plans[usedPlanId as keyof typeof plans]) {
      return res.status(400).json({ verified: false, error: "Invalid plan ID" });
    }
    const selectedPlan = plans[usedPlanId as keyof typeof plans];

    // Get user and update credits and plan
    if (db) {
      const [user] = await db.select().from(users).where(eq(users.clerkUserId, authUserId));
      if (!user) {
        return res.status(404).json({ verified: false, error: "User not found" });
      }

      const newCredits = (user.remainingCredits ?? 0) + selectedPlan.credits;
      await db.update(users)
        .set({
          remainingCredits: newCredits,
          plan: selectedPlan.id,
        })
        .where(eq(users.clerkUserId, authUserId));

      return res.json({
        verified: true,
        remainingCredits: newCredits,
        plan: selectedPlan.id,
        creditsAdded: selectedPlan.credits
      });
    } else {
      return res.status(503).json({ verified: true, error: "Database not available" });
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
