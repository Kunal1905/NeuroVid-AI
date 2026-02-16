import { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { users } from '../models/user';
import { generations } from '../models/generate';
import { db } from '../services/db';
import { clerkClient } from "@clerk/clerk-sdk-node"
import { z } from 'zod';

// Get current user stats
export const getUserStats = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Database disabled", details: "Set DATABASE_URL in .env" });
    }
    let authUser = (req as any).auth?.userId;

    // Fallback: allow testing via header
    if (!authUser) {
      const testUserId = req.headers['x-test-user-id'] as string | undefined;
      if (testUserId) {
        authUser = testUserId;
      }
    }

    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Count generations
    const genCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .where(eq(generations.userId, authUser));
      
    const videoCount = Number(genCountResult[0]?.count || 0);

    // Calculate derived stats
    const xp = videoCount * 150; // 150 XP per video
    const level = Math.floor(xp / 1000) + 1;
    
    // Mock other stats for now (until we have quiz results table)
    const streak = videoCount > 0 ? 1 : 0; // Simple mock
    const quizzes = videoCount; // Assume 1 quiz per video
    const avgScore = videoCount > 0 ? 85 : 0; // Mock score

    res.json({
      xp: xp.toLocaleString(),
      level,
      streak: `${streak} days`,
      videos: videoCount,
      quizzes,
      avgScore: `${avgScore}%`
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user data
export const getUser = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Database disabled", details: "Set DATABASE_URL in .env" });
    }
    const authUser = (req as any).auth?.userId;

    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkUserId, authUser));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create or update user on first login
export const createOrUpdateUser = async (req: Request, res: Response) => {
  console.log('createOrUpdateUser called');
  try {
    if (!db) {
      return res.status(503).json({ error: "Database disabled", details: "Set DATABASE_URL in .env" });
    }
    let authUser = (req as any).auth?.userId;
    console.log('Auth User ID:', authUser);

    // Fallback: allow testing via header
    if (!authUser) {
      const testUserId = req.headers['x-test-user-id'] as string | undefined;
      if (testUserId) {
        authUser = testUserId;
        console.log('Using test user ID:', authUser);
      }
    }

    if (!authUser) {
      console.error('No auth user ID found');
      return res.status(401).json({ error: "Authentication required" });
    }

    const bodySchema = z.object({ email: z.string().email().optional() });
    const parsedBody = bodySchema.safeParse(req.body);
    let email = parsedBody.success && parsedBody.data.email ? parsedBody.data.email : "";
    console.log('Body email (if provided):', email);

    const isTestUser = String(authUser).startsWith('test_');

    // If email not provided in body, attempt to fetch from Clerk ONLY when authUser is a real Clerk userId
    if (!email && !isTestUser) {
      try {
        console.log('Fetching user from Clerk...');
        const clerkUser = await clerkClient.users.getUser(authUser);
        console.log('Clerk user found:', clerkUser.id);
        const primaryId = clerkUser.primaryEmailAddressId;
        const emailObj = clerkUser.emailAddresses.find(e => e.id === primaryId) || clerkUser.emailAddresses[0];
        email = emailObj?.emailAddress || "";
        console.log('Email from Clerk:', email);
      } catch (clerkError) {
        console.error('Error fetching from Clerk:', clerkError);
      }
    }

    if (!email && isTestUser) {
      email = `${authUser}@test.local`;
    }

    const emailSchema = z.string().email();
    const parsedEmail = emailSchema.safeParse(email);

    if (!parsedEmail.success) {
      console.error('Invalid email:', email);
      return res.status(400).json({ error: "Email is required and must be valid" });
    }

    console.log('Upserting user...');
    const upserted: any = await db.insert(users)
      .values({ clerkUserId: authUser, email: parsedEmail.data })
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: { email: parsedEmail.data }
      })
      .returning();

    const userRow = upserted[0];
    console.log('User upserted:', userRow);
    return res.status(201).json({
      id: userRow.id,
      clerkUserId: userRow.clerkUserId,
      email: userRow.email,
      testPassed: userRow.testPassed ?? false,
      createdAt: userRow.createdAt,   
    });

  } catch (error) {
    console.error("Error creating/updating user:", error);
    return res.status(500).json({ error: "Internal server error", details: (error as any)?.message });
  }
};

export const ensureUserExists = async (req: Request, res: Response, next: any) => {
  try {
    if (!db) return res.status(503).json({ error: "Database disabled", details: "Set DATABASE_URL in .env" });
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const [user] = await db.select().from(users).where(eq(users.clerkUserId, userId));
    if (!user) {
      let email = `${userId}@test.local`;
      if (!String(userId).startsWith('test_')) {
        const clerkUser = await clerkClient.users.getUser(userId);
        const primaryId = clerkUser.primaryEmailAddressId;
        const emailObj = clerkUser.emailAddresses.find(e => e.id === primaryId) || clerkUser.emailAddresses[0];
        email = emailObj?.emailAddress || "";
      }
      await db.insert(users).values({ clerkUserId: userId, email }).returning();
    }
    next();
  } catch (error) {
    console.error("Error ensuring user exists:", error);
    return res.status(500).json({ error: "Internal server error", details: (error as any)?.message });
  }
};
