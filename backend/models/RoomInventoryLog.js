const mongoose = require('mongoose');

const RoomInventoryLogSchema = new mongoose.Schema(
  {
    hotelOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomType: { type: String, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking' },
    delta: { type: Number, required: true },
    reason: { type: String, required: true },
    previousAvailable: { type: Number, required: true },
    newAvailable: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoomInventoryLog', RoomInventoryLogSchema);
