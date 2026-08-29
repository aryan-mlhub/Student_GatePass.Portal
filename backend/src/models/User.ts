import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'STUDENT' | 'GUARD' | 'WARDEN' | 'ADMIN';

export interface IGuardian {
  name: string;
  phone: string;
  email?: string;
}

export interface IUser extends Document {
  name: string;
  studentId?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  semester?: number;
  section?: string;
  phone?: string;
  guardian?: IGuardian;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    studentId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['STUDENT', 'GUARD', 'WARDEN', 'ADMIN'],
      default: 'STUDENT',
      required: true,
    },
    department: {
      type: String,
      trim: true,
    },
    semester: {
      type: Number,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    guardian: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Method to verify password candidate
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Transform to remove passwordHash from json output
UserSchema.set('toJSON', {
  transform: function (_doc, ret: any) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
