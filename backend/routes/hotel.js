const express = require("express");
const router = express.Router();
const Hotel = require("../models/Hotel");
const { verifyToken } = require("../middleware/auth");
const User = require("../models/User");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require("../utils/cloudinaryUpload");

const HOTEL_IMAGE_UPLOAD_DIR = path.join(__dirname, "../uploads/hotelImages");
const HOTEL_LICENSE_UPLOAD_DIR = path.join(__dirname, "../uploads/hotelLicenses");
const PROOF_MAX_SIZE = 8 * 1024 * 1024;
const PROOF_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const PROOF_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"]);

fs.mkdirSync(HOTEL_IMAGE_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(HOTEL_LICENSE_UPLOAD_DIR, { recursive: true });

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, HOTEL_IMAGE_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const licenseUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, HOTEL_LICENSE_UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `hotel_license_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`);
    }
  }),
  limits: { fileSize: PROOF_MAX_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (PROOF_MIME_TYPES.has(file.mimetype) || PROOF_EXTENSIONS.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Business license must be a PDF or image file"));
  }
});

function handleLicenseUpload(req, res, next) {
  licenseUpload.single("businessLicense")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Business license must be 8 MB or smaller" });
    }
    return res.status(400).json({ error: err.message || "Invalid business license upload" });
  });
}

// Get hotel profile by userId
router.get("/profile/:userId", verifyToken, async (req, res) => {
  try {
    const [hotel, user] = await Promise.all([
      Hotel.findOne({ user: req.params.userId }).lean(),
      User.findById(req.params.userId).select("name email phone country address amenities").lean(),
    ]);
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
    res.json({
      ...hotel,
      ownerName: hotel.ownerName || user?.name || "",
      email: hotel.email || user?.email || "",
      phone: hotel.phone || user?.phone || "",
      country: hotel.country || user?.country || "",
      address: hotel.address || user?.address || "",
      amenities: Array.from(new Set([...(hotel.amenities || []), ...(user?.amenities || [])])).filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all hotels with owner details
router.get("/list", verifyToken, async (req, res) => {
  try {
    const hotels = await Hotel.find().populate("user", "name email phone country amenities address avatar");
    const payload = hotels.map((hotel) => {
      const hotelAmenities = hotel.amenities || [];
      const userAmenities = hotel.user?.amenities || [];
      const amenities = Array.from(new Set([...hotelAmenities, ...userAmenities])).filter(Boolean);
      return ({
      _id: hotel._id,
      user: hotel.user?._id,
      ownerName: hotel.ownerName || hotel.user?.name || "",
      ownerEmail: hotel.user?.email || "",
      ownerPhone: hotel.user?.phone || "",
      ownerAvatar: hotel.user?.avatar || "",
      country: hotel.country || hotel.user?.country || "",
      name: hotel.name,
      email: hotel.email,
      phone: hotel.phone,
      address: hotel.address || hotel.user?.address || "",
      cityState: hotel.cityState || "",
      hotelType: hotel.hotelType || "",
      businessLicenseProof: hotel.businessLicenseProof || "",
      amenities,
      images: hotel.images || [],
      updatedAt: hotel.updatedAt,
    });
    });
    res.json({ hotels: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update hotel profile
router.put("/profile/:userId", verifyToken, async (req, res) => {
  try {
    const {
      ownerName,
      name,
      email,
      phone,
      address,
      cityState,
      hotelType,
      businessLicenseProof,
      amenities,
      images
    } = req.body;
    // Basic validation
    if (!ownerName || !name || !email || !phone) {
      return res.status(400).json({ error: 'Owner name, hotel name, email, and phone are required.' });
    }
    const hotelUpdate = {
      ownerName,
      name,
      email,
      phone,
      address,
      cityState,
      hotelType,
      businessLicenseProof,
      amenities: Array.isArray(amenities) ? amenities : [],
      images: Array.isArray(images) ? images : [],
      updatedAt: Date.now()
    };
    if (req.body.country !== undefined) {
      hotelUpdate.country = req.body.country;
    }
    // Update Hotel collection only
    const hotel = await Hotel.findOneAndUpdate(
      { user: req.params.userId },
      hotelUpdate,
      { new: true, upsert: true }
    );
    // Keep User profile in sync for amenities/address/name/email/phone
    try {
      const userUpdate = {
        name: ownerName,
        email,
        phone,
        address,
        amenities: Array.isArray(amenities) ? amenities : []
      };
      if (req.body.country !== undefined) {
        userUpdate.country = req.body.country;
      }
      await User.findByIdAndUpdate(req.params.userId, userUpdate, { new: false });
    } catch (e) {
      console.log("[DEBUG] User sync failed (hotel profile):", e);
    }
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload business license / hotel registration proof
router.post("/license/upload/:userId", verifyToken, handleLicenseUpload, async (req, res) => {
  let uploaded = null;

  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    uploaded = await uploadAndCleanupLocalFile(req.file.path, {
      folder: `travel2/hotels/${req.params.userId}/licenses`,
      resource_type: "auto"
    });
    const proofUrl = uploaded.secure_url;
    const hotel = await Hotel.findOneAndUpdate(
      { user: req.params.userId },
      { $set: { businessLicenseProof: proofUrl, updatedAt: Date.now() } },
      { new: true }
    );
    if (!hotel) {
      if (uploaded?.public_id) {
        await destroyAsset(uploaded.public_id, {
          resource_type: uploaded.resource_type || "raw"
        }).catch(() => {});
      }
      return res.status(404).json({ error: "Hotel not found" });
    }
    res.json({ hotel, businessLicenseProof: proofUrl });
  } catch (err) {
    await safeRemoveLocalFile(req.file?.path);
    if (uploaded?.public_id) {
      await destroyAsset(uploaded.public_id, {
        resource_type: uploaded.resource_type || "raw"
      }).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  }
});

// Add image URL
router.post("/images/url/:userId", verifyToken, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const hotel = await Hotel.findOneAndUpdate(
      { user: req.params.userId },
      { $push: { images: url }, $set: { updatedAt: Date.now() } },
      { new: true, upsert: true }
    );
    res.json(hotel.images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload image file
router.post("/images/upload/:userId", verifyToken, upload.single('image'), async (req, res) => {
  let uploaded = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    uploaded = await uploadAndCleanupLocalFile(req.file.path, {
      folder: `travel2/hotels/${req.params.userId}/images`,
      resource_type: "auto"
    });
    const imageUrl = uploaded.secure_url;
    const hotel = await Hotel.findOneAndUpdate(
      { user: req.params.userId },
      { $push: { images: imageUrl }, $set: { updatedAt: Date.now() } },
      { new: true, upsert: true }
    );
    res.json(hotel.images);
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

// Remove image
router.delete("/images/:userId", verifyToken, async (req, res) => {
  try {
    const { url } = req.body;
    const hotel = await Hotel.findOneAndUpdate(
      { user: req.params.userId },
      { $pull: { images: url }, $set: { updatedAt: Date.now() } },
      { new: true }
    );
    res.json(hotel.images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
