import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function test() {
  const result = await sql`SELECT 1`;
  console.log('DB connected:', result);
}

test().catch(console.error);
