import { pgTable, serial, text, boolean, timestamp, integer, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  email: text('email').notNull(),
  testPassed: boolean('test_passed').default(false),  // For unlocking generate/chat
  remainingCredits: integer('remaining_credits').default(0), // Paid wallet; free trial is tracked separately
  plan: varchar('plan', { length: 50 }).default('free'),
  freeTrialUsed: boolean('free_trial_used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
