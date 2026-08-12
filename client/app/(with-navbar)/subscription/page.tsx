"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clapperboard,
  Clock3,
  Crown,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import clsx from "clsx";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import {
  formatDuration,
  type PlanId,
  type PlansResponse,
  type VideoTier,
} from "@/lib/plans";

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: { description?: string };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById("razorpay-checkout");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const packIcon = (planId: PlanId) => {
  if (planId === "starter") return <Sparkles className="h-5 w-5" />;
  if (planId === "standard") return <Clapperboard className="h-5 w-5" />;
  if (planId === "pro") return <Crown className="h-5 w-5" />;
  return <Clock3 className="h-5 w-5" />;
};

export default function Subscription() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [plans, setPlans] = useState<VideoTier[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">(
    "info",
  );

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const freeTier = plans.find((plan) => plan.isFreeTrial);
  const paidPlans = plans.filter((plan) => !plan.isFreeTrial);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(apiUrl("/api/plans"));
        if (!response.ok) throw new Error("Unable to load credit packs");
        const data = (await response.json()) as PlansResponse;
        setPlans(data.plans);
      } catch (error) {
        console.error("Plans error:", error);
        setStatus("Credit packs could not be loaded. Please refresh the page.");
        setStatusType("error");
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handlePurchase = async (plan: VideoTier) => {
    setStatus(null);
    setLoadingPlan(plan.planId);

    try {
      if (!keyId) {
        setStatus("Razorpay is not configured for this deployment.");
        setStatusType("error");
        return;
      }

      const scriptOk = await loadRazorpay();
      if (!scriptOk || !window.Razorpay) {
        setStatus("Unable to load Razorpay checkout. Please try again.");
        setStatusType("error");
        return;
      }

      const token = await getToken();
      if (!token) {
        setStatus("You must be logged in to buy credits.");
        setStatusType("error");
        return;
      }

      const orderResponse = await fetch(apiUrl("/api/payments/create-order"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.planId }),
      });
      if (!orderResponse.ok) {
        const error = await orderResponse.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create payment order.");
      }

      const order = await orderResponse.json();
      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NeuroVid AI",
        description: `${plan.label}: ${formatDuration(plan.totalSeconds)} of video credits`,
        order_id: order.orderId,
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: { color: "#7C3AED" },
        handler: async (payment) => {
          const verifyResponse = await fetch(apiUrl("/api/payments/verify"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...payment, planId: plan.planId }),
          });
          const verification = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !verification.verified) {
            setStatus(verification.error || "Payment verification failed.");
            setStatusType("error");
            return;
          }

          setStatus(
            verification.alreadyCredited
              ? "This payment was already credited to your wallet."
              : `${formatDuration(verification.creditsAdded)} added to your wallet.`,
          );
          setStatusType("success");
        },
        modal: {
          ondismiss: () => {
            setStatus("Payment cancelled. No credits were added.");
            setStatusType("info");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        setStatus(response.error?.description || "Payment failed.");
        setStatusType("error");
      });
      razorpay.open();
    } catch (error) {
      console.error("Credit purchase error:", error);
      setStatus(error instanceof Error ? error.message : "Unable to start payment.");
      setStatusType("error");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-24 pt-28 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 text-sm text-violet-300">
            <Shield className="h-4 w-4" />
            Secure one-time payments through Razorpay
          </div>
          <h1 className="text-4xl font-semibold md:text-5xl">Video credit packs</h1>
          <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
            Buy only the generation time you need. One credit equals one second
            of finished video, and purchased credits stay in your wallet until
            you use them.
          </p>
        </header>

        {freeTier && (
          <section className="mt-10 flex flex-col gap-5 border-y border-white/10 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-white">One-time free trial</p>
              <p className="mt-1 text-sm text-slate-400">
                Generate up to {formatDuration(freeTier.totalSeconds)} once per
                eligible device. No card required.
              </p>
            </div>
            <div className="text-2xl font-semibold text-violet-300">₹0</div>
          </section>
        )}

        {plansLoading ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {paidPlans.map((plan) => {
              const highlighted = plan.planId === "standard";
              return (
                <article
                  key={plan.planId}
                  className={clsx(
                    "flex min-h-80 flex-col rounded-lg border bg-white/5 p-6",
                    highlighted ? "border-violet-400/60" : "border-white/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">
                      {packIcon(plan.planId)}
                    </div>
                    {highlighted && (
                      <span className="text-xs font-medium text-violet-300">Popular</span>
                    )}
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">{plan.label}</h2>
                  <p className="mt-2 text-3xl font-semibold">₹{plan.priceINR}</p>
                  <p className="mt-1 text-sm text-slate-400">One-time purchase</p>

                  <ul className="mt-6 space-y-3 text-sm text-slate-200">
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                      {formatDuration(plan.totalSeconds)} of video credits
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                      1 credit equals 1 generated second
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                      Up to {formatDuration(plan.maxGenerationSeconds)} per generation
                    </li>
                  </ul>

                  <Button
                    className="mt-auto w-full"
                    onClick={() => handlePurchase(plan)}
                    disabled={loadingPlan === plan.planId}
                  >
                    {loadingPlan === plan.planId ? "Opening checkout..." : "Buy credits"}
                  </Button>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
          Prices shown are final checkout prices. Credits are not a recurring
          subscription and do not reset each month.
        </div>

        {status && (
          <div
            role="status"
            className={clsx(
              "mt-6 rounded-lg border p-4 text-sm",
              statusType === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
              statusType === "error" && "border-rose-500/30 bg-rose-500/10 text-rose-200",
              statusType === "info" && "border-white/10 bg-white/5 text-slate-200",
            )}
          >
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
