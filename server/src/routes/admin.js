import express from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";
import { Order } from "../models/Order.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAdmin);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateKey(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function serializeOrder(order) {
  return {
    id: order._id.toString(),
    reference: order.reference,
    car: order.car,
    phone: order.customer?.phone,
    payment: order.payment,
    notes: order.notes,
    status: order.status,
    createdAt: order.createdAt,
    delivery: {
      method: order.delivery.method,
      address1: order.delivery.address1,
      address2: order.delivery.address2,
      city: order.delivery.city,
      state: order.delivery.state,
      pincode: order.delivery.pincode,
      date: dateKey(new Date(order.delivery.date)),
      slot: order.delivery.slot,
    },
  };
}

function serializeBooking(booking) {
  return {
    id: booking._id.toString(),
    car: booking.car,
    phone: booking.phone,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

router.get("/summary", async (_req, res) => {
  const [users, admins, bookings, orders, pendingOrders] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    Booking.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
  ]);

  res.json({ summary: { users, admins, bookings, orders, pendingOrders } });
});

router.get("/users", async (req, res) => {
  const query = String(req.query.q ?? "").trim();

  const filter = query
    ? {
        $or: [
          { name: new RegExp(escapeRegex(query), "i") },
          { email: new RegExp(escapeRegex(query), "i") },
        ],
      }
    : {};

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const ids = users.map((user) => user._id);

  const [orderCounts, bookingCounts] = await Promise.all([
    Order.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
  ]);

  const orderMap = new Map(orderCounts.map((row) => [row._id.toString(), row.count]));
  const bookingMap = new Map(bookingCounts.map((row) => [row._id.toString(), row.count]));

  res.json({
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
      orders: orderMap.get(user._id.toString()) ?? 0,
      bookings: bookingMap.get(user._id.toString()) ?? 0,
    })),
  });
});

router.get("/users/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid customer id" });
  }

  const user = await User.findById(req.params.id).lean();
  if (!user) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const [orders, bookings] = await Promise.all([
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20),
    Booking.find({ user: user._id }).sort({ createdAt: -1 }).limit(20),
  ]);

  res.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
    },
    orders: orders.map(serializeOrder),
    bookings: bookings.map(serializeBooking),
  });
});

export default router;
