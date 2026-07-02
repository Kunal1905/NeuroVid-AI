// ============================================================
// server/src/services/wallet.service.ts
//
// Every credit movement in the system goes through this file.
// Nothing else should touch the credits column or the
// credit_transactions / free_trial_redemptions tables directly.
//
// CREDIT MODEL: 1 credit = 1 second of video.
//   Buying "Standard" (90s) → +90 credits
//   Generating a 6s clip    → -6 credits
//
// KEY DESIGN DECISIONS:
//
// 1. SELECT ... FOR UPDATE (row-level lock)
//    reserveCreditsForGeneration holds a pg row lock for the
//    duration of the transaction. This is what prevents two
//    simultaneous requests from both reading "balance: 10" and
//    both being allowed to spend 8 — without the lock, that
//    race lets a user spend more than they have.
//
// 2. Append-only credit_transactions ledger
//    Every movement (purchase, spend, refund) writes a row.
//    The users.credits column is the fast running total;
//    credit_transactions is the audit trail you reconcile
//    against MiniMax invoices to catch margin drift early.
//
// 3. applyCreditPurchase idempotency
//    Razorpay webhooks and client retries can fire the same
//    payment_id twice. The UNIQUE constraint on
//    credit_transactions.razorpay_payment_id means the second
//    INSERT throws a 23505 (unique_violation) which we catch
//    and treat as success — the user never double-credits.
//
// 4. refundCredits is ONLY called on truly final failure
//    The worker guards this with attemptsMade >= maxAttempts
//    so retrying jobs don't refund prematurely. See
//    generation.worker.ts for that guard.
// ============================================================

import { pool } from "../services/db";
import crypto from "crypto";

// ── Free-trial fingerprinting ────────────────────────────────

/**
 * Combines device fingerprint (from FingerprintJS on the client)
 * and the request IP into a single SHA-256 hash stored in
 * free_trial_redemptions. This means:
 *   - Clearing cookies / making a new account on the SAME device+IP
 *     does NOT get a second free video.
 *   - A different device on the same IP (family sharing) DOES get
 *     a free video — intentional; this is a household, not a spammer.
 *
 * Not bulletproof: VPNs + incognito bypass this. Treat it as a
 * friction layer that stops casual abuse, not a hard guarantee.
 * The ₹47 max loss per bypassed free tier is your acceptable floor.
 */
export function hashFingerprint(fingerprint: string, ip: string): string {
  return crypto
    .createHash("sha256")
    .update(`${fingerprint}:${ip}`)
    .digest("hex");
}

/**
 * Checks whether this device+IP fingerprint has already redeemed
 * a free video. Called BEFORE creating the generation record so we
 * fail fast without touching the generations table.
 */
export async function hasUsedFreeTrial(fingerprintHash: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM free_trial_redemptions
       WHERE fingerprint_hash = $1
       LIMIT 1`,
      [fingerprintHash]
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

/**
 * Atomically inserts into free_trial_redemptions AND sets
 * users.free_trial_used = true in one transaction.
 *
 * The UNIQUE constraint on fingerprint_hash is the real enforcement
 * mechanism — the INSERT either succeeds once or throws 23505 on a
 * race (two tabs submitting simultaneously). We catch 23505 and
 * return { ok: false } so the controller can roll back the
 * generation record and return 429 cleanly.
 */
export async function redeemFreeTrial(params: {
  fingerprintHash: string;
  ip: string;
  clerkUserId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO free_trial_redemptions
         (fingerprint_hash, ip, clerk_user_id)
       VALUES ($1, $2, $3)`,
      [params.fingerprintHash, params.ip, params.clerkUserId]
    );

    await client.query(
      `UPDATE users
       SET free_trial_used = true
       WHERE clerk_user_id = $1`,
      [params.clerkUserId]
    );

    await client.query("COMMIT");
    return { ok: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      // unique_violation — fingerprint already redeemed
      return { ok: false, reason: "free_trial_already_used" };
    }
    throw err; // unexpected DB error — let it bubble up as 500
  } finally {
    client.release();
  }
}

// ── Credit reservation (paid path) ──────────────────────────

/**
 * Atomically checks the user's credit balance and deducts
 * creditsNeeded in one serialisable transaction.
 *
 * WHY SELECT ... FOR UPDATE:
 * Without a row lock, two simultaneous submitGeneration requests
 * for the same user both read the same balance (e.g. 10), both
 * pass the "10 >= 6" check, and both deduct 6 — ending up at -2
 * instead of 4. The FOR UPDATE lock means the second transaction
 * blocks until the first commits, then re-reads the updated balance.
 *
 * Returns:
 *   { ok: true, remainingCredits }  on success
 *   { ok: false, reason }           on insufficient balance or missing user
 */
export async function reserveCreditsForGeneration(params: {
  clerkUserId: string;
  creditsNeeded: number;
  sessionId: string; // for logging/audit only
}): Promise<{ ok: true; remainingCredits: number } | { ok: false; reason: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT remaining_credits
       FROM users
       WHERE clerk_user_id = $1
       FOR UPDATE`,
      [params.clerkUserId]
    );

    if ((result.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "user_not_found" };
    }

    const currentCredits: number = result.rows[0].remaining_credits ?? 0;

    if (currentCredits < params.creditsNeeded) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        reason: "insufficient_credits",
      };
    }

    const newBalance = currentCredits - params.creditsNeeded;

    await client.query(
      `UPDATE users
       SET remaining_credits = $1
       WHERE clerk_user_id = $2`,
      [newBalance, params.clerkUserId]
    );

    // Append to audit ledger — delta is negative (spend)
    await client.query(
      `INSERT INTO credit_transactions
         (clerk_user_id, delta, reason)
       VALUES ($1, $2, 'generation_spend')`,
      [params.clerkUserId, -params.creditsNeeded]
    );

    await client.query("COMMIT");
    return { ok: true, remainingCredits: newBalance };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ── Credit refund (called by worker on final failure) ────────

/**
 * Refunds credits to the user when a generation job fails on its
 * FINAL retry attempt. The worker is responsible for only calling
 * this once — see the attemptsMade guard in generation.worker.ts.
 *
 * This is a real-money operation. If it throws, the error is logged
 * with 🚨 in the worker so you can manually reconcile. Consider
 * alerting (Sentry, PagerDuty) on this error class in production.
 */
export async function refundCredits(params: {
  clerkUserId: string;
  credits: number;
  sessionId?: string; // optional, for log correlation
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET remaining_credits = remaining_credits + $1
       WHERE clerk_user_id = $2`,
      [params.credits, params.clerkUserId]
    );

    // delta is positive (credit restored)
    await client.query(
      `INSERT INTO credit_transactions
         (clerk_user_id, delta, reason)
       VALUES ($1, $2, 'refund')`,
      [params.clerkUserId, params.credits]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ── Credit purchase (called after Razorpay verify) ───────────

/**
 * Credits the user's wallet after a successful Razorpay payment.
 * This is the function the /verify route was MISSING before — it
 * was returning { verified: true } with no side effect, meaning
 * paying users never actually received credits.
 *
 * IDEMPOTENCY: The UNIQUE constraint on
 * credit_transactions.razorpay_payment_id means if Razorpay fires
 * a webhook twice (or the client retries /verify), the second call
 * hits a 23505 unique_violation which we catch and treat as success.
 * The user never gets double-credited.
 *
 * amountInrPaid should be the ACTUAL amount Razorpay charged
 * (in rupees, not paise) — used for weekly revenue reconciliation
 * against MiniMax invoices.
 */
export async function applyCreditPurchase(params: {
  clerkUserId: string;
  credits: number;           // seconds unlocked (= tier.totalSeconds)
  amountInrPaid: number;     // in ₹ (not paise)
  razorpayPaymentId: string; // UNIQUE — idempotency key
  planId: string;
}): Promise<{ credited: boolean; alreadyCredited: boolean }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET remaining_credits = remaining_credits + $1
       WHERE clerk_user_id = $2`,
      [params.credits, params.clerkUserId]
    );

    await client.query(
      `INSERT INTO credit_transactions
         (clerk_user_id, delta, reason,
          razorpay_payment_id, plan_id, amount_inr_paid)
       VALUES ($1, $2, 'purchase', $3, $4, $5)`,
      [
        params.clerkUserId,
        params.credits,
        params.razorpayPaymentId,
        params.planId,
        params.amountInrPaid,
      ]
    );

    await client.query("COMMIT");
    return { credited: true, alreadyCredited: false };
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      // Payment already processed — idempotent success
      return { credited: false, alreadyCredited: true };
    }
    throw err;
  } finally {
    client.release();
  }
}

// ── Balance query (for UI display) ──────────────────────────

/**
 * Returns the user's current credit balance (= seconds remaining).
 * Used by dashboard and the generate page to show "X seconds left".
 * Does NOT use a lock — this is a read-only display query.
 */
export async function getBalance(clerkUserId: string): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT remaining_credits FROM users WHERE clerk_user_id = $1`,
      [clerkUserId]
    );
    if ((result.rowCount ?? 0) === 0) return 0;
    return result.rows[0].remaining_credits as number;
  } finally {
    client.release();
  }
}
