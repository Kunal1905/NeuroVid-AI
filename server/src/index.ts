import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { clerkMiddleware } from "@clerk/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import userRoutes from "./routes/user";
import surveyRoutes from "./routes/survey";
import generationRoutes from "./routes/generate";
import paymentRoutes from "./routes/payment";
import chatRoutes from "./routes/chat";
import { generationQueue } from "./queues/generation.queue";
import { redisConnection } from "./config/redis";
import { db } from "./services/db";

const app = express();
const PORT = 3005;
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// Connect to Redis first before initializing BullMQ
async function initializeServer() {
  try {
    console.log('Connecting to Redis...');
    // Avoid calling connect() when ioredis is already connecting/connected
    if (redisConnection.status !== 'ready') {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 15000);

        const onReady = () => {
          clearTimeout(timeout);
          resolve();
        };
        const onError = (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        };

        redisConnection.once('ready', onReady);
        redisConnection.once('error', onError);
      });
    }
    console.log('✅ Redis connected successfully');
    
    // Initialize BullMQ board after Redis is ready
    createBullBoard({
      queues: [new BullMQAdapter(generationQueue)],
      serverAdapter,
    });
    
    const corsOptions = {
      origin: "http://localhost:3000",
      credentials: true,
    };
    app.use(cors(corsOptions));
    app.use(express.json());
    const hasClerk = !!process.env.CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
    console.log("Clerk Enabled:", hasClerk);
    if (hasClerk) {
      app.use(clerkMiddleware());
    }

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      if (res.headersSent) {
        return next(err);
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // Health check endpoint
    app.get("/health", async (req, res) => {
      try {
        // Check database connection
        let dbStatus = "unknown";
        try {
          if (db) {
            await db.execute('SELECT 1');
            dbStatus = "connected";
          } else {
            dbStatus = "disabled";
          }
        } catch (dbError) {
          dbStatus = "disconnected";
        }

        // Check Redis connection
        let redisStatus = "unknown";
        try {
          if (redisConnection.status === 'ready') {
            await redisConnection.ping();
            redisStatus = "connected";
          } else {
            redisStatus = "disconnected";
          }
        } catch (redisError) {
          redisStatus = "disconnected";
        }

        // Check queue status
        let queueStatus = "unknown";
        try {
          const queueCount = await generationQueue.getJobCounts();
          queueStatus = `active: ${queueCount.active}, waiting: ${queueCount.waiting}, failed: ${queueCount.failed}`;
        } catch (queueError) {
          queueStatus = "error";
        }

        const status = dbStatus === "connected" && redisStatus === "connected" ? "healthy" : "degraded";
        
        res.status(status === "healthy" ? 200 : 503).json({
          status,
          timestamp: new Date().toISOString(),
          services: {
            database: dbStatus,
            redis: redisStatus,
            queue: queueStatus
          },
          pid: process.pid,
          uptime: process.uptime()
        });
      } catch (error) {
        res.status(500).json({
          status: "unhealthy",
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.use("/api/users", userRoutes);
    app.use("/api/survey", surveyRoutes);
    app.use("/api/generate", generationRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/chat", chatRoutes);

    app.use("/admin/queues", serverAdapter.getRouter());

    app.get("/", (_, res) => {
      res.send("Neuro Vid AI Server is running!");
    });

    // Graceful shutdown
    let server: any;
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
      
      try {
        // Close HTTP server
        if (server) {
          server.close(() => {
            console.log('✅ HTTP server closed');
          });
        }
        
        // Close Redis connection with proper error handling
        try {
          if (redisConnection.status !== 'end') {
            await redisConnection.quit();
            console.log('✅ Redis connection closed');
          } else {
            console.log('⚠️ Redis already disconnected');
          }
        } catch (redisError) {
          console.log('⚠️ Redis connection already closed or error during shutdown');
        }
        
        // Close database connection
        // Note: Drizzle doesn't have explicit close method for serverless
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();
