import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { requireAuthTokenOrTest_DEBUG } from "../middlewares/authMiddleware";

const router = Router();

const plans = {
  starter: {
    id: "starter",
    name: "Starter",
    amount: 19900,
    currency: "INR",
    description: "Starter access with essential features",
  },
  pro: {
    id: "pro",
    name: "Pro",
    amount: 49900,
    currency: "INR",
    description: "Advanced access for power learners",
  },
  team: {
    id: "team",
    name: "Team",
    amount: 99900,
    currency: "INR",
    description: "Collaboration features for teams",
  },
} as const;

const createOrderSchema = z.object({
  planId: z.enum(["starter", "pro", "team"]),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

router.post("/create-order", requireAuthTokenOrTest_DEBUG, async (req, res) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request payload" });
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ verified: false, error: "Invalid signature" });
    }

    return res.json({ verified: true });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
