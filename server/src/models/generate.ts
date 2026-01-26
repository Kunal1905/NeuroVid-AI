import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { brainDominanceSurveys } from "./survey";

export const generationStatusEnum = pgEnum("generation_status", [
  "CREATED",
  "GENERATING",
  "SCRIPT_READY",
  "VIDEO_RENDERING",
  "READY",
  "FAILED",
]);


export const generations = pgTable('generations', {
  sessionId: varchar('sessionId', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),

  userId: varchar('user_id').notNull().references(() => users.clerkUserId, { onDelete: 'cascade' }),  

  //input
  topic: text("text").notNull(),
  details: text("details").notNull(),
  category: varchar("category", { length: 100}),
  language: varchar("language", { length: 10}).default("en"),
  duration: integer("duration").notNull(),
  style: varchar("style").notNull().references(() => brainDominanceSurveys.dominantQuadrant),

  //state
  status: generationStatusEnum("status").notNull().default("CREATED"),
  progress: integer("progress").default(0),

  //AI outputs 
  script: jsonb("script"),
  scenes: jsonb("scenes"),
  quiz: jsonb("quiz"),

  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),

  createdAt: timestamp('created_at', { withTimezone:true}).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone:true}).defaultNow().notNull(),
});