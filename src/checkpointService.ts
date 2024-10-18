import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

interface CheckpointDocument extends mongoose.Document {
  objectType: string;
  lastProcessedDate: Date;
}

const checkpointSchema = new mongoose.Schema({
  objectType: { type: String, required: true, unique: true },
  lastProcessedDate: { type: Date, required: true },
});

const Checkpoint = mongoose.model<CheckpointDocument>('Checkpoint', checkpointSchema);

export async function getLastProcessedDate(objectType: string): Promise<Date | null> {
  const checkpoint = await Checkpoint.findOne({ objectType });
  return checkpoint ? checkpoint.lastProcessedDate : null;
}

export async function setLastProcessedDate(objectType: string, date: Date): Promise<void> {
  await Checkpoint.updateOne(
    { objectType },
    { lastProcessedDate: date },
    { upsert: true }
  );
}

export async function connectMongoDB() {
  await mongoose.connect(process.env.MONGODB_URI || '', {});
}
