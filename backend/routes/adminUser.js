const express = require('express');
const User = require('../models/User');
const Guide = require('../models/Guide');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    // Get all users
    const users = await User.find({}, '-password').lean();
    // Get all guides (to check approval status)
    const guides = await Guide.find({}).lean();
    // Map guide approval status to users
    const guideMap = {};
    guides.forEach(g => {
      if (g.userId) guideMap[g.userId.toString()] = g;
    });
    // Attach guide approval status to user if role is guide
    const usersWithGuideStatus = users.map(u => {
      let status = 'active';
      let rejected = false;
      if (u.role === 'guide') {
        const guide = guideMap[u._id.toString()];
        if (guide) {
          rejected = !!guide.rejected;
          if (guide.rejected) {
            status = 'rejected';
          } else {
            status = guide.approved ? 'active' : 'pending';
          }
        } else {
          status = 'pending';
        }
      }
      return {
        ...u,
        status,
        rejected,
        guideId: guideMap[u._id.toString()]?._id || null,
        guideIdentityProof: guideMap[u._id.toString()]?.identityProof || '',
        guideVerifiedID: !!guideMap[u._id.toString()]?.verifiedID
      };
    });
    res.json({ users: usersWithGuideStatus });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Delete a user (admin only)
router.delete('/users/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // If user is a guide, delete their guide profile too
    if (user.role === 'guide') {
      await Guide.deleteOne({ userId: user._id });
    }
    await User.deleteOne({ _id: user._id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
