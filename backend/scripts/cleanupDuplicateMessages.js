const mongoose = require('mongoose');
const Message = require('../models/Message');

const MONGO_URI = 'mongodb://localhost:27017/travel';
const DUPLICATE_WINDOW_MS = 2000;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const cursor = Message.find({})
    .sort({ chatId: 1, senderId: 1, content: 1, messageType: 1, createdAt: 1 })
    .cursor();

  const lastSeenByKey = new Map();
  const duplicates = [];
  let total = 0;

  for await (const msg of cursor) {
    total += 1;
    const key = [
      msg.chatId?.toString() || '',
      msg.senderId?.toString() || '',
      msg.content || '',
      msg.messageType || ''
    ].join('|');

    const last = lastSeenByKey.get(key);
    if (last) {
      const diff = new Date(msg.createdAt).getTime() - new Date(last.createdAt).getTime();
      if (diff >= 0 && diff <= DUPLICATE_WINDOW_MS) {
        duplicates.push(msg._id);
        continue;
      }
    }
    lastSeenByKey.set(key, msg);
  }

  if (duplicates.length === 0) {
    console.log('No duplicates found.');
    await mongoose.disconnect();
    return;
  }

  const result = await Message.deleteMany({ _id: { $in: duplicates } });
  console.log(`Scanned ${total} messages.`);
  console.log(`Deleted ${result.deletedCount} duplicate messages.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
