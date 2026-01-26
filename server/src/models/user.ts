import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  email: text('email').notNull(),
  testPassed: boolean('test_passed').default(false),  // For unlocking generate/chat
  createdAt: timestamp('created_at').defaultNow(),
});