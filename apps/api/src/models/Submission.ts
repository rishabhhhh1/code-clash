import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmission extends Document {
  battleId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  problemId: mongoose.Types.ObjectId;
  code: string;
  language: 'python' | 'javascript' | 'java' | 'cpp' | 'go' | 'rust';
  status: 'accepted' | 'wrong_answer' | 'runtime_error' | 'compile_error' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'pending';
  runtime: number; // in ms
  memory: number; // in MB
  score: number;
  testsPassed: number;
  totalTests: number;
  error?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    battleId: {
      type: Schema.Types.ObjectId,
      ref: 'Battle',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    problemId: {
      type: Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
      index: true,
    },
    code: { type: String, required: true },
    language: {
      type: String,
      enum: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'],
      required: true,
    },
    status: {
      type: String,
      enum: ['accepted', 'wrong_answer', 'runtime_error', 'compile_error', 'time_limit_exceeded', 'memory_limit_exceeded', 'pending'],
      default: 'pending',
      index: true,
    },
    runtime: { type: Number, default: 0 },
    memory: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    testsPassed: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    error: String,
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

submissionSchema.index({ battleId: 1, userId: 1 });
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, submittedAt: -1 });

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
