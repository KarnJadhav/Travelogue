
const express = require('express');
const Travelogue = require('../models/Travelogue');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/uploadTravelogueMedia');
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require('../utils/cloudinaryUpload');

const router = express.Router();

async function uploadTravelogueFiles(files = [], userId) {
  const uploadedAssets = [];

  for (const file of files) {
    const result = await uploadAndCleanupLocalFile(file.path, {
      folder: `travel2/travelogues/${userId}`,
      resource_type: 'auto'
    });
    uploadedAssets.push(result);
  }

  return uploadedAssets;
}

async function cleanupLocalFiles(files = []) {
  await Promise.all(files.map((file) => safeRemoveLocalFile(file?.path)));
}

async function cleanupUploadedAssets(assets = []) {
  await Promise.all(
    assets
      .filter((asset) => asset?.public_id)
      .map((asset) =>
        destroyAsset(asset.public_id, {
          resource_type: asset.resource_type || 'image'
        }).catch(() => {})
      )
  );
}

// ===== CREATE / SUBMIT =====

// Create new travelogue (with full details)
router.post('/create', verifyToken, upload.array('media', 10), async (req, res) => {
  let uploadedAssets = [];

  try {
    const {
      title, description, destination, location, rating, tags,
      startDate, endDate, duration, travelersCount, estimatedCost,
      difficulty, season, highlights
    } = req.body;

    const userId = req.user.userId;
    uploadedAssets = req.files?.length ? await uploadTravelogueFiles(req.files, userId) : [];
    const images = uploadedAssets.map((asset) => asset.secure_url);

    let parsedTags = tags || [];
    if (typeof parsedTags === 'string') parsedTags = parsedTags.split(',').map(t => t.trim());

    let parsedHighlights = highlights || [];
    if (typeof parsedHighlights === 'string') parsedHighlights = parsedHighlights.split(',').map(h => h.trim());

    const travelogue = new Travelogue({
      title,
      description,
      images,
      userId,
      guideId: userId,
      location: location || destination,
      destination,
      rating: Number(rating) || 0,
      tags: parsedTags,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      duration: duration ? Number(duration) : null,
      travelersCount: Number(travelersCount) || 1,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      difficulty: difficulty || 'moderate',
      season,
      highlights: parsedHighlights,
      status: 'pending',
      publishedAt: new Date()
    });

    await travelogue.save();
    const populated = await travelogue.populate('userId', 'name email avatar');
    
    res.status(201).json({ 
      message: 'Travelogue submitted successfully!', 
      travelogue: populated 
    });
  } catch (err) {
    await cleanupUploadedAssets(uploadedAssets);
    await cleanupLocalFiles(req.files);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Save as draft
router.post('/draft', verifyToken, upload.array('media', 10), async (req, res) => {
  let uploadedAssets = [];

  try {
    const { _id, ...data } = req.body;
    const userId = req.user.userId;

    if (_id) {
      // Update existing draft
      const travelogue = await Travelogue.findByIdAndUpdate(
        _id,
        { ...data, status: 'draft', userId },
        { new: true }
      ).populate('userId', 'name email avatar');
      return res.json({ message: 'Draft saved!', travelogue });
    } else {
      // Create new draft
      uploadedAssets = req.files?.length ? await uploadTravelogueFiles(req.files, userId) : [];
      const images = uploadedAssets.map((asset) => asset.secure_url);
      const travelogue = new Travelogue({
        ...data,
        images,
        userId,
        status: 'draft'
      });
      await travelogue.save();
      const populated = await travelogue.populate('userId', 'name email avatar');
      res.status(201).json({ message: 'Draft created!', travelogue: populated });
    }
  } catch (err) {
    await cleanupUploadedAssets(uploadedAssets);
    await cleanupLocalFiles(req.files);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ===== READ / RETRIEVE =====

// Get all approved travelogues with search & filter
router.get('/all', async (req, res) => {
  try {
    const { search, destination, difficulty, season, sortBy, page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { status: 'approved' };

    if (search) {
      filter.$text = { $search: search };
    }
    if (destination) {
      filter.$or = [
        { destination: { $regex: destination, $options: 'i' } },
        { location: { $regex: destination, $options: 'i' } }
      ];
    }
    if (difficulty) filter.difficulty = difficulty;
    if (season) filter.season = season;

    let sort = { createdAt: -1 }; // Default: newest first
    if (sortBy === 'popular') sort = { views: -1 };
    if (sortBy === 'rated') sort = { rating: -1 };
    if (sortBy === 'liked') sort = { 'likes': -1 };

    const travelogues = await Travelogue.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'name email avatar')
      .select('-comments');

    const total = await Travelogue.countDocuments(filter);

    res.json({
      travelogues,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single travelogue details
router.get('/:id', async (req, res) => {
  try {
    const travelogue = await Travelogue.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('userId', 'name email avatar')
      .populate('comments.userId', 'name avatar email');

    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    res.json(travelogue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user's travelogues
router.get('/user/:userId', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { userId: req.params.userId };
    if (status) filter.status = status;

    const travelogues = await Travelogue.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'name email avatar');

    const total = await Travelogue.countDocuments(filter);

    res.json({
      travelogues,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ===== UPDATE =====

// Update travelogue
router.put('/:id', verifyToken, upload.array('media', 10), async (req, res) => {
  let uploadedAssets = [];

  try {
    const travelogue = await Travelogue.findById(req.params.id);
    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    if (travelogue.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Add new images if provided
    if (req.files && req.files.length > 0) {
      uploadedAssets = await uploadTravelogueFiles(req.files, req.user.userId);
      const newImages = uploadedAssets.map((asset) => asset.secure_url);
      travelogue.images = [...travelogue.images, ...newImages];
    }

    // Update fields
    Object.assign(travelogue, req.body);
    await travelogue.save();
    const updated = await travelogue.populate('userId', 'name email avatar');

    res.json({ message: 'Updated successfully!', travelogue: updated });
  } catch (err) {
    await cleanupUploadedAssets(uploadedAssets);
    await cleanupLocalFiles(req.files);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ===== DELETE =====

// Delete travelogue
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const travelogue = await Travelogue.findById(req.params.id);
    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    if (travelogue.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Travelogue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ===== SOCIAL ACTIONS =====

// Like/Unlike travelogue
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    const travelogue = await Travelogue.findById(req.params.id);
    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    const likeIndex = travelogue.likes.findIndex(l => l.userId.toString() === req.user.userId);

    if (likeIndex > -1) {
      travelogue.likes.splice(likeIndex, 1);
    } else {
      travelogue.likes.push({ userId: req.user.userId });
    }

    await travelogue.save();
    res.json({ 
      liked: likeIndex === -1, 
      likeCount: travelogue.likes.length 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Save/Unsave travelogue
router.post('/:id/save', verifyToken, async (req, res) => {
  try {
    const travelogue = await Travelogue.findById(req.params.id);
    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    const saveIndex = travelogue.saves.findIndex(s => s.userId.toString() === req.user.userId);

    if (saveIndex > -1) {
      travelogue.saves.splice(saveIndex, 1);
    } else {
      travelogue.saves.push({ userId: req.user.userId });
    }

    await travelogue.save();
    res.json({ 
      saved: saveIndex === -1, 
      saveCount: travelogue.saves.length 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ===== COMMENTS =====

// Add comment
router.post('/:id/comment', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const travelogue = await Travelogue.findById(req.params.id);
    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    const comment = {
      userId: req.user.userId,
      userName: req.body.userName || 'Anonymous',
      userAvatar: req.body.userAvatar || '',
      text,
      replies: [],
      createdAt: new Date()
    };

    travelogue.comments.push(comment);
    await travelogue.save();

    const populatedTravelogue = await travelogue.populate('comments.userId', 'name avatar email');
    const newComment = populatedTravelogue.comments[populatedTravelogue.comments.length - 1];

    res.status(201).json({ message: 'Comment added!', comment: newComment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete comment
router.delete('/:id/comment/:commentId', verifyToken, async (req, res) => {
  try {
    const travelogue = await Travelogue.findById(req.params.id);
    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    const comment = travelogue.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    travelogue.comments.id(req.params.commentId).deleteOne();
    await travelogue.save();

    res.json({ message: 'Comment deleted!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reply to comment
router.post('/:id/comment/:commentId/reply', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const travelogue = await Travelogue.findById(req.params.id);
    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    const comment = travelogue.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const reply = {
      userId: req.user.userId,
      userName: req.body.userName || 'Anonymous',
      userAvatar: req.body.userAvatar || '',
      text,
      createdAt: new Date()
    };

    comment.replies.push(reply);
    await travelogue.save();

    res.status(201).json({ message: 'Reply added!', reply });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ===== ADMIN ACTIONS =====

// Approve/Reject travelogue
router.post('/:id/action', verifyToken, async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'
    const travelogue = await Travelogue.findById(req.params.id);

    if (!travelogue) return res.status(404).json({ message: 'Travelogue not found' });

    if (action === 'approve') {
      travelogue.status = 'approved';
      travelogue.approvedAt = new Date();
    } else if (action === 'reject') {
      travelogue.status = 'rejected';
      travelogue.rejectionReason = rejectionReason || 'Rejected by admin';
    }

    await travelogue.save();
    res.json({ message: `Travelogue ${action}ed!`, travelogue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
