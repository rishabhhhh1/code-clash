import mongoose, { Document, Schema } from 'mongoose';

export type BattleMode = 
  | 'deathmatch'
  | 'best_of_3'
  | 'survival'
  | 'speedrun'
  | 'topic_draft'
  | 'chaos'
  | 'battle_royale';

export interface IBattle extends Document {
  code: string; // Unique battle code
  creatorId: mongoose.Types.ObjectId;
  mode: BattleMode;
  status: 'waiting' | 'active' | 'completed';
  playerCount: number;
  maxPlayers: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  timeLimit: number; // in seconds
  isPublic: boolean;
  inviteCode?: string;
  problemId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  spectators: mongoose.Types.ObjectId[];
  startTime?: Date;
  endTime?: Date;
  winnerId?: mongoose.Types.ObjectId;
  leaderboard: Array<{
    userId: mongoose.Types.ObjectId;
    rank: number;
    score: number;
    solveTime?: number;
    attempts: number;
    status: 'solved' | 'failed' | 'pending';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const battleSchema = new Schema<IBattle>(
  {
    code: { type: String, required: true, unique: true, index: true },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ['deathmatch', 'best_of_3', 'survival', 'speedrun', 'topic_draft', 'chaos', 'battle_royale'],
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'completed'],
      default: 'waiting',
      index: true,
    },
    playerCount: { type: Number, default: 1, index: true },
    maxPlayers: { type: Number, default: 2 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    topics: [String],
    timeLimit: { type: Number, default: 300 },
    isPublic: { type: Boolean, default: true, index: true },
    inviteCode: String,
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    spectators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startTime: Date,
    endTime: Date,
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    leaderboard: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        rank: Number,
        score: Number,
        solveTime: Number,
        attempts: Number,
        status: { type: String, enum: ['solved', 'failed', 'pending'] },
      },
    ],
  },
  { timestamps: true }
);

battleSchema.index({ creatorId: 1, createdAt: -1 });
battleSchema.index({ status: 1, isPublic: 1 });
battleSchema.index({ createdAt: -1 });

export const Battle = mongoose.model<IBattle>('Battle', battleSchema);
