import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  codeforcesHandle: string;
  username: string;
  avatar: string;
  email?: string;
  rating: number;
  maxRating: number;
  rank: string;
  contribution: number;
  battleWins: number;
  battleLosses: number;
  battleDraws: number;
  totalBattles: number;
  winStreak: number;
  currentStreak: number;
  isOnline: boolean;
  lastSeen: Date;
  favoriteTopics: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    codeforcesHandle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    avatar: String,
    email: { type: String, lowercase: true },
    rating: { type: Number, default: 1500, index: true },
    maxRating: { type: Number, default: 1500 },
    rank: { type: String, default: 'Bronze' },
    contribution: { type: Number, default: 0 },
    battleWins: { type: Number, default: 0 },
    battleLosses: { type: Number, default: 0 },
    battleDraws: { type: Number, default: 0 },
    totalBattles: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    favoriteTopics: [String],
  },
  { timestamps: true }
);

userSchema.index({ rating: -1 });
userSchema.index({ totalBattles: -1 });
userSchema.index({ battleWins: -1 });

export const User = mongoose.model<IUser>('User', userSchema);
