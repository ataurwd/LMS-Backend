import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Access token missing or malformed' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, false);

    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
};
