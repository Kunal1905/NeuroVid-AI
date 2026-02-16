import { getAuth } from "@clerk/express";
import { verifyToken } from "@clerk/backend";
import { Request, Response, NextFunction } from "express";

console.log("----------------------------------------");
console.log("   AUTH MIDDLEWARE LOADED (DEBUG MODE)   ");
console.log("----------------------------------------");

// Strict auth (real users only)
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  (req as any).auth = auth;
  next();
};

// Token or test header auth (no getAuth dependency)
export const requireAuthTokenOrTest_DEBUG = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const testUserId = req.headers["x-test-user-id"] as string | undefined;

    // Check Clerk auth first (populated by clerkMiddleware)
    let auth;
    try {
      auth = getAuth(req);
    } catch (e) {
      console.error("getAuth failed:", e);
    }

    console.log("Auth Debug:", {
      headers: req.headers.authorization ? "Present" : "Missing",
      testUserId,
      authUserId: auth?.userId,
      clerkKeys: !!process.env.CLERK_SECRET_KEY,
    });

    if (testUserId) {
      (req as any).auth = { userId: testUserId };
      return next();
    }

    if (auth?.userId) {
      (req as any).auth = auth;
      return next();
    }

    // Fallback to manual verification if needed
    const secret = process.env.CLERK_SECRET_KEY;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    
    if (token) {
      console.log("Attempting manual token verification...");
    }

    if (token && secret) {
      try {
        const verified = await verifyToken(token, { secretKey: secret });
        console.log("Manual verification success:", verified.sub);
        (req as any).auth = { userId: verified.sub };
        return next();
      } catch (err) {
        console.error("Manual verification failed:", err);
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    console.log("Auth failed: No valid auth method found");
    return res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    console.error("Auth Middleware Crash:", error);
    return res.status(500).json({ error: "Internal Server Error during Auth" });
  }
};


/**
 * Dev / Postman support
 * Allows fake header OR real Clerk auth
 */
export const requireAuthOrTest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const testUserId = req.headers["x-test-user-id"] as string | undefined;

  // ✅ allow fake user in dev tools
  if (testUserId) {
    (req as any).auth = { userId: testUserId };
    return next();
  }

  const auth = getAuth(req);

  if (!auth?.userId) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  (req as any).auth = auth;
  next();
};
