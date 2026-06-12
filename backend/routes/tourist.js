const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require('../utils/cloudinaryUpload');

const router = express.Router();

/* ===============================
   MULTER CONFIG (Avatar Upload)
================================= */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ===============================
   GET TOURIST PROFILE BY USER ID
================================= */
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user || user.role !== 'tourist') {
      return res.status(404).json({ error: 'Tourist profile not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      fullName: user.fullName || user.name,
      dob: user.dob,
      gender: user.gender,
      language: user.language,
      nationality: user.nationality || user.country,
      country: user.country,
      interests: user.interests,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   UPDATE TOURIST PROFILE
================================= */
router.put('/:userId', verifyToken, async (req, res) => {
  try {
    const { fullName, phone, dob, gender, language, nationality, interests } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, role: 'tourist' },
      {
        fullName: fullName || req.body.fullName,
        phone: phone || req.body.phone,
        dob: dob || req.body.dob,
        gender: gender || req.body.gender,
        language: language || req.body.language,
        nationality: nationality || req.body.nationality,
        interests: interests || req.body.interests,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      fullName: user.fullName || user.name,
      dob: user.dob,
      gender: user.gender,
      language: user.language,
      nationality: user.nationality || user.country,
      country: user.country,
      interests: user.interests,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   UPDATE AVATAR
================================= */
router.post(
  '/avatar/:userId',
  verifyToken,
  upload.single('avatar'),
  async (req, res) => {
    let uploaded = null;

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      uploaded = await uploadAndCleanupLocalFile(req.file.path, {
        folder: `travel2/avatars/tourists/${req.params.userId}`,
        resource_type: 'image'
      });
      const avatarUrl = uploaded.secure_url;

      const user = await User.findOneAndUpdate(
        { _id: req.params.userId, role: 'tourist' },
        { avatar: avatarUrl },
        { new: true }
      );

      if (!user) {
        if (uploaded?.public_id) {
          await destroyAsset(uploaded.public_id, { resource_type: 'image' }).catch(() => {});
        }
        return res.status(404).json({ error: 'Tourist not found' });
      }

      res.json({ avatar: avatarUrl });
    } catch (err) {
      await safeRemoveLocalFile(req.file?.path);
      if (uploaded?.public_id) {
        await destroyAsset(uploaded.public_id, { resource_type: 'image' }).catch(() => {});
      }
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
