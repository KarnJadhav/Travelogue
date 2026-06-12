const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    resourceType: { type: String, trim: true, default: '' },
    originalName: { type: String, trim: true, default: '' },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const SeasonalPricingSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    pricePerPerson: { type: Number, default: 0, min: 0 },
    weekendPrice: { type: Number, default: 0, min: 0 }
  },
  { _id: true }
);

const DiscountRuleSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    value: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const CustomTimeSlotSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    startTime: { type: String, trim: true, default: '' },
    endTime: { type: String, trim: true, default: '' }
  },
  { _id: true }
);

const RecurringScheduleSchema = new mongoose.Schema(
  {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
    interval: { type: Number, default: 1, min: 1 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null }
  },
  { _id: false }
);

const TourParticipantSchema = new mongoose.Schema(
  {
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tourDate: {
      type: Date,
      required: true
    },
    seats: {
      type: Number,
      default: 1,
      min: 1
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    advancePaymentStatus: {
      type: String,
      enum: ['awaiting_payment', 'submitted', 'verified', 'rejected'],
      default: 'awaiting_payment'
    },
    advanceRejectedReason: {
      type: String,
      trim: true,
      default: ''
    },
    paymentWindowExpiresAt: {
      type: Date,
      default: null
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const TourSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
    fullDescription: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    meetingPoint: { type: String, required: true, trim: true, maxlength: 220 },
    durationType: {
      type: String,
      enum: ['2 hours', 'Half day', 'Full day', 'Multi-day'],
      required: true
    },
    tourType: {
      type: String,
      enum: ['Private Tour', 'Group Tour', 'Online Tour', 'Custom Tour'],
      required: true
    },
    difficultyLevel: { type: String, enum: ['Easy', 'Moderate', 'Hard'], required: true },
    ageRestriction: {
      type: String,
      enum: ['Kids', 'Adults only', 'Family-friendly'],
      required: true
    },
    status: { type: String, enum: ['draft', 'published', 'paused'], default: 'published' },
    media: {
      coverImage: { type: AssetSchema, default: () => ({}) },
      images: { type: [AssetSchema], default: [] },
      videos: { type: [AssetSchema], default: [] },
      images360: { type: [AssetSchema], default: [] },
      itineraryPdf: { type: AssetSchema, default: () => ({}) }
    },
    smartFeatures: {
      autoImageCompression: { type: Boolean, default: true },
      aiImageEnhancement: { type: Boolean, default: false }
    },
    pricing: {
      currency: { type: String, enum: ['INR'], default: 'INR' },
      pricePerPerson: { type: Number, default: 0, min: 0 },
      groupPricing: { type: Number, default: 0, min: 0 },
      couplePricing: { type: Number, default: 0, min: 0 },
      childPricing: { type: Number, default: 0, min: 0 },
      weekendPricing: { type: Number, default: 0, min: 0 },
      seasonalPricing: { type: [SeasonalPricingSchema], default: [] },
      additionalCharges: {
        taxes: { type: Number, default: 0, min: 0 },
        equipmentFees: { type: Number, default: 0, min: 0 },
        entryTickets: { type: Number, default: 0, min: 0 },
        foodCharges: { type: Number, default: 0, min: 0 }
      },
      discounts: {
        earlyBird: { type: DiscountRuleSchema, default: () => ({}) },
        festivalOffer: { type: DiscountRuleSchema, default: () => ({}) },
        couponCode: { type: String, trim: true, default: '' },
        couponDiscount: { type: Number, default: 0, min: 0 },
        referralDiscount: { type: Number, default: 0, min: 0 }
      }
    },
    schedule: {
      availabilityType: {
        type: String,
        enum: ['daily', 'weekly', 'custom', 'recurring'],
        default: 'weekly'
      },
      weeklyDays: {
        type: [String],
        default: [],
        validate: {
          validator: (value = []) =>
            value.every((day) =>
              ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day)
            ),
          message: 'Invalid weekday in weekly schedule.'
        }
      },
      customDates: { type: [Date], default: [] },
      recurring: { type: RecurringScheduleSchema, default: () => ({}) },
      timeSlots: {
        type: [String],
        default: [],
        validate: {
          validator: (value = []) =>
            value.every((slot) => ['Morning', 'Afternoon', 'Evening', 'Night'].includes(slot)),
          message: 'Invalid time slot.'
        }
      },
      customTimeSlots: { type: [CustomTimeSlotSchema], default: [] },
      minTravelers: { type: Number, default: 1, min: 1 },
      maxTravelers: { type: Number, default: 10, min: 1 },
      blockedDates: { type: [Date], default: [] },
      autoCloseWhenFull: { type: Boolean, default: true },
      googleCalendarSync: {
        enabled: { type: Boolean, default: false },
        calendarEmail: { type: String, trim: true, default: '' },
        lastSyncedAt: { type: Date, default: null }
      }
    },
    socialSettings: {
      allowLikes: { type: Boolean, default: true },
      allowFollowing: { type: Boolean, default: true }
    },
    likes: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    followers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    participants: {
      type: [TourParticipantSchema],
      default: []
    },
    likesCount: { type: Number, default: 0, min: 0 },
    followersCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

TourSchema.index({ guideId: 1, createdAt: -1 });
TourSchema.index({ destination: 1, category: 1 });
TourSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Tour', TourSchema);
