import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

export function observabilityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  req.id = requestId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.originalUrl || req.url;

    // Redact IP for privacy
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const maskedIp = rawIp.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.***.***');

    // Structured JSON log without any patient clinical data or upload bytes
    const logData = {
      level: statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO',
      timestamp: new Date().toISOString(),
      requestId,
      method,
      path,
      statusCode,
      durationMs: duration,
      clientIp: maskedIp
    };

    if (statusCode >= 500) {
      console.error('[API Error]', JSON.stringify(logData));
    } else {
      console.log('[API Access]', JSON.stringify(logData));
    }
  });

  next();
}
