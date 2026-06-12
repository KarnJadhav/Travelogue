const mongoose = require('mongoose');


const ChatSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false,
    unique: false
  },
  touristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'POST_TOUR', 'CLOSED', 'LOCKED'],
    default: 'ACTIVE',
    required: true
  },
  postTourExpiry: {
    type: Date,
    default: null
  }
}, { timestamps: true });


module.exports = mongoose.model('Chat', ChatSchema);
