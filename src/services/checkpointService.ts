import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

interface CheckpointDocument extends mongoose.Document {
  objectType: string;
  lastProcessedDate: Date;
}

const checkpointSchema = new mongoose.Schema({
  objectType: { type: String, required: true, unique: true },
  lastProcessedDate: { type: Date, required: true },
});

const Checkpoint = mongoose.model<CheckpointDocument>(
  "Checkpoint",
  checkpointSchema
);

// Retrieve the last processed date for the given objectType
export async function getLastProcessedDate(
  objectType: string
): Promise<Date | null> {
  const checkpoint = await Checkpoint.findOne({ objectType });
  return checkpoint ? checkpoint.lastProcessedDate : null;
}

// Update the last processed date for the given objectType
export async function setLastProcessedDate(
  objectType: string,
  date: Date
): Promise<void> {
  await Checkpoint.updateOne(
    { objectType },
    { lastProcessedDate: date },
    { upsert: true }
  );
}

interface SyncTimestampDocument extends mongoose.Document {
  syncType: string;
  lastSyncedTime: string;
}

const syncTimestampSchema = new mongoose.Schema({
  syncType: { type: String, required: true, unique: true },
  lastSyncedTime: { type: String, required: true },
});

const SyncTimestamp = mongoose.model<SyncTimestampDocument>(
  "SyncTimestamp",
  syncTimestampSchema
);

// Retrieve the last synced time for the given syncType
export async function getLastSyncedTime(
  syncType: string
): Promise<string | null> {
  const record = await SyncTimestamp.findOne({ syncType });
  return record ? record.lastSyncedTime : null;
}

// Update the last synced time for the given syncType
export async function setLastSyncedTime(
  syncType: string,
  timestamp: string
): Promise<void> {
  await SyncTimestamp.updateOne(
    { syncType },
    { lastSyncedTime: timestamp },
    { upsert: true }
  );
}

// Establish a connection to MongoDB using environment variables
export async function connectMongoDB() {
  await mongoose.connect(process.env.MONGODB_URI || "", {});
}
