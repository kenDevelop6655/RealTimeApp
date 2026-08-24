import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from '@realtimeapp/shared';
import { verifyToken } from '../auth/jwt';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    res.status(401).json({ error: 'authentication required' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}
