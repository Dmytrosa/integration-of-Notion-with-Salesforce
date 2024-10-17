import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

interface CheckpointDocument extends mongoose.Document {
  objectType: string;
  lastProcessedId: string;
}

const checkpointSchema = new mongoose.Schema({
  objectType: { type: String, required: true, unique: true },
  lastProcessedId: { type: String, required: true },
});

const Checkpoint = mongoose.model<CheckpointDocument>('Checkpoint', checkpointSchema);

export async function getLastProcessedId(objectType: string): Promise<string | null> {
  const checkpoint = await Checkpoint.findOne({ objectType });
  return checkpoint ? checkpoint.lastProcessedId : null;
}

export async function setLastProcessedId(objectType: string, id: string): Promise<void> {
  await Checkpoint.updateOne(
    { objectType },
    { lastProcessedId: id },
    { upsert: true }
  );
}

export async function connectMongoDB() {
  await mongoose.connect(process.env.MONGODB_URI || '', {});
}
