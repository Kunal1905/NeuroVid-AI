import { clerkMiddleware, getAuth } from '@clerk/express';
import { verifyToken } from '@clerk/backend';
import { Request, Response, NextFunction } from 'express';

// Global Clerk middleware to register before any route uses getAuth/requireAuth
export const clerkAuth = clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Strict auth (requires logged-in user)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  (req as any).auth = auth;
  next();
};

// Auth OR test header (for Postman / local testing)
export const requireAuthOrTest = (req: Request, res: Response, next: NextFunction) => {
  const testUserId = req.headers['x-test-user-id'] as string | undefined;
  if (!testUserId) {
    console.log('Auth middleware headers:', req.headers);
  }
  if (testUserId) {
    (req as any).auth = { userId: testUserId };
    return next();
  }
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  (req as any).auth = auth;
  next();
};

// Auth via Bearer token or test header
export const requireAuthTokenOrTest = async (req: Request, res: Response, next: NextFunction) => {
  const testUserId = req.headers['x-test-user-id'] as string | undefined;
  if (testUserId) {
    (req as any).auth = { userId: testUserId };
    return next();
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    (req as any).auth = { userId: verified.sub };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
