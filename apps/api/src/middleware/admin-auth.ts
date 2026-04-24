import { NextFunction, Request, Response } from 'express';

const ADMIN_ROLE = 'ADMIN';

export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  if (!authorization) {
    res.status(401).json({ message: 'Unauthorized: missing Authorization header.' });
    return;
  }

  const roleHeader = req.header('x-role') ?? req.header('x-user-role');
  if (!roleHeader || roleHeader.toUpperCase() !== ADMIN_ROLE) {
    res.status(403).json({ message: 'Forbidden: ADMIN role is required.' });
    return;
  }

  next();
}
