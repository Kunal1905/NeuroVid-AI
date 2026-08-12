import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { requireAuthTokenOrTest_DEBUG } from "../middlewares/authMiddleware";
import {
  VIDEO_TIERS,
  type PlanId,
  type VideoTier,
} from "../config/VideoTiers";
import { applyCreditPurchase } from "../services/wallet.service";

const router = Router();

type PaidPlanId = Exclude<PlanId, "free">;

const paidTiers = (Object.values(VIDEO_TIERS) as VideoTier[]).filter(
  (tier): tier is VideoTier & { planId: PaidPlanId } => !tier.isFreeTrial,
);

const plans = Object.fromEntries(
  paidTiers.map((tier) => [
    tier.planId,
    {
      id: tier.planId,
      name: tier.label,
      amount: tier.priceINR * 100,
      currency: "INR" as const,
      description: `${tier.totalSeconds} seconds of NeuroVid generation credits`,
      credits: tier.totalSeconds,
    },
  ]),
) as Record<PaidPlanId, {
  id: PaidPlanId;
  name: string;
  amount: number;
  currency: "INR";
  description: string;
  credits: number;
}>;

const isPaidPlanId = (value: string): value is PaidPlanId => value in plans;

const paidPlanIdSchema = z.string().refine(isPaidPlanId, {
  message: "Invalid plan ID",
});

const createOrderSchema = z.object({
  planId: paidPlanIdSchema,
});

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  planId: paidPlanIdSchema,
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

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Razorpay keys are not configured" });
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

    const selectedPlan = plans[planId];
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      return res.status(500).json({ error: "Razorpay key is not configured" });
    }

    const orderResponse = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        },
      },
    );
    const order = await orderResponse.json().catch(() => ({}));
    if (
      !orderResponse.ok ||
      order.amount !== selectedPlan.amount ||
      order.currency !== selectedPlan.currency ||
      order.notes?.planId !== selectedPlan.id ||
      order.notes?.userId !== authUserId
    ) {
      return res.status(400).json({
        verified: false,
        error: "Payment order does not match the selected credit pack",
      });
    }

    const purchase = await applyCreditPurchase({
      clerkUserId: authUserId,
      credits: selectedPlan.credits,
      amountInrPaid: selectedPlan.amount / 100,
      razorpayPaymentId: razorpay_payment_id,
      planId: selectedPlan.id,
    });

    return res.json({
      verified: true,
      plan: selectedPlan.id,
      creditsAdded: purchase.alreadyCredited ? 0 : selectedPlan.credits,
      alreadyCredited: purchase.alreadyCredited,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
