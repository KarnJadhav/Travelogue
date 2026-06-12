// MongoDB cleanup script for Booking messages missing sender
// Usage: Run in MongoDB shell or with Node.js (after connecting to your DB)

const mongoose = require('mongoose');
const Booking = require('./models/Booking'); // Adjust path if needed

async function cleanupInvalidMessages() {
  await mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME'); // <-- Change DB name

  const bookings = await Booking.find({ 'messages.sender': { $exists: false } });
  for (const booking of bookings) {
    // Remove messages without sender
    booking.messages = booking.messages.filter(msg => !!msg.sender);
    await booking.save();
    console.log(`Fixed booking ${booking._id}`);
  }
  console.log('Cleanup complete.');
  mongoose.disconnect();
}

cleanupInvalidMessages();
