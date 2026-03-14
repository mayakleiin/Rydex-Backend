import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  car: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    car: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<IComment>('Comment', commentSchema);
