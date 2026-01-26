require('dotenv').config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import userRoutes from './routes/user';
import surveyRoutes from "./routes/survey";
import generationRoutes from "./routes/generate"
import { clerkAuth } from './middlewares/authMiddleware';

console.log('Starting server setup...');  // Debug: Start

const app = express();
const PORT = 3005;
console.log('PORT value:', PORT);

console.log('Configuring middleware...');  // Debug: Middleware
// CORS FIRST so preflight succeeds before any other middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.options('*', cors());
// Register Clerk middleware after CORS, before routes
app.use(clerkAuth);
app.use(express.json());

// JSON parsing error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    console.error('Bad JSON:', err.message);
    return res.status(400).json({ error: 'Invalid JSON format', details: err.message });
  }
  next();
});

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

console.log('Mounting routes...');  // Debug: Routes
app.use('/api/users', userRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/generate', generationRoutes);

console.log('Setting up health checks...');  // Debug: Endpoints
app.get('/', (req: Request, res: Response) => {
  res.send('Neuro Vid AI Server is running!');
});

app.get('/surveyData', (req: Request, res: Response) => {
  res.send("Fetching User's Brain Dominance!");
});

// General error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});


console.log('Starting listener...');  // Debug: Before listen
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
console.log('Listener started - server should be running');  // This won't log if listen fails
