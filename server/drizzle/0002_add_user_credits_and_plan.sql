
ALTER TABLE users
ADD COLUMN IF NOT EXISTS remaining_credits INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN DEFAULT false;

ALTER TABLE generations
ADD COLUMN IF NOT EXISTS routed_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS credits_charged INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_free_trial INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,
  razorpay_payment_id TEXT UNIQUE,
  plan_id VARCHAR(50),
  amount_inr_paid INTEGER,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS free_trial_redemptions (
  id SERIAL PRIMARY KEY,
  fingerprint_hash TEXT UNIQUE NOT NULL,
  ip TEXT NOT NULL,
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now()
);
