import mongoose from "mongoose";

export async function connectDB(uri) {
  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
}
