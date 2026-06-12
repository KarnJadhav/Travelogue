const mongoose = require('mongoose');

/**
 * Activity Schema - Represents a single activity/place to visit
 * Used as a sub-document in travel-related records
 */
const ActivitySchema = new mongoose.Schema({
  // Activity identification
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: [
      'sightseeing',
      'adventure',
      'food',
      'culture',
      'nature',
      'shopping',
      'entertainment',
      'relaxation',
      'accommodation',
      'transportation',
    ],
    default: 'sightseeing',
  },

  // Location data
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: String,
    city: String,
    country: String,
  },

  // Timing
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  timeBlock: {
    type: String,
    enum: ['morning', 'lunch', 'afternoon', 'evening', 'night'],
    default: null,
  },
  startTime: {
    type: String, // Format: "HH:MM"
    required: true,
  },
  endTime: {
    type: String, // Format: "HH:MM"
    required: true,
  },
  duration: {
    type: Number, // in minutes
    default: 120,
  },

  // Cost and budget
  estimatedCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  actualCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },

  // Additional info
  notes: {
    type: String,
    default: '',
  },
  reachOptions: {
    type: [String],
    default: [],
  },
  importance: {
    type: String,
    enum: ['must-do', 'recommended', 'optional'],
    default: 'recommended',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'hard'],
    default: 'easy',
  },

  // Travel info from previous activity
  distanceFromPrevious: {
    type: Number, // in km
    default: 0,
  },
  estimatedTravelTime: {
    type: Number, // in minutes
    default: 0,
  },

  // External references
  externalPlaceId: {
    type: String, // OpenTripMap xid or similar
    default: null,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },

  // Status
  visited: {
    type: Boolean,
    default: false,
  },
  visitedAt: Date,

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Create geospatial index for location-based queries
ActivitySchema.index({ 'location.coordinates': '2dsphere' });

module.exports = ActivitySchema;
