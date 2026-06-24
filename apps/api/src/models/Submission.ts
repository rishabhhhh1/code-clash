import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubmission extends Document {
  _id: Types.ObjectId;
  room: Types.ObjectId;
  user: Types.ObjectId;
  problemContestId: number;
  problemIndex: string;
  language: string;
  codeforcesRunId?: number;
  verdict: string;
  runtime?: number;
  memory?: number;
  passedTests: number;
  totalTests: number;
  isAccepted: boolean;
  attemptNumber: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    problemContestId: { type: Number, required: true },
    problemIndex: { type: String, required: true },
    language: { type: String, required: true },
    codeforcesRunId: { type: Number },
    verdict: {
      type: String,
      enum: ['accepted', 'wrong_answer', 'runtime_error', 'compile_error', 'time_limit_exceeded', 'memory_limit_exceeded', 'pending', 'judging'],
      default: 'pending',
    },
    runtime: { type: Number },
    memory: { type: Number },
    passedTests: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    isAccepted: { type: Boolean, default: false },
    attemptNumber: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

submissionSchema.index({ room: 1, user: 1 });

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
