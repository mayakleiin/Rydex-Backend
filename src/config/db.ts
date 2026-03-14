import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rydex';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};
