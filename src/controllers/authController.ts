import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { authService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.register(
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  res.status(201).json({
    message: 'User registered successfully',
    user: result.user,
    token: result.token,
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.login(
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  if (result.requiresMfa) {
    res.status(200).json({
      message: 'MFA required',
      requiresMfa: true,
    });
    return;
  }
  
  res.json({
    message: 'Login successful',
    user: result.user,
    token: result.token,
  });
});

export const setupMfa = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const result = await authService.setupMfa(req.user.id);
  
  res.json({
    message: 'MFA setup initiated',
    secret: result.secret,
    qrCode: result.qrCode,
  });
});

export const enableMfa = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  await authService.enableMfa(req.user.id, req.body.token);
  
  res.json({
    message: 'MFA enabled successfully',
  });
});


