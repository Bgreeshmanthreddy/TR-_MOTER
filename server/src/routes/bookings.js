import express from "express";
import { rateLimit } from "express-rate-limit";
import { Booking } from "../models/Booking.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = express.Router();

const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const PHONE_RE = /^[+\d][\d\s-]{7,15}$/;

router.post("/", bookingLimiter, optionalAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const phone = String(req.body?.phone ?? "").trim();
  const car = String(req.body?.car ?? "").trim();

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: "Enter your full name", field: "name" });
  }
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: "Enter a valid phone number", field: "phone" });
  }
  if (!car || car.length > 80) {
    return res.status(400).json({ error: "Select a car", field: "car" });
  }

  const booking = await Booking.create({
    user: req.user?._id ?? null,
    name,
    phone,
    car,
  });

  res.status(201).json({
    booking: {
      id: booking.id,
      name: booking.name,
      phone: booking.phone,
      car: booking.car,
      status: booking.status,
      createdAt: booking.createdAt,
    },
  });
});

router.get("/mine", requireAuth, async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({
    bookings: bookings.map(({ _id, name, phone, car, status, createdAt }) => ({
      id: _id.toString(),
      name,
      phone,
      car,
      status,
      createdAt,
    })),
  });
});

export default router;
