import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set in .env');
}

console.log('Connecting to DB...');  // Debug
const sql = neon(process.env.DATABASE_URL, { 
  fetchOptions: {  // Add timeout
    signal: AbortSignal.timeout(10000)  // 10s timeout
  } 
});
export const db = drizzle(sql);

// Test connection on load
(async () => {
  try {
    await sql`SELECT 1`;  // Simple test query
    console.log('DB connection successful');
  } catch (err) {
    console.error('DB connection failed:', err);
  }
})();