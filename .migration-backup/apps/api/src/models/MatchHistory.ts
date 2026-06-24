import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMatchHistory extends Document {
  _id: Types.ObjectId;
  room: Types.ObjectId;
  user: Types.ObjectId;
  placement: number;
  ratingChange: number;
  wasWinner: boolean;
  problemsSolved: number;
  totalTime: number;
  mode: string;
  topics: string[];
  createdAt: Date;
}

const matchHistorySchema = new Schema<IMatchHistory>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    placement: { type: Number },
    ratingChange: { type: Number, default: 0 },
    wasWinner: { type: Boolean, default: false },
    problemsSolved: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 },
    mode: { type: String },
    topics: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

matchHistorySchema.index({ user: 1, createdAt: -1 });

export const MatchHistory = mongoose.model<IMatchHistory>('MatchHistory', matchHistorySchema);
