"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Sparkles, Shield, Crown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useUser } from "@clerk/nextjs";
import clsx from "clsx";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type Plan = {
  id: "starter" | "pro" | "team";
  name: string;
  price: string;
  period: string;
  subtitle: string;
  features: string[];
  highlight?: boolean;
  icon: ReactNode;
};

const API_BASE = "http://localhost:3005";

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "₹199",
    period: "per month",
    subtitle: "Perfect to begin your learning streak.",
    features: [
      "10 video explanations / month",
      "Standard rendering speed",
      "Quiz summaries and recall",
      "Email support",
    ],
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹499",
    period: "per month",
    subtitle: "Unlock deeper, faster understanding.",
    features: [
      "Unlimited video explanations",
      "Priority rendering speed",
      "Advanced quizzes and analytics",
      "Chat access with study modes",
    ],
    highlight: true,
    icon: <Crown className="h-5 w-5" />,
  },
  {
    id: "team",
    name: "Team",
    price: "₹999",
    period: "per month",
    subtitle: "For teams learning together.",
    features: [
      "Everything in Pro",
      "Shared workspaces",
      "Team progress analytics",
      "Priority onboarding",
    ],
    icon: <Users className="h-5 w-5" />,
  },
];

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (document.getElementById("razorpay-checkout")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Subscription = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<Plan["id"] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

  const keyId = useMemo(() => process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, []);

  useEffect(() => {
    loadRazorpay();
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    setStatus(null);
    setStatusType("info");
    setLoadingPlan(plan.id);

    try {
      const scriptOk = await loadRazorpay();
      if (!scriptOk) {
        setStatus("Unable to load Razorpay checkout. Please try again.");
        setStatusType("error");
        return;
      }

      if (!keyId) {
        setStatus("Razorpay key is missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID.");
        setStatusType("error");
        return;
      }

      const token = await getToken();
      if (!token) {
        setStatus("You must be logged in to subscribe.");
        setStatusType("error");
        return;
      }

      const orderRes = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({}));
        setStatus(errorData.error || "Failed to create payment order.");
        setStatusType("error");
        return;
      }

      const order = await orderRes.json();
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NeuroVid AI",
        description: `${order.planName} subscription`,
        order_id: order.orderId,
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: {
          color: "#7C3AED",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch(`${API_BASE}/api/payments/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(response),
          });

          if (!verifyRes.ok) {
            const errorData = await verifyRes.json().catch(() => ({}));
            setStatus(errorData.error || "Payment verification failed.");
            setStatusType("error");
            return;
          }

          const verify = await verifyRes.json();
          if (verify.verified) {
            setStatus("Payment successful. Your subscription is now active.");
            setStatusType("success");
          } else {
            setStatus("Payment verification failed.");
            setStatusType("error");
          }
        },
        modal: {
          ondismiss: () => {
            setStatus("Payment cancelled.");
            setStatusType("info");
          },
        },
      };

      if (!window.Razorpay) {
        setStatus("Razorpay SDK not available.");
        setStatusType("error");
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setStatus(response?.error?.description || "Payment failed.");
        setStatusType("error");
      });
      rzp.open();
    } catch (error) {
      console.error("Subscription error:", error);
      setStatus("Something went wrong while starting the payment.");
      setStatusType("error");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-24">
          <div className="flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-violet-200">
              <Shield className="h-4 w-4" />
              Secure payments powered by Razorpay
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Choose a plan that grows with your learning.
            </h1>
            <p className="max-w-2xl text-base text-slate-300 md:text-lg">
              Get more clarity, more momentum, and deeper understanding with guided video explanations and
              personalized learning workflows.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={clsx(
                  "relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl",
                  plan.highlight && "border-violet-400/50 bg-gradient-to-br from-violet-500/20 via-white/5 to-white/5"
                )}
              >
                {plan.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-100">
                    Most popular
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                    <p className="text-sm text-slate-300">{plan.subtitle}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-white">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </div>
                <div className="mt-6 flex flex-col gap-3 text-sm text-slate-200">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-violet-300" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <Button
                    className={clsx(
                      "w-full rounded-full",
                      plan.highlight
                        ? "bg-violet-500 text-white hover:bg-violet-600"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? "Starting payment..." : "Subscribe"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 text-violet-300" />
              <span>Cards, UPI, and netbanking supported through Razorpay.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-violet-300" />
              <span>Cancel anytime from your profile. Your plan stays active until the end of the billing period.</span>
            </div>
          </div>

          {status && (
            <div
              className={clsx(
                "mt-6 rounded-2xl border p-4 text-sm",
                statusType === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                statusType === "error" && "border-rose-500/30 bg-rose-500/10 text-rose-200",
                statusType === "info" && "border-white/10 bg-white/5 text-slate-200"
              )}
            >
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
