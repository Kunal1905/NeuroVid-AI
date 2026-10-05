import "dotenv/config";
import { pool } from "../services/db";

const schemaStatements = [
  `ALTER TABLE users
   ADD COLUMN IF NOT EXISTS remaining_credits INTEGER DEFAULT 0,
   ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
   ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN DEFAULT false`,
  `ALTER TABLE users
   ALTER COLUMN remaining_credits SET DEFAULT 0`,
  `UPDATE users
   SET remaining_credits = 0
   WHERE remaining_credits IS NULL`,
  `ALTER TABLE generations
   ADD COLUMN IF NOT EXISTS routed_model VARCHAR(100),
   ADD COLUMN IF NOT EXISTS credits_charged INTEGER DEFAULT 0,
   ADD COLUMN IF NOT EXISTS is_free_trial INTEGER DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS credit_transactions (
     id SERIAL PRIMARY KEY,
     clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
     delta INTEGER NOT NULL,
     reason VARCHAR(50) NOT NULL,
     razorpay_payment_id TEXT UNIQUE,
     plan_id VARCHAR(50),
     amount_inr_paid INTEGER,
     created_at TIMESTAMP DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS free_trial_redemptions (
     id SERIAL PRIMARY KEY,
     fingerprint_hash TEXT UNIQUE NOT NULL,
     ip TEXT NOT NULL,
     clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
     created_at TIMESTAMP DEFAULT now()
   )`,
] as const;

async function ensureDatabaseSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to apply database schema updates");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of schemaStatements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
    console.log("Database schema is ready");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

ensureDatabaseSchema().catch((error) => {
  console.error("Database schema update failed:", error);
  process.exit(1);
});
