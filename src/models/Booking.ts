import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus = 'pending' | 'approved' | 'rejected';

export interface IBooking extends Document {
  car: mongoose.Types.ObjectId;
  renter: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  pickupDate: Date;
  returnDate: Date;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    car: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
    renter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IBooking>('Booking', bookingSchema);