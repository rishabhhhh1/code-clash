import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAchievement extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: string;
  name: string;
  description: string;
  icon?: string;
  earnedAt: Date;
}

const achievementSchema = new Schema<IAchievement>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

achievementSchema.index({ user: 1, type: 1 }, { unique: true });

export const Achievement = mongoose.model<IAchievement>('Achievement', achievementSchema);
