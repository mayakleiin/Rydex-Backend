import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  updateBookingStatus,
} from '../controllers/bookingController';

const router = Router();

router.post('/', authMiddleware, createBooking);
router.get('/my', authMiddleware, getMyBookings);
router.get('/owner', authMiddleware, getOwnerBookings);
router.patch('/:id/status', authMiddleware, updateBookingStatus);

export default router;