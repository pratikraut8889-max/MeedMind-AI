import { Router, Request, Response } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/health', (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY);

  res.status(200).json({
    status: 'ok',
    service: 'MediMind AI Backend',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    aiProvider: {
      configured: hasGeminiKey,
      model: 'gemini-3.8-flash'
    }
  });
});
