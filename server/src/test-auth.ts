import { verifyToken } from "@clerk/backend";
import dotenv from "dotenv";

dotenv.config();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY is missing");
  process.exit(1);
}

// Function to simulate a request
async function testAuth() {
  console.log("Testing with Invalid Token...");
  try {
    const res = await fetch("http://localhost:3005/api/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_token",
      },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    console.log("Invalid Token Response:", res.status, await res.json());
  } catch (e) {
    console.error("Fetch failed:", e);
  }

  console.log("\nTesting with Test Header...");
  try {
    const res = await fetch("http://localhost:3005/api/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": "test_user_123",
      },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    console.log("Test Header Response:", res.status, await res.json());
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

testAuth();
