const mongoose = require('mongoose');
const ActivitySchema = require('./Activity');

/**
 * Itinerary Schema - Main travel plan document
 * Contains all activities, budget info, and collaboration data
 */
const ItinerarySchema = new mongoose.Schema(
  {
    // Basic info
    title: {
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

    // Travel dates
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    numberOfDays: {
      type: Number,
      required: true,
      min: 1,
      max: 365,
    },

    // Destination details
    destination: {
      name: {
        type: String,
        required: true,
      },
      city: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      timezone: String,
      language: String,
    },

    // Trip metadata
    tripType: {
      type: String,
      enum: [
        'solo',
        'couple',
        'family',
        'group',
        'adventure',
        'relaxation',
      ],
      default: 'solo',
    },
    numberOfTravelers: {
      type: Number,
      default: 1,
      min: 1,
    },
    interests: [
      {
        type: String,
        enum: [
          'nature',
          'culture',
          'food',
          'adventure',
          'shopping',
          'history',
          'nightlife',
          'relaxation',
          'photography',
        ],
      },
    ],
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'hard'],
      default: 'moderate',
    },
    season: {
      type: String,
      enum: ['spring', 'summer', 'fall', 'winter'],
      default: 'summer',
    },

    // Budget tracking
    budget: {
      requestedBudget: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalBudget: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
      minimumRecommended: {
        type: Number,
        default: 0,
        min: 0,
      },
      comfortableEstimate: {
        type: Number,
        default: 0,
        min: 0,
      },
      premiumEstimate: {
        type: Number,
        default: 0,
        min: 0,
      },
      suggestedDailyBudget: {
        type: Number,
        default: 0,
        min: 0,
      },
      status: {
        type: String,
        enum: ['below-minimum', 'within-range', 'above-premium'],
        default: 'within-range',
      },
      adjustmentApplied: {
        type: Boolean,
        default: false,
      },
      adjustmentMessage: {
        type: String,
        default: '',
      },
      destinationCostLevel: {
        type: String,
        default: 'medium',
      },
      destinationType: {
        type: String,
        default: 'domestic-city',
      },
      accommodation: {
        type: Number,
        default: 0,
        min: 0,
      },
      transportation: {
        type: Number,
        default: 0,
        min: 0,
      },
      activities: {
        type: Number,
        default: 0,
        min: 0,
      },
      food: {
        type: Number,
        default: 0,
        min: 0,
      },
      misc: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Activities
    activities: {
      type: [ActivitySchema],
      default: [],
    },
    totalActivityCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Status and visibility
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },

    // Ownership and collaboration
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['editor', 'viewer', 'commenter'],
          default: 'editor',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Template info
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItineraryTemplate',
      default: null,
    },
    templateName: {
      type: String,
      default: '',
    },

    // Social features
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
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    shares: [
      {
        sharedWith: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        accessLevel: {
          type: String,
          enum: ['view', 'edit'],
          default: 'view',
        },
      },
    ],

    // Weather data (cached)
    weatherData: {
      lastUpdated: Date,
      current: {
        temperature: Number,
        feelsLike: Number,
        minTemp: Number,
        maxTemp: Number,
        humidity: Number,
        windSpeed: Number,
        condition: String,
        description: String,
        rainProbability: Number,
        visibility: Number,
        pressure: Number,
        lastUpdated: Date,
      },
      forecast: [
        {
          day: Number,
          temperature: Number,
          condition: String,
          humidity: Number,
          windSpeed: Number,
          rainProbability: Number,
        },
      ],
    },

    // AI planning metadata (optional)
    aiPlan: {
      summary: {
        type: String,
        default: '',
      },
      detailedPlan: {
        type: String,
        default: '',
      },
      highlights: [String],
      dailyThemes: [
        {
          day: Number,
          theme: String,
          focus: String,
          tip: String,
        },
      ],
      packingTips: [String],
      localTips: [String],
      budgetSplit: {
        accommodation: Number,
        transportation: Number,
        activities: Number,
        food: Number,
        misc: Number,
      },
      notes: {
        type: String,
        default: '',
      },
      imageBased: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },

    planningInsights: {
      averageActivityDurationMinutes: {
        type: Number,
        default: 0,
      },
      totalEstimatedTravelMinutes: {
        type: Number,
        default: 0,
      },
      budgetStatus: {
        type: String,
        enum: ['below-minimum', 'within-range', 'above-premium'],
        default: 'within-range',
      },
      destinationProfile: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      weatherStatus: {
        type: String,
        enum: ['live', 'unavailable'],
        default: 'unavailable',
      },
    },

    // Route optimization
    routeOptimized: {
      type: Boolean,
      default: false,
    },
    totalDistance: {
      type: Number,
      default: 0, // in km
    },
    estimatedTotalTravelTime: {
      type: Number,
      default: 0, // in minutes
    },

    // Version control
    version: {
      type: Number,
      default: 1,
    },
    versionHistory: [
      {
        version: Number,
        changes: String,
        changedAt: Date,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Metadata
    tags: [String],
    highlightedPlaces: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
ItinerarySchema.index({ userId: 1 });
ItinerarySchema.index({ isPublic: 1, status: 1 });
ItinerarySchema.index({ 'destination.name': 'text', title: 'text' });
ItinerarySchema.index({ createdAt: -1 });
ItinerarySchema.index({ likeCount: -1 }); // For trending itineraries

// Virtual for total budget used
ItinerarySchema.virtual('budgetUsed').get(function () {
  return (
    this.budget.accommodation +
    this.budget.transportation +
    this.budget.activities +
    this.budget.food +
    this.budget.misc
  );
});

// Virtual for remaining budget
ItinerarySchema.virtual('budgetRemaining').get(function () {
  return Math.max(0, this.budget.totalBudget - this.budgetUsed);
});

// Virtual for budget spent percentage
ItinerarySchema.virtual('budgetSpentPercentage').get(function () {
  if (this.budget.totalBudget === 0) return 0;
  return (this.budgetUsed / this.budget.totalBudget) * 100;
});

module.exports = mongoose.model('Itinerary', ItinerarySchema);
