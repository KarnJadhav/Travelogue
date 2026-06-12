const mongoose = require('mongoose');

const ChecklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const TouristItinerarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    destination: {
      type: String,
      trim: true,
      required: true,
    },
    startDate: {
      type: String,
      default: '',
    },
    endDate: {
      type: String,
      default: '',
    },
    tripRequest: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    itinerary: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    checklist: {
      type: [ChecklistItemSchema],
      default: [],
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

TouristItinerarySchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('TouristItinerary', TouristItinerarySchema);
