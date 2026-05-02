import mongoose, { Schema } from "mongoose";

export interface ICar {
  owner: mongoose.Types.ObjectId;
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  seats?: number;
  transmission: "manual" | "automatic" | "cvt" | "robotic" | "dct";
  fuelType: "gasoline" | "diesel" | "electric" | "hybrid";
  location?: string;
  pricePerDay?: number;
  image: string;
  features?: string[];
  rules?: {
    noSmoking?: boolean;
    noPets?: boolean;
    minAge?: string;
    cleanRecord?: boolean;
  };
  likes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const carSchema = new Schema<ICar>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    color: { type: String, trim: true },
    seats: { type: Number },
    transmission: {
      type: String,
      enum: ["manual", "automatic", "cvt", "robotic", "dct"],
      required: true,
    },
    fuelType: {
      type: String,
      enum: ["gasoline", "diesel", "electric", "hybrid"],
      required: true,
    },
    location: { type: String, trim: true },
    pricePerDay: { type: Number },
    image: { type: String, default: "" },
    features: [{ type: String }],
    rules: {
      noSmoking: { type: Boolean },
      noPets: { type: Boolean },
      minAge: { type: String },
      cleanRecord: { type: Boolean },
    },
    likes: [{ type: String }],
  },
  { timestamps: true },
);

// Text index for AI/natural language search
carSchema.index({
  title: "text",
  description: "text",
  brand: "text",
  model: "text",
  location: "text",
});

export default mongoose.model<ICar>("Car", carSchema);
