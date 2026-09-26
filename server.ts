import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { observabilityMiddleware } from './server/middleware/observability';
import { healthRouter } from './server/routes/healthRoutes';
import { aiRouter } from './server/routes/aiRoutes';

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();

// Security headers and CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing with 20MB limit for medical image/PDF base64 payloads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Observability and audit logging
app.use(observabilityMiddleware);

// API Endpoints
app.use('/api', healthRouter);
app.use('/api/ai', aiRouter);

// Centralized error handler (Sanitizes stack traces from clients)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred while processing your request.',
    requestId: req.id
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MediMind Server] Running on http://0.0.0.0:${PORT} (Node ${process.version})`);
  });
}

startServer();
