import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Booking from '../models/Booking';
import Car from '../models/Car';

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { carId, pickupDate, returnDate } = req.body;

    if (!carId || !pickupDate || !returnDate) {
      res.status(400).json({ message: 'carId, pickupDate and returnDate are required' });
      return;
    }

    const car = await Car.findById(carId);

    if (!car) {
      res.status(404).json({ message: 'Car not found' });
      return;
    }

    if (car.owner.toString() === req.userId) {
      res.status(400).json({ message: 'You cannot book your own car' });
      return;
    }
    const existingBooking = await Booking.findOne({
  car: car._id,
  renter: req.userId,
  status: 'pending',
  pickupDate: { $lte: new Date(returnDate) },
  returnDate: { $gte: new Date(pickupDate) },
});

if (existingBooking) {
  res.status(400).json({
    message: 'You already have a pending booking request for this car and date range',
  });
  return;
}

    const booking = await Booking.create({
      car: car._id,
      renter: req.userId,
      owner: car.owner,
      pickupDate,
      returnDate,
      status: 'pending',
    });

    await booking.populate([
      { path: 'car', select: 'title brand model year image images pricePerDay' },
      { path: 'renter', select: 'username email profileImage' },
      { path: 'owner', select: 'username email profileImage' },
    ]);

    res.status(201).json({
      message: 'Booking request sent and waiting for owner approval',
      booking,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create booking' });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await Booking.find({ renter: req.userId })
      .sort({ createdAt: -1 })
      .populate('car', 'title brand model year image images pricePerDay')
      .populate('owner', 'username email profileImage');

    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get bookings' });
  }
};

export const getOwnerBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await Booking.find({ owner: req.userId })
      .sort({ createdAt: -1 })
      .populate('car', 'title brand model year image images pricePerDay')
      .populate('renter', 'username email profileImage');

    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get owner bookings' });
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Status must be approved or rejected' });
      return;
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (booking.owner.toString() !== req.userId) {
      res.status(403).json({ message: 'Only the car owner can approve or reject this booking' });
      return;
    }

    booking.status = status;
    await booking.save();

    await booking.populate([
      { path: 'car', select: 'title brand model year image images pricePerDay' },
      { path: 'renter', select: 'username email profileImage' },
      { path: 'owner', select: 'username email profileImage' },
    ]);

    res.json({
      message: `Booking ${status}`,
      booking,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update booking' });
  }
};