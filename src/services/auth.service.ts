import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UserModel, IUser, UserRole, UserStatus } from '../models/user.model.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface TokenPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.sign({ userId, role }, secret, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return jwt.sign({ userId, role }, secret, { expiresIn: '7d' });
};

export const verifyToken = (token: string, isRefresh = false): TokenPayload => {
  const secret = isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret is not defined');
  return jwt.verify(token, secret) as TokenPayload;
};

export const registerUser = async (userData: { name: string; email: string; password?: string }) => {
  const { name, email, password } = userData;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  let passwordHash = '';
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  } else {
    // For OAuth users who don't set a password initially
    passwordHash = await bcrypt.hash(Math.random().toString(36).substring(2, 15), 12);
  }

  const user = new UserModel({
    name,
    email,
    passwordHash,
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE, // Mark active for simplicity or pending verification
    emailVerified: !!password ? false : true, // OAuth is pre-verified
  });

  await user.save();
  return user;
};

export const loginUser = async (credentials: { email: string; password?: string }) => {
  const { email, password } = credentials;

  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new Error('Your account has been suspended');
  }

  if (password) {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }
  } else {
    throw new Error('Password is required for email login');
  }

  const accessToken = generateAccessToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString(), user.role);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

export const verifyGoogleIdToken = async (idToken: string) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
      throw new Error('Invalid Google Token payload');
    }
    return {
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
    };
  } catch (error) {
    throw new Error('Google OAuth verification failed');
  }
};

export const handleGoogleOAuth = async (idToken: string) => {
  const googleUser = await verifyGoogleIdToken(idToken);
  
  let user = await UserModel.findOne({ email: googleUser.email });

  if (!user) {
    // Create new OAuth user
    user = new UserModel({
      name: googleUser.name,
      email: googleUser.email,
      passwordHash: await bcrypt.hash(Math.random().toString(36).substring(2, 15), 12),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      avatar: googleUser.avatar,
      emailVerified: true,
    });
    await user.save();
  } else if (user.status === UserStatus.SUSPENDED) {
    throw new Error('Your account has been suspended');
  }

  const accessToken = generateAccessToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString(), user.role);

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};
