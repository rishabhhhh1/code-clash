import mongoose, { Schema, Document } from 'mongoose';

export interface IProblem extends Document {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  type?: string;
  points?: number;
  solvedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const problemSchema = new Schema<IProblem>(
  {
    contestId: { type: Number, required: true },
    index: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number },
    tags: { type: [String], default: [] },
    type: { type: String },
    points: { type: Number },
    solvedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

problemSchema.index({ contestId: 1, index: 1 }, { unique: true });

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
