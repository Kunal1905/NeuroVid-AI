CREATE TYPE "public"."generation_status" AS ENUM('CREATED', 'GENERATING', 'SCRIPT_READY', 'VIDEO_RENDERING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"test_passed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "brain_dominance_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"left_score" integer DEFAULT 0 NOT NULL,
	"right_score" integer DEFAULT 0 NOT NULL,
	"dominant_quadrant" text DEFAULT 'none' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"text" text NOT NULL,
	"details" text,
	"category" varchar(100),
	"language" varchar(10) DEFAULT 'en',
	"duration" integer NOT NULL,
	"style" varchar NOT NULL,
	"status" "generation_status" DEFAULT 'CREATED' NOT NULL,
	"progress" integer DEFAULT 0,
	"script" jsonb,
	"scenes" jsonb,
	"quiz" jsonb,
	"video_url" text,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brain_dominance_surveys" ADD CONSTRAINT "brain_dominance_surveys_user_id_users_clerk_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_user_id_users_clerk_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_style_brain_dominance_surveys_dominant_quadrant_fk" FOREIGN KEY ("style") REFERENCES "public"."brain_dominance_surveys"("dominant_quadrant") ON DELETE no action ON UPDATE no action;