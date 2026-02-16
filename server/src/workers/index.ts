import 'dotenv/config';
import { generationWorker } from './generation.worker';

console.log('🚀 Generation workers started...');
console.log('📋 Worker configuration:');
console.log('   - Concurrency: 2 jobs');
console.log('   - Rate limit: 5 jobs per minute');
console.log('   - Max retries: 3');
console.log('   - Backoff: exponential (8s base delay)');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await generationWorker.worker.close();
  console.log('✅ Worker closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await generationWorker.worker.close();
  console.log('✅ Worker closed');
  process.exit(0);
});