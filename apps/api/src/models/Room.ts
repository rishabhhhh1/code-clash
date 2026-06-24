import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRoomPlayer {
  user: Types.ObjectId;
  status: 'waiting' | 'ready' | 'playing' | 'solved' | 'eliminated' | 'disconnected';
  score: number;
  rank: number;
  problemsSolved: number;
  submissionsCount: number;
  solveTime: number;
  penalty: number;
  joinedAt: Date;
}

export interface IRoomProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  solvedBy: Types.ObjectId[];
}

export interface IRoom extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  host: Types.ObjectId;
  mode: string;
  status: string;
  difficulty: string;
  topics: string[];
  maxPlayers: number;
  timeControl: number;
  isPublic: boolean;
  inviteCode?: string;
  joinApproval: boolean;
  pendingPlayers: Types.ObjectId[];
  players: IRoomPlayer[];
  spectators: Types.ObjectId[];
  problems: IRoomProblem[];
  currentRound: number;
  totalRounds: number;
  maxRounds: number;
  startedAt?: Date;
  endedAt?: Date;
  winner?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomPlayerSchema = new Schema<IRoomPlayer>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['waiting', 'ready', 'playing', 'solved', 'eliminated', 'disconnected'], default: 'waiting' },
    score: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    problemsSolved: { type: Number, default: 0 },
    submissionsCount: { type: Number, default: 0 },
    solveTime: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomProblemSchema = new Schema<IRoomProblem>(
  {
    contestId: { type: Number, required: true },
    index: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number },
    tags: { type: [String], default: [] },
    solvedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const roomSchema = new Schema<IRoom>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, required: true },
    status: { type: String, enum: ['waiting', 'starting', 'active', 'completed', 'cancelled'], default: 'waiting' },
    difficulty: { type: String, default: 'all' },
    topics: { type: [String], default: [] },
    maxPlayers: { type: Number, default: 2, min: 2, max: 100 },
    timeControl: { type: Number, default: 1800 },
    isPublic: { type: Boolean, default: true },
    inviteCode: { type: String, unique: true, sparse: true },
    joinApproval: { type: Boolean, default: false },
    pendingPlayers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    players: [roomPlayerSchema],
    spectators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    problems: [roomProblemSchema],
    currentRound: { type: Number, default: 0 },
    totalRounds: { type: Number, default: 1 },
    maxRounds: { type: Number, default: 10 },
    startedAt: { type: Date },
    endedAt: { type: Date },
    winner: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

roomSchema.index({ code: 1 });
roomSchema.index({ inviteCode: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ isPublic: 1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);
