const mongoose = require('mongoose');

/**
 * Itinerary Template Schema
 * Allows users to save and share itinerary templates
 */
const ItineraryTemplateSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    category: {
      type: String,
      enum: [
        'beach',
        'mountain',
        'city',
        'cultural',
        'adventure',
        'luxury',
        'budget',
        'family',
        'romance',
        'wellness',
      ],
      default: 'city',
    },

    // Template details
    destination: {
      name: String,
      city: String,
      country: String,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'hard'],
      default: 'moderate',
    },
    estimatedBudget: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'INR',
      },
    },

    // Template activities structure
    days: [
      {
        dayNumber: Number,
        title: String,
        theme: String, // e.g., "Beach Day", "City Exploration"
        activities: [
          {
            name: String,
            category: String,
            timeSlot: String,
            duration: Number,
            description: String,
            estimatedCost: Number,
            importance: String,
          },
        ],
      },
    ],

    // Author and visibility
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isOfficial: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },

    // Metadata
    tags: [String],
    interests: [String],
    tripType: [String],

    // Social stats
    uses: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: Number,
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Preview image
    imageUrl: String,
    imageUrls: [String],

    // Status
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
    },

    // Metadata
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ItineraryTemplateSchema.index({ destination: 1, duration: 1 });
ItineraryTemplateSchema.index({ isPublic: 1, status: 1 });
ItineraryTemplateSchema.index({ likeCount: -1 });
ItineraryTemplateSchema.index({ 'rating.average': -1 });
ItineraryTemplateSchema.index({ tags: 1 });

module.exports = mongoose.model('ItineraryTemplate', ItineraryTemplateSchema);
