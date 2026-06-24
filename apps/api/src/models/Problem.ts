import mongoose, { Document, Schema } from 'mongoose';

export interface ITestCase {
  input: string;
  output: string;
}

export interface IProblem extends Document {
  codeforcesProblemId?: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  examples: ITestCase[];
  testCases: ITestCase[];
  constraints: string;
  topics: string[];
  timeLimit: number; // in seconds
  memoryLimit: number; // in MB
  rating?: number;
  solveCount: number;
  submissions: number;
  isActive: boolean;
  source: 'codeforces' | 'custom';
  createdAt: Date;
  updatedAt: Date;
}

const problemSchema = new Schema<IProblem>(
  {
    codeforcesProblemId: { type: String, index: true },
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    examples: [
      {
        input: String,
        output: String,
      },
    ],
    testCases: [
      {
        input: String,
        output: String,
      },
    ],
    constraints: String,
    topics: [{ type: String, index: true }],
    timeLimit: { type: Number, default: 2 },
    memoryLimit: { type: Number, default: 256 },
    rating: { type: Number, index: true },
    solveCount: { type: Number, default: 0 },
    submissions: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    source: { type: String, enum: ['codeforces', 'custom'], default: 'custom' },
  },
  { timestamps: true }
);

problemSchema.index({ difficulty: 1, rating: 1 });
problemSchema.index({ topics: 1, difficulty: 1 });

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
