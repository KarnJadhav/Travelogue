const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  userAvatar: String,
  text: {
    type: String,
    required: true,
    trim: true
  },
  replies: [{
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userAvatar: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const TravelogueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  location: {
    type: String,
    trim: true
  },
  destination: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'draft'],
    default: 'pending',
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Trip Details
  startDate: Date,
  endDate: Date,
  duration: Number, // in days
  travelersCount: {
    type: Number,
    default: 1
  },
  estimatedCost: Number,
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging'],
    default: 'moderate'
  },
  season: String, // e.g., 'Spring', 'Summer', 'Fall', 'Winter'
  highlights: [String], // Key attractions
  
  // Social Features
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    userId: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now }
  }],
  saves: [{
    userId: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [CommentSchema],
  shares: {
    type: Number,
    default: 0
  },
  
  // Status tracking
  publishedAt: Date,
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Index for better search performance
TravelogueSchema.index({ title: 'text', description: 'text', tags: 'text', location: 'text', destination: 'text' });
TravelogueSchema.index({ userId: 1, status: 1 });
TravelogueSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Travelogue', TravelogueSchema);
