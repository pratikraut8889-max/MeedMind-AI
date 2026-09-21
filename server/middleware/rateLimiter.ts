import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(key);
    }
  }
}, 300000);

export interface RateLimitOptions {
  windowMs?: number; // Time window in ms (default: 60s)
  max?: number;      // Max requests per window (default: 60)
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.max || 60;
  const message = options.message || 'Too many requests. Please slow down and try again later.';

  return (req: Request, res: Response, next: NextFunction): void => {
    // In container proxy environment, trust X-Forwarded-For or remoteAddress
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const routeKey = `${clientIp}:${req.baseUrl || req.path}`;
    const now = Date.now();

    const record = ipStore.get(routeKey);

    if (!record || now > record.resetTime) {
      ipStore.set(routeKey, {
        count: 1,
        resetTime: now + windowMs
      });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfterSeconds
      });
      return;
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    next();
  };
}
