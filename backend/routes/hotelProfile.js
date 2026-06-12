const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require("../utils/cloudinaryUpload");

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/hotelImages'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Get hotel images for a user
router.get("/images/:userId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'hotel') return res.status(404).json({ error: 'Hotel not found' });
    res.json({ images: user.hotelImages || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add image URL to hotel profile
router.post("/images/url/:userId", verifyToken, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $push: { hotelImages: url } },
      { new: true }
    );
    res.json({ images: user.hotelImages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload image file to hotel profile
router.post("/images/upload/:userId", verifyToken, upload.single('image'), async (req, res) => {
  let uploaded = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    uploaded = await uploadAndCleanupLocalFile(req.file.path, {
      folder: `travel2/hotels/${req.params.userId}/images`,
      resource_type: "auto"
    });
    const imageUrl = uploaded.secure_url;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $push: { hotelImages: imageUrl } },
      { new: true }
    );
    if (!user) {
      if (uploaded?.public_id) {
        await destroyAsset(uploaded.public_id, {
          resource_type: uploaded.resource_type || "image"
        }).catch(() => {});
      }
      return res.status(404).json({ error: "Hotel user not found" });
    }
    res.json({ images: user.hotelImages });
  } catch (err) {
    await safeRemoveLocalFile(req.file?.path);
    if (uploaded?.public_id) {
      await destroyAsset(uploaded.public_id, {
        resource_type: uploaded.resource_type || "image"
      }).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  }
});

// Remove image from hotel profile
router.delete("/images/:userId", verifyToken, async (req, res) => {
  try {
    const { url } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $pull: { hotelImages: url } },
      { new: true }
    );
    res.json({ images: user.hotelImages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
