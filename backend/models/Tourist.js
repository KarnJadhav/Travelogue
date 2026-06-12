const mongoose = require('mongoose');

const TouristSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, required: true },
  avatar: { type: String, default: '' },
  dob: { type: String, default: '' },
  gender: { type: String, default: '' },
  language: { type: String, default: '' },
  nationality: { type: String, default: '' },
  interests: { type: String, default: '' },
  phone: { type: String, default: '' },
  // Add more tourist-specific fields as needed
}, { timestamps: true });

module.exports = mongoose.model('Tourist', TouristSchema);
