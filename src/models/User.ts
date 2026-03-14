import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  profileImage: string;
  googleId?: string;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    profileImage: { type: String, default: '' },
    googleId: { type: String },
    refreshTokens: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
