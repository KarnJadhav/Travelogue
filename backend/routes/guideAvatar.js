// guideAvatar.js - Avatar upload for guides
const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require('../utils/cloudinaryUpload');

const router = express.Router();

// Set up multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `guide_${req.user.userId}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Avatar upload endpoint for guides
router.post('/avatar', verifyToken, authorizeRoles('guide'), upload.single('avatar'), async (req, res) => {
  let uploaded = null;

  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    uploaded = await uploadAndCleanupLocalFile(req.file.path, {
      folder: `travel2/avatars/guides/${req.user.userId}`,
      resource_type: 'image'
    });
    const avatarUrl = uploaded.secure_url;
    // Update avatar in User collection
    const user = await User.findByIdAndUpdate(req.user.userId, { avatar: avatarUrl });
    if (!user) {
      if (uploaded?.public_id) {
        await destroyAsset(uploaded.public_id, { resource_type: 'image' }).catch(() => {});
      }
      return res.status(404).json({ message: 'Guide not found' });
    }
    res.json({ avatar: avatarUrl });
  } catch (err) {
    await safeRemoveLocalFile(req.file?.path);
    if (uploaded?.public_id) {
      await destroyAsset(uploaded.public_id, { resource_type: 'image' }).catch(() => {});
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
