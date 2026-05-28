import Session from './models/Session.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

async function run() {
  dotenv.config();
  await mongoose.connect(process.env.MONGO_URI);
  const sessions = await Session.find({ status: { $in: ['waiting', 'active'] } });
  console.log('Stale sessions:', sessions.length);
  sessions.forEach(s => console.log(s._id, s.quizId, s.status, s.pin));
  process.exit(0);
}
run();
