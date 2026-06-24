import mongoose, { Document, Schema } from 'mongoose';

export interface IRanking extends Document {
  userId: mongoose.Types.ObjectId;
  rating: number;
  rank: string;
  battles: number;
  wins: number;
  losses: number;
  winRate: number;
  period: 'global' | 'weekly' | 'monthly';
  updatedAt: Date;
}

const rankingSchema = new Schema<IRanking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, index: true },
    rank: String,
    battles: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    period: {
      type: String,
      enum: ['global', 'weekly', 'monthly'],
      default: 'global',
      index: true,
    },
  },
  { timestamps: false }
);

rankingSchema.index({ period: 1, rating: -1 });
rankingSchema.index({ userId: 1, period: 1 });

export const Ranking = mongoose.model<IRanking>('Ranking', rankingSchema);
