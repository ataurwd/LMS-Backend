import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/v1/auth.routes.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Standard Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple Custom Cookie Parser Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const cookieHeader = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      if (parts.length === 2) {
        cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
      }
    });
  }
  (req as any).cookies = cookies;
  next();
});

// Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Register Auth Routes with Rate Limiting
app.use('/api/v1/auth', rateLimiter, authRoutes);

// Health Check API
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});


// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: 500,
    },
  });
});

// Boot the Server
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`[server]: Server is running in ${process.env.NODE_ENV} mode at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Server boot failed:', error);
    process.exit(1);
  }
};

startServer();
