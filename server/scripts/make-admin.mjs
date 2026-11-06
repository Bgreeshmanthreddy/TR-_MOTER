import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env first.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const user = await User.findOne({ email });

if (!user) {
  console.error(`No account found for ${email}`);
  await mongoose.disconnect();
  process.exit(1);
}

// The role lives on the user document, not in the token, so the change
// applies on the next request without the user signing in again.
user.role = "admin";
await user.save({ validateBeforeSave: false });

console.log(`${user.email} (${user.name}) is now an admin.`);
await mongoose.disconnect();
