import { Schema, model, Document, Types } from 'mongoose';

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  country?: string;
  socialLinks: {
    website?: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  teacherProfile?: {
    experienceYears: number;
    skills: string[];
    rating: number;
    totalStudents: number;
    totalCourses: number;
    escrowHoldingBalance: number;
    availablePayoutBalance: number;
    bankAccount?: string;
  };
  studentProfile?: {
    enrolledCoursesCount: number;
    completedCoursesCount: number;
    learningStreakDays: number;
    lastLearningDate?: Date;
    wishlist: Types.ObjectId[];
  };
  refreshToken?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.STUDENT, index: true },
  status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING_VERIFICATION },
  avatar: { type: String },
  bio: { type: String, maxlength: 500 },
  country: { type: String },
  socialLinks: {
    website: String,
    github: String,
    linkedin: String,
    twitter: String
  },
  teacherProfile: {
    experienceYears: { type: Number, default: 0 },
    skills: [String],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalStudents: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },
    escrowHoldingBalance: { type: Number, default: 0 },
    availablePayoutBalance: { type: Number, default: 0 },
    bankAccount: { type: String, select: false }
  },
  studentProfile: {
    enrolledCoursesCount: { type: Number, default: 0 },
    completedCoursesCount: { type: Number, default: 0 },
    learningStreakDays: { type: Number, default: 0 },
    lastLearningDate: Date,
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Course' }]
  },
  refreshToken: { type: String, select: false },
  emailVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for high-velocity queries
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ 'teacherProfile.rating': -1 });

export const UserModel = model<IUser>('User', UserSchema);
