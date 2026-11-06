import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    car: {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      body: String,
    },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 60 },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    delivery: {
      method: {
        type: String,
        enum: ["home", "showroom"],
        default: "home",
      },
      address1: { type: String, trim: true, maxlength: 120 },
      address2: { type: String, trim: true, maxlength: 120 },
      city: { type: String, trim: true, maxlength: 60 },
      state: { type: String, trim: true, maxlength: 60 },
      pincode: { type: String, trim: true },
      date: { type: Date, required: true },
      slot: {
        type: String,
        enum: ["morning", "afternoon", "evening"],
        default: "morning",
      },
    },
    payment: {
      type: String,
      enum: ["full", "loan", "exchange"],
      default: "full",
    },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "scheduled", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
