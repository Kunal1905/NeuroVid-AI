import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user';  // Adjust import path as needed (assuming user model is in the same folder)

export const brainDominanceSurveys = pgTable('brain_dominance_surveys', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.clerkUserId, { onDelete: 'cascade' }),  // Foreign key to users.clerkUserId
  leftScore: integer('left_score').notNull().default(0),  // Combined score/percentage for left-brain (analytical + practical, 0-100)
  rightScore: integer('right_score').notNull().default(0),  // Combined score/percentage for right-brain (relational + experimental, 0-100)
  dominantQuadrant: text('dominant_quadrant').notNull().default('none'),  // 'left', 'right', 'balanced', or 'none' (default if not taken)
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});