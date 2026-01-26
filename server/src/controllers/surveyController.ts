import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { brainDominanceSurveys } from '../models/survey';
import { db } from '../services/db';

// get current user's brain dominance
export const getSurvey = async (req: Request, res: Response) => {
  try {
    let authUser = (req as any).auth?.userId;

    // DEBUG: Allow testing without Auth middleware
    if (!authUser) {
      const testUserId = req.headers['x-test-user-id'] as string;
      if (testUserId) {
          authUser = testUserId;
          console.log(`✅ Using test user ID: ${authUser}`);
      }
    }

    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
  const [surveyData] = await db.select().from(brainDominanceSurveys).where(eq(brainDominanceSurveys.userId, authUser)).limit(1);

  if (!surveyData) {
      return res.status(404).json({ error: 'Brain Dominance survey must be completed first' });
    }
    res.json(surveyData);

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const submitSurvey = async (req: Request, res: Response) => {
  try {
    console.log('submitSurvey called - body:', req.body);  // Debug request
    let authUserId = (req as any).auth?.userId;

    // DEBUG: Allow testing without Auth middleware
    if (!authUserId) {
      const testUserId = req.headers['x-test-user-id'] as string;
      if (testUserId) {
          authUserId = testUserId;
          console.log(`✅ Using test user ID: ${authUserId}`);
      }
    }

    if (!authUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { leftScore, rightScore, dominantQuadrant } = req.body;

    console.log('Validating input...');  // Debug
    if (
      typeof leftScore !== 'number' || leftScore < 0 || leftScore > 100 ||
      typeof rightScore !== 'number' || rightScore < 0 || rightScore > 100
    ) {
      return res.status(400).json({ error: 'Invalid score values provided (must be numbers between 0-15)' });
    }

    const validDominants = ['left', 'right', 'balanced', 'none'];
    if (!validDominants.includes(dominantQuadrant)) {
      return res.status(400).json({ error: 'Invalid dominant quadrant value provided' });
    }

    console.log('Querying existing survey...');  // Debug
    const existing = await db
      .select()
      .from(brainDominanceSurveys)
      .where(eq(brainDominanceSurveys.userId, authUserId));

    console.log('Existing survey found:', existing.length > 0);  // Debug

    if (existing.length > 0) {
      return res.status(403).json({ message: 'Brain dominance survey already completed' });
    } else {
      await db.insert(brainDominanceSurveys).values({
        userId: authUserId,
        leftScore,
        rightScore,
        dominantQuadrant,
        completedAt: new Date(),
      });
      return res.status(201).json({ message: 'Survey submitted successfully' });
    }
  } catch (error) {
    console.error('Error in submitSurvey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};