// server/src/middlewares/rateLimit.ts
//
// Three layers of protection on the expensive endpoints:
//  1. IP-based rate limiting — stops a single source from hammering the
//     server regardless of auth state (protects against basic flood/DoS).
//  2. Authenticated-user rate limiting — stops one logged-in account from
//     submitting generation requests faster than the queue can reasonably
//     process them, even from a "legitimate" client bug or script.
//  3. A burst guard on the most expensive route (submitGeneration)
//     specifically, since that's the one that costs real money per call.
//
// Built on rate-limit-redis so these limits are SHARED across however
// many API instances you're running — an in-memory store would let
// someone bypass the limit just by hitting different instances behind
// a load balancer, which silently breaks the moment you scale past one
// process (Stage 2 in the earlier scaling roadmap).

import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Request } from "express";
import { redisConnection, redisEnabled } from "../config/redis";

function makeStore(prefix: string) {
  if (!redisEnabled || !redisConnection) return undefined; // falls back to in-memory in dev
  return new RedisStore({
    sendCommand: (...args: string[]) => (redisConnection as any).call(...args),
    prefix,
  });
}

// --- Layer 1: per-IP, applies to ALL requests on protected routes ---
// Generous enough not to block normal usage, tight enough to stop a
// flood. Tune based on real traffic once you have it.
export const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 requests/minute/IP across generate+payment routes
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:ip:"),
  message: { error: "Too many requests from this IP, please slow down." },
});

// --- Layer 2: per-authenticated-user, stricter on the expensive route ---
// Keyed on Clerk userId (set by auth middleware before this runs), not IP —
// this is what actually stops one account from spamming submitGeneration,
// independent of how many IPs they rotate through.
export const generationSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 submitGeneration calls/minute/user — well above legitimate use
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:gen:"),
  keyGenerator: (req: Request) => {
    const userId = (req as any).auth?.userId;
    return userId || req.ip || "anonymous";
  },
  message: { error: "Too many generation requests. Please wait before submitting another." },
});

// --- Layer 3: payment endpoint limiter ---
// Prevents order-creation spam (each call hits the Razorpay API, which
// has its own rate limits you don't want to exhaust) and signature-
// verification brute-forcing.
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:pay:"),
  keyGenerator: (req: Request) => {
    const userId = (req as any).auth?.userId;
    return userId || req.ip || "anonymous";
  },
  message: { error: "Too many payment requests. Please wait a moment." },
});