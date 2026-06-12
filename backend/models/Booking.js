const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const GuidePaymentSnapshotSchema = new mongoose.Schema({
  payeeName: {
    type: String,
    trim: true,
    default: ''
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  qrImage: {
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
  }
}, { _id: false });

const PricingSnapshotSchema = new mongoose.Schema({
  rateType: {
    type: String,
    enum: ['hourly', 'daily'],
    default: 'daily'
  },
  guideRate: {
    type: Number,
    default: 0
  },
  units: {
    type: Number,
    default: 0
  },
  unitLabel: {
    type: String,
    trim: true,
    default: ''
  },
  destinationId: {
    type: String,
    trim: true,
    default: ''
  },
  destinationLabel: {
    type: String,
    trim: true,
    default: ''
  },
  subtotal: {
    type: Number,
    default: 0
  },
  platformFeeRate: {
    type: Number,
    default: 0.05
  },
  platformFeeAmount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  touristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDateTime: {
    type: Date,
    required: true
  },
  endDateTime: {
    type: Date,
    required: true
  },
  destination: {
    type: String,
    trim: true
  },
  sourceType: {
    type: String,
    enum: ['guide', 'tour'],
    default: 'guide'
  },
  sourceTourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    default: null
  },
  sourceTourParticipantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  sourceTourDateKey: {
    type: String,
    trim: true,
    default: ''
  },
  guestCount: {
    type: Number,
    default: 1,
    min: 1
  },
  specialRequests: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  advanceAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  pricingSnapshot: {
    type: PricingSnapshotSchema,
    default: () => ({})
  },
  guidePaymentSnapshot: {
    type: GuidePaymentSnapshotSchema,
    default: () => ({})
  },
  advancePaymentStatus: {
    type: String,
    enum: ['awaiting_payment', 'submitted', 'verified', 'rejected'],
    default: 'awaiting_payment'
  },
  advanceTxnRef: {
    type: String,
    trim: true,
    default: ''
  },
  advanceScreenshot: {
    type: String,
    trim: true,
    default: ''
  },
  advanceScreenshotPublicId: {
    type: String,
    trim: true,
    default: ''
  },
  advanceSubmittedAt: {
    type: Date,
    default: null
  },
  advanceVerifiedAt: {
    type: Date,
    default: null
  },
  advanceRejectedReason: {
    type: String,
    trim: true,
    default: ''
  },
  remainingPaymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  remainingPaymentMethod: {
    type: String,
    enum: ['', 'cash', 'direct_upi', 'bank_transfer', 'other'],
    default: ''
  },
  remainingPaymentNotes: {
    type: String,
    trim: true,
    default: ''
  },
  remainingPaidAt: {
    type: Date,
    default: null
  },
  paymentWindowExpiresAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
    required: true
  },
  // Review request system fields
  reviewRequestSent: { type: Boolean, default: false },
  reviewRequestMessage: { type: String, default: '' },
  reviewRequestStatus: { type: String, enum: ['accepted', 'declined', ''], default: '' },
  touristDeclineMessage: { type: String, default: '' }, // Message from tourist when declining
  canLeaveReview: { type: Boolean, default: false }, // Can only leave review after accepting
  reviewSubmitted: { type: Boolean, default: false }, // Review has been submitted
  messages: [MessageSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);
