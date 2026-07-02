import { getAuth } from "@clerk/express";
import { verifyToken } from "@clerk/backend";
import { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  console.log("----------------------------------------");
  console.log("   AUTH MIDDLEWARE LOADED (DEBUG MODE)   ");
  console.log("----------------------------------------");
} else {
  console.log("Auth middleware loaded — production mode, test-header bypass DISABLED");
}

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

// Token or test header auth (no getAuth dependency).
// CRITICAL: the x-test-user-id bypass is ONLY honored outside production.
// Before this fix, any caller could send this header and impersonate any
// user ID, bypassing Clerk entirely — this was flagged as a launch-blocking
// vulnerability and must stay gated like this permanently, not just until
// the next refactor.
export const requireAuthTokenOrTest_DEBUG = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const testUserId = !isProduction
      ? (req.headers["x-test-user-id"] as string | undefined)
      : undefined;

    // Check Clerk auth first (populated by clerkMiddleware)
    let auth;
    try {
      auth = getAuth(req);
    } catch (e) {
      console.error("getAuth failed:", e);
    }

    if (!isProduction) {
      console.log("Auth Debug:", {
        headers: req.headers.authorization ? "Present" : "Missing",
        testUserId,
        authUserId: auth?.userId,
        clerkKeys: !!process.env.CLERK_SECRET_KEY,
      });
    }

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

    if (token && secret) {
      try {
        const verified = await verifyToken(token, { secretKey: secret });
        (req as any).auth = { userId: verified.sub };
        return next();
      } catch (err) {
        console.error("Manual verification failed:", err);
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    return res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    console.error("Auth Middleware Crash:", error);
    return res.status(500).json({ error: "Internal Server Error during Auth" });
  }
};


/**
 * Dev / Postman support ONLY. The x-test-user-id bypass is disabled
 * entirely in production — see requireAuthTokenOrTest_DEBUG above for
 * why this matters. Do not remove this guard.
 */
export const requireAuthOrTest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const testUserId = !isProduction
    ? (req.headers["x-test-user-id"] as string | undefined)
    : undefined;

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