const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // hotel user
  type: { type: String, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  available: { type: Number, required: true },
  status: { type: String, enum: ["Available", "Full", "Unavailable"], default: "Available" }
}, { timestamps: true });

module.exports = mongoose.model("Room", RoomSchema);
