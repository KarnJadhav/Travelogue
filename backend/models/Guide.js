const mongoose = require('mongoose');

const GuideSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bio: {
    type: String,
    trim: true
  },
  languages: [{
    name: { type: String, trim: true },
    level: { type: String, enum: ['Fluent', 'Intermediate', 'Basic'], default: 'Fluent' }
  }],
  experienceYears: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['INR'],
    default: 'INR'
  },
  rateType: {
    type: String,
    enum: ['hourly', 'daily'],
    default: 'daily'
  },
  serviceDestinations: [{
    destination: {
      type: String,
      trim: true,
      required: true
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  ratings: {
    type: Number,
    default: 4.5
  },
  earnings: {
    type: Number,
    default: 0
  },
  approved: {
    type: Boolean,
    default: false
  },
  rejected: {
    type: Boolean,
    default: false
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  travelogues: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Travelogue'
  }],
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // New professional fields
  guideVideo: {
    type: String,
    default: ''
  },
  tourMedia: [{
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      trim: true,
      default: ''
    },
    resourceType: {
      type: String,
      trim: true,
      default: ''
    },
    caption: {
      type: String,
      trim: true,
      default: ''
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  identityProof: {
    type: String,
    trim: true,
    default: ''
  },
  cancelPolicy: {
    type: String,
    enum: ['Free', 'Moderate', 'Strict'],
    default: 'Moderate'
  },
  tourTypes: [{
    type: String,
    trim: true
  }],
  averageResponseTime: {
    type: Number,
    default: 24
  },
  highlights: [{
    type: String,
    trim: true
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  verifiedPhone: {
    type: Boolean,
    default: false
  },
  verifiedID: {
    type: Boolean,
    default: false
  },
  verifiedPayment: {
    type: Boolean,
    default: false
  },
  acceptManualUpi: {
    type: Boolean,
    default: false
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  upiPayeeName: {
    type: String,
    trim: true,
    default: ''
  },
  upiQrImage: {
    type: String,
    trim: true,
    default: ''
  },
  upiQrPublicId: {
    type: String,
    trim: true,
    default: ''
  },
  advancePaymentType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  advancePaymentValue: {
    type: Number,
    default: 20
  },
  advancePaymentNotes: {
    type: String,
    trim: true,
    default: ''
  },
  lastBookingDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Guide', GuideSchema);
