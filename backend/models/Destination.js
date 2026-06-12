const mongoose = require('mongoose');

const DestinationSchema = new mongoose.Schema({
  xid: { type: String, unique: true },
  name: String,
  city: String,
  country: String,
  image: String,
  rating: Number,
  description: String,
  lat: Number,
  lon: Number,
  details: Object,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Destination', DestinationSchema);
