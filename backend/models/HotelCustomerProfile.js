const mongoose = require("mongoose");

const SEGMENTS = ["Business", "Family", "Solo", "Couples", "Other", ""];

const HotelCustomerProfileSchema = new mongoose.Schema(
  {
    hotelOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    segment: {
      type: String,
      enum: SEGMENTS,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    tags: [{ type: String, default: [] }],
    vip: { type: Boolean, default: false },
  },
  { timestamps: true }
);

HotelCustomerProfileSchema.index({ hotelOwnerId: 1, touristId: 1 }, { unique: true });

module.exports = mongoose.model("HotelCustomerProfile", HotelCustomerProfileSchema);
