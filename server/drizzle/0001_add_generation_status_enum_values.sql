-- Migration to add missing enum values to generation_status
-- This migration adds the required production enum values without dropping existing ones

-- Add missing enum values to generation_status
ALTER TYPE generation_status ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE generation_status ADD VALUE IF NOT EXISTS 'GENERATING_SCRIPT';
ALTER TYPE generation_status ADD VALUE IF NOT EXISTS 'GENERATING_QUIZ';
ALTER TYPE generation_status ADD VALUE IF NOT EXISTS 'GENERATING_VIDEO';
ALTER TYPE generation_status ADD VALUE IF NOT EXISTS 'COMPLETED';