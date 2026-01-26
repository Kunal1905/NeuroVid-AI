import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { users } from '../models/user';
import { db } from '../services/db';
import { clerkClient } from "@clerk/clerk-sdk-node"
import { z } from 'zod';

// Get current user data
export const getUser = async (req: Request, res: Response) => {
  try {
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
    let email = "";

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
      email = parsedBody.success && parsedBody.data.email ? parsedBody.data.email : "";
      console.log('Fallback to body email:', email);
    }

    const emailSchema = z.string().email();
    const parsedEmail = emailSchema.safeParse(email);

    if (!parsedEmail.success) {
      console.error('Invalid email:', email);
      return res.status(400).json({ error: "Email is required and must be valid" });
    }

    console.log('Checking DB for user...');
    const [existingUser] = await db.select().from(users).where(eq(users.clerkUserId, authUser));
    
    if (existingUser) {
      console.log('Updating existing user...');
      const [updatedUser] = await db.update(users).set({ email: parsedEmail.data }).where(eq(users.clerkUserId, authUser)).returning();
      console.log('User updated:', updatedUser);
      return res.json(updatedUser);
    }

    console.log('Creating new user...');
    const [newUser] = await db.insert(users).values({ clerkUserId: authUser, email: parsedEmail.data }).returning();
    console.log('User created:', newUser);
    return res.status(201).json(newUser);

  } catch (error) {
    console.error("Error creating/updating user:", error);
    return res.status(500).json({ error: "Internal server error", details: (error as any)?.message });
  }
};

export const ensureUserExists = async (req: Request, res: Response, next: any) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const [user] = await db.select().from(users).where(eq(users.clerkUserId, userId));
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      const primaryId = clerkUser.primaryEmailAddressId;
      const emailObj = clerkUser.emailAddresses.find(e => e.id === primaryId) || clerkUser.emailAddresses[0];
      const email = emailObj?.emailAddress || "";
      const [newUser] = await db.insert(users).values({ clerkUserId: userId, email }).returning();
    }
    next();
  } catch (error) {
    console.error("Error ensuring user exists:", error);
    return res.status(500).json({ error: "Internal server error", details: (error as any)?.message });
  }
};
