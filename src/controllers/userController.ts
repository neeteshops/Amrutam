import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { userService } from '../services/userService';
import { asyncHandler } from '../middleware/errorHandler';

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const profile = await userService.getProfile(req.user.id);
  res.json(profile);
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const profile = await userService.updateProfile(
    req.user.id,
    req.body,
    req.ip,
    req.get('user-agent')
  );
  
  res.json({
    message: 'Profile updated successfully',
    profile,
  });
});


