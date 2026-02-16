import dotenv from "dotenv";

dotenv.config();

async function testStats() {
  console.log("Testing /api/users/stats with Test Header...");
  try {
    const res = await fetch("http://localhost:3005/api/users/stats", {
      method: "GET",
      headers: {
        "x-test-user-id": "test_user_123",
      },
    });
    console.log("Stats Response Status:", res.status);
    console.log("Stats Response Body:", await res.json());
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

testStats();