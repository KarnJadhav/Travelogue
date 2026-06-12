const mongoose = require('mongoose');


const ReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  place: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    trim: true
  },
  photo: {
    type: String // URL or file path
  },
  report: {
    type: String // Optional report text
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  guideReply: {
    type: String,
    trim: true
  },
  guideReplyDate: {
    type: Date
  },
  // Moderation fields
  isHidden: {
    type: Boolean,
    default: false
  },
  hiddenReason: {
    type: String,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedReason: {
    type: String,
    trim: true
  },
  // AI Content Moderation
  aiModeration: {
    isFlagged: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      enum: ['profanity', 'abusive', 'spam', 'irrelevant', 'other'],
      trim: true
    },
    flaggedWords: {
      type: [String],
      default: []
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    checkedAt: {
      type: Date
    }
  },
  adminNotes: {
    type: String,
    trim: true
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Review', ReviewSchema);
