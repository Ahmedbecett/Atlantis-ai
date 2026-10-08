import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db, UserRecord } from './db';

// Password hashing utilities
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Extend Express Request
export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

// Authentication Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  const session = db.findSessionByToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session invalid or expired. Please sign in again.' });
  }

  const user = db.findUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = db.checkAndRefreshUserQuota(user);
  next();
}

// Optional Auth Middleware (attaches user if token present, or allows guest access)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const session = db.findSessionByToken(token);
    if (session) {
      const user = db.findUserById(session.userId);
      if (user) {
        req.user = db.checkAndRefreshUserQuota(user);
      }
    }
  }

  // If no user token, check for or assign guest user
  if (!req.user) {
    let guestUser = db.findUserByEmail('guest@atlantis.ai');
    if (!guestUser) {
      const { hash, salt } = hashPassword('guest1234');
      guestUser = db.createUser({
        email: 'guest@atlantis.ai',
        username: 'guest',
        displayName: 'Guest Explorer',
        passwordHash: hash,
        salt,
      });
    }
    req.user = db.checkAndRefreshUserQuota(guestUser);
  }

  next();
}
