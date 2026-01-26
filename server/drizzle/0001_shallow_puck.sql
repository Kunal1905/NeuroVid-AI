ALTER TABLE "generations" RENAME COLUMN "id" TO "sessionId";--> statement-breakpoint
ALTER TABLE "generations" ALTER COLUMN "details" SET NOT NULL;