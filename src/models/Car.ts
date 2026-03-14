import mongoose, { Schema } from 'mongoose';

// Note: We don't extend Document here because 'model' (car model name) conflicts
// with Mongoose Document's built-in 'model' method.
// Mongoose v6+ recommends this pattern - the returned documents are HydratedDocument<ICar>.
export interface ICar {
  owner: mongoose.Types.ObjectId;
  title: string;
  description: string;
  make: string;
  model: string; // car model name, e.g. "Model 3", "Corolla"
  year: number;
  color?: string;
  seats?: number;
  transmission?: 'manual' | 'automatic';
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  location: string;
  pricePerDay: number;
  image: string;
  likes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const carSchema = new Schema<ICar>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    color: { type: String, trim: true },
    seats: { type: Number },
    transmission: { type: String, enum: ['manual', 'automatic'] },
    fuelType: { type: String, enum: ['gasoline', 'diesel', 'electric', 'hybrid'] },
    location: { type: String, required: true, trim: true },
    pricePerDay: { type: Number, required: true },
    image: { type: String, default: '' },
    likes: [{ type: String }],
  },
  { timestamps: true }
);

// Text index for AI/natural language search
carSchema.index({ title: 'text', description: 'text', make: 'text', model: 'text', location: 'text' });

export default mongoose.model<ICar>('Car', carSchema);
