import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFriendship extends Document {
  _id: Types.ObjectId;
  requester: Types.ObjectId;
  addressee: Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendship>(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addressee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

friendshipSchema.index({ requester: 1, addressee: 1 }, { unique: true });

export const Friendship = mongoose.model<IFriendship>('Friendship', friendshipSchema);
