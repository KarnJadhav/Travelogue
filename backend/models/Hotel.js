const mongoose = require("mongoose");

const HotelSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  ownerName: { type: String, default: "" },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  country: { type: String, default: "" },
  address: { type: String, default: "" },
  cityState: { type: String, default: "" },
  hotelType: { type: String, default: "" },
  businessLicenseProof: { type: String, default: "" },
  amenities: { type: [String], default: [] },
  images: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Hotel", HotelSchema);
