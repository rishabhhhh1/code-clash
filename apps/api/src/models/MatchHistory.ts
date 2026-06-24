import mongoose, { Document, Schema } from 'mongoose';

export interface IMatchHistory extends Document {
  userId: mongoose.Types.ObjectId;
  battleId: mongoose.Types.ObjectId;
  placement: number; // 1st, 2nd, etc.
  ratingChange: number; // positive or negative
  ratingBefore: number;
  ratingAfter: number;
  topicsPlayed: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  result: 'win' | 'loss' | 'draw';
  problemsSolved: number;
  totalAttempts: number;
  duration: number; // in seconds
  createdAt: Date;
}

const matchHistorySchema = new Schema<IMatchHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    battleId: {
      type: Schema.Types.ObjectId,
      ref: 'Battle',
      required: true,
      index: true,
    },
    placement: { type: Number, required: true },
    ratingChange: { type: Number, default: 0 },
    ratingBefore: { type: Number, required: true },
    ratingAfter: { type: Number, required: true },
    topicsPlayed: [String],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    result: { type: String, enum: ['win', 'loss', 'draw'], required: true },
    problemsSolved: { type: Number, default: 0 },
    totalAttempts: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

matchHistorySchema.index({ userId: 1, createdAt: -1 });
matchHistorySchema.index({ battleId: 1 });

export const MatchHistory = mongoose.model<IMatchHistory>('MatchHistory', matchHistorySchema);
