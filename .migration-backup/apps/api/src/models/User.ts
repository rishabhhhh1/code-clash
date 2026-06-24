import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  codeforcesHandle: string;
  username: string;
  email?: string;
  avatar: string;
  bio: string;
  rating: number;
  maxRating: number;
  rank: string;
  contribution: number;
  battleWins: number;
  battleLosses: number;
  winStreak: number;
  maxWinStreak: number;
  totalBattles: number;
  favoriteTopics: string[];
  friends: Types.ObjectId[];
  isOnline: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    codeforcesHandle: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, sparse: true, unique: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    rating: { type: Number, default: 1500 },
    maxRating: { type: Number, default: 1500 },
    rank: { type: String, default: 'newbie' },
    contribution: { type: Number, default: 0 },
    battleWins: { type: Number, default: 0 },
    battleLosses: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 },
    maxWinStreak: { type: Number, default: 0 },
    totalBattles: { type: Number, default: 0 },
    favoriteTopics: { type: [String], default: [] },
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ rating: -1 });
userSchema.index({ battleWins: -1 });

export const User = mongoose.model<IUser>('User', userSchema);
