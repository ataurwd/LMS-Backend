import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, handleGoogleOAuth, verifyToken, generateAccessToken, generateRefreshToken } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';
import { UserModel } from '../models/user.model.js';

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const user = await registerUser(validatedData);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(validatedData);

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(401).json({ success: false, message: error.message });
  }
};

export const googleOAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ success: false, message: 'Google ID Token is required' });
      return;
    }

    const { user, accessToken, refreshToken } = await handleGoogleOAuth(idToken);

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token missing' });
      return;
    }

    const payload = verifyToken(refreshToken, true);
    const user = await UserModel.findById(payload.userId);

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    const newAccessToken = generateAccessToken(user._id.toString(), user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.role);

    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Session expired, please login again' });
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      const payload = verifyToken(refreshToken, true);
      const user = await UserModel.findById(payload.userId);
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out' });
  }
};
