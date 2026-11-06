import crypto from "node:crypto";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { Order } from "../models/Order.js";
import { requireAuth } from "../middleware/auth.js";
import { findCar } from "../data/cars.js";

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many booking attempts. Please try again later." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s-]{7,15}$/;
const PINCODE_RE = /^\d{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLOTS = ["morning", "afternoon", "evening"];
const PAYMENTS = ["full", "loan", "exchange"];

function invalid(res, error, field) {
  return res.status(400).json({ error, field });
}

function parseLocalDate(value) {
  if (!DATE_RE.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeReference() {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TRM-${suffix}`;
}

function serialize(order) {
  return {
    id: order.id,
    reference: order.reference,
    car: order.car,
    customer: order.customer,
    delivery: {
      method: order.delivery.method,
      address1: order.delivery.address1,
      address2: order.delivery.address2,
      city: order.delivery.city,
      state: order.delivery.state,
      pincode: order.delivery.pincode,
      date: dateKey(order.delivery.date),
      slot: order.delivery.slot,
    },
    payment: order.payment,
    notes: order.notes,
    status: order.status,
    createdAt: order.createdAt,
  };
}

router.post("/", orderLimiter, requireAuth, async (req, res) => {
  const car = findCar(String(req.body?.car ?? ""));
  if (!car) {
    return invalid(res, "Select a car from the collection", "car");
  }

  const customer = {
    name: String(req.body?.customer?.name ?? "").trim(),
    email: String(req.body?.customer?.email ?? "").trim().toLowerCase(),
    phone: String(req.body?.customer?.phone ?? "").trim(),
  };
  const deliveryIn = req.body?.delivery ?? {};

  if (customer.name.length < 2 || customer.name.length > 60) {
    return invalid(res, "Enter the customer's full name", "name");
  }
  if (!EMAIL_RE.test(customer.email)) {
    return invalid(res, "Enter a valid email address", "email");
  }
  if (!PHONE_RE.test(customer.phone)) {
    return invalid(res, "Enter a valid phone number", "phone");
  }

  const method = ["home", "showroom"].includes(deliveryIn.method)
    ? deliveryIn.method
    : "home";

  const delivery = {
    method,
    address1: String(deliveryIn.address1 ?? "").trim(),
    address2: String(deliveryIn.address2 ?? "").trim(),
    city: String(deliveryIn.city ?? "").trim(),
    state: String(deliveryIn.state ?? "").trim(),
    pincode: String(deliveryIn.pincode ?? "").trim(),
    slot: SLOTS.includes(deliveryIn.slot) ? deliveryIn.slot : "morning",
  };

  if (method === "home") {
    if (delivery.address1.length < 5) {
      return invalid(res, "Enter the delivery address", "address1");
    }
    if (!delivery.city) {
      return invalid(res, "Enter the delivery city", "city");
    }
    if (!delivery.state) {
      return invalid(res, "Enter the delivery state", "state");
    }
    if (!PINCODE_RE.test(delivery.pincode)) {
      return invalid(res, "Enter a valid 6-digit PIN code", "pincode");
    }
  } else {
    delivery.address1 = "";
    delivery.address2 = "";
    delivery.city = "";
    delivery.state = "";
    delivery.pincode = "";
  }

  const date = parseLocalDate(String(deliveryIn.date ?? ""));
  if (!date) {
    return invalid(res, "Choose a delivery date", "date");
  }

  const earliest = new Date();
  earliest.setHours(0, 0, 0, 0);
  earliest.setDate(earliest.getDate() + 1);

  const latest = new Date(earliest);
  latest.setDate(latest.getDate() + 120);

  if (date < earliest || date > latest) {
    return invalid(res, "Delivery date must be within the next 120 days", "date");
  }

  const payment = PAYMENTS.includes(req.body?.payment) ? req.body.payment : "full";
  const notes = String(req.body?.notes ?? "").trim().slice(0, 500);

  const order = await Order.create({
    user: req.user._id,
    reference: makeReference(),
    car: { name: car.name, price: car.price, body: car.body },
    customer,
    delivery: { ...delivery, date },
    payment,
    notes,
  });

  res.status(201).json({ order: serialize(order) });
});

router.get("/mine", requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({ orders: orders.map(serialize) });
});

export default router;
