const express = require('express');
const Guide = require('../models/Guide');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require('../utils/cloudinaryUpload');

const router = express.Router();

const USER_PROFILE_FIELDS = 'name email phone country interests avatar role';
const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
const MAX_SERVICE_DESTINATIONS = 5;

const guideMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/guide-media');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext || '.bin';
    cb(null, `guide_${req.user.userId}_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const guidePaymentQrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/guide-payments');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext || '.png';
    cb(null, `guide_payment_${req.user.userId}_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const guideMediaFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Only image and video files are allowed.'));
};

const paymentQrFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Only image files are allowed for QR uploads.'));
};

const uploadGuideMedia = multer({
  storage: guideMediaStorage,
  fileFilter: guideMediaFileFilter,
  limits: { fileSize: 60 * 1024 * 1024 }
});

const uploadPaymentQr = multer({
  storage: guidePaymentQrStorage,
  fileFilter: paymentQrFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const runGuideMediaUpload = (req, res, next) => {
  uploadGuideMedia.array('media', 12)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    res.status(400).json({ message: err.message || 'Media upload failed' });
  });
};

async function cleanupLocalFiles(files = []) {
  await Promise.all(files.map((file) => safeRemoveLocalFile(file?.path)));
}

function toGuidePayload(guide) {
  const payload = guide.toObject();
  const user = payload.userId && typeof payload.userId === 'object' ? payload.userId : {};

  payload.name = user.name || payload.name || '';
  payload.email = user.email || payload.email || '';
  payload.phone = payload.phone || user.phone || '';
  payload.country = user.country || payload.country || '';
  payload.interests = user.interests || payload.interests || '';
  payload.avatar = user.avatar || payload.avatar || '';
  payload.currency = 'INR';

  return payload;
}

function normalizeLanguages(languages) {
  const rawLanguages = Array.isArray(languages)
    ? languages
    : String(languages || '')
        .split(/[\n,]+/)
        .map((language) => language.trim())
        .filter(Boolean);

  return rawLanguages
    .map((language) => {
      if (typeof language === 'string') {
        const name = language.trim();
        return name ? { name, level: 'Fluent' } : null;
      }
      if (language && typeof language === 'object') {
        const name = String(language.name || '').trim();
        if (!name) return null;
        return { name, level: language.level || 'Fluent' };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeDestinationLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeDestinationKey(value) {
  return normalizeDestinationLabel(value).toLowerCase();
}

function normalizeServiceDestinations(serviceDestinations, fallbackPrice = 0) {
  let rawList = [];

  if (Array.isArray(serviceDestinations)) {
    rawList = serviceDestinations;
  } else if (typeof serviceDestinations === 'string') {
    const trimmed = serviceDestinations.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        rawList = Array.isArray(parsed) ? parsed : [];
      } catch (_err) {
        rawList = trimmed
          .split(/\n+/)
          .map((entry) => ({ destination: entry, price: fallbackPrice }));
      }
    }
  }

  const seen = new Set();
  const normalized = [];

  rawList.forEach((entry) => {
    if (!entry) return;

    const destination = normalizeDestinationLabel(
      typeof entry === 'string'
        ? entry
        : entry.destination || entry.name || entry.location || entry.label || ''
    );
    if (!destination) return;

    const destinationKey = normalizeDestinationKey(destination);
    if (!destinationKey || seen.has(destinationKey)) return;

    const parsedPrice = Number(
      typeof entry === 'string'
        ? fallbackPrice
        : (entry.price ?? entry.amount ?? fallbackPrice)
    );

    normalized.push({
      destination,
      price: Number.isFinite(parsedPrice) ? parsedPrice : NaN
    });
    seen.add(destinationKey);
  });

  return normalized;
}

// View guide profile
router.get('/', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.userId })
      .populate('userId', USER_PROFILE_FIELDS)
      .populate('travelogues')
      .populate('bookings');
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });
    const payload = toGuidePayload(guide);
    res.json({ guide: payload, user: payload.userId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update guide profile
router.put('/', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const {
      name,
      bio,
      languages,
      experienceYears,
      earnings,
      ratings,
      phone,
      country,
      interests,
      price,
      rateType,
      serviceDestinations,
      guideVideo,
      acceptManualUpi,
      upiId,
      upiPayeeName,
      advancePaymentType,
      advancePaymentValue,
      advancePaymentNotes
    } = req.body;
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) return res.status(400).json({ message: 'Full name is required' });
      user.name = trimmedName;
    }

    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();
      if (!trimmedPhone) return res.status(400).json({ message: 'Phone number is required' });
      user.phone = trimmedPhone;
      guide.phone = trimmedPhone;
    }

    if (country !== undefined) {
      const trimmedCountry = String(country).trim();
      if (!trimmedCountry) return res.status(400).json({ message: 'Country is required' });
      user.country = trimmedCountry;
    }

    if (interests !== undefined) {
      user.interests = String(interests || '').trim();
    }
    
    if (bio !== undefined) guide.bio = bio;
    
    if (languages !== undefined) {
      const normalizedLanguages = normalizeLanguages(languages);
      if (!normalizedLanguages.length) {
        return res.status(400).json({ message: 'Please enter at least one language' });
      }
      guide.languages = normalizedLanguages;
    }
    
    if (experienceYears !== undefined) {
      const experienceNumber = Number(experienceYears);
      if (!Number.isFinite(experienceNumber) || experienceNumber < 0) {
        return res.status(400).json({ message: 'Enter valid years of experience' });
      }
      guide.experienceYears = experienceNumber;
    }
    if (earnings !== undefined) guide.earnings = earnings;
    if (ratings !== undefined) guide.ratings = ratings;
    guide.currency = 'INR';
    if (rateType !== undefined) guide.rateType = rateType;
    if (guideVideo !== undefined) guide.guideVideo = String(guideVideo || '').trim();

    if (serviceDestinations !== undefined) {
      const normalizedServiceDestinations = normalizeServiceDestinations(serviceDestinations, guide.price || 0);

      if (normalizedServiceDestinations.length === 0) {
        return res.status(400).json({ message: 'Add at least one local destination with a price.' });
      }

      if (normalizedServiceDestinations.length > MAX_SERVICE_DESTINATIONS) {
        return res.status(400).json({ message: `You can add up to ${MAX_SERVICE_DESTINATIONS} local destinations.` });
      }

      const invalidPrice = normalizedServiceDestinations.find((entry) => !Number.isFinite(entry.price) || entry.price <= 0);
      if (invalidPrice) {
        return res.status(400).json({ message: 'Each destination must have a valid price greater than 0.' });
      }

      guide.serviceDestinations = normalizedServiceDestinations.map((entry) => ({
        destination: entry.destination,
        price: Math.round(entry.price)
      }));

      const minDestinationPrice = Math.min(...guide.serviceDestinations.map((entry) => Number(entry.price || 0)).filter((value) => value > 0));
      if (Number.isFinite(minDestinationPrice) && minDestinationPrice > 0) {
        guide.price = minDestinationPrice;
      }
    } else if (price !== undefined) {
      guide.price = Number(price);
    }

    if (acceptManualUpi !== undefined) {
      guide.acceptManualUpi = Boolean(acceptManualUpi);
    }

    if (upiId !== undefined) {
      const normalizedUpiId = String(upiId || '').trim();
      if (normalizedUpiId && !UPI_ID_REGEX.test(normalizedUpiId)) {
        return res.status(400).json({ message: 'Enter a valid UPI ID like yourname@bank.' });
      }
      guide.upiId = normalizedUpiId;
    }

    if (upiPayeeName !== undefined) {
      guide.upiPayeeName = String(upiPayeeName || '').trim();
    }

    if (advancePaymentType !== undefined) {
      const normalizedAdvanceType = String(advancePaymentType);
      if (!['percentage', 'fixed'].includes(normalizedAdvanceType)) {
        return res.status(400).json({ message: 'Advance payment type must be percentage or fixed.' });
      }
      guide.advancePaymentType = normalizedAdvanceType;
    }

    if (advancePaymentValue !== undefined) {
      const numericAdvanceValue = Number(advancePaymentValue);
      if (!Number.isFinite(numericAdvanceValue) || numericAdvanceValue <= 0) {
        return res.status(400).json({ message: 'Advance payment value must be greater than zero.' });
      }
      if ((guide.advancePaymentType || 'percentage') === 'percentage' && numericAdvanceValue > 100) {
        return res.status(400).json({ message: 'Advance percentage cannot be more than 100.' });
      }
      guide.advancePaymentValue = numericAdvanceValue;
    }

    if (advancePaymentNotes !== undefined) {
      guide.advancePaymentNotes = String(advancePaymentNotes || '').trim();
    }

    if (guide.acceptManualUpi) {
      if (!guide.upiId || !UPI_ID_REGEX.test(guide.upiId)) {
        return res.status(400).json({ message: 'Add a valid UPI ID before enabling advance payments.' });
      }
      if (!guide.upiPayeeName) {
        return res.status(400).json({ message: 'Add the UPI payee name before enabling advance payments.' });
      }
      if (!guide.upiQrImage) {
        return res.status(400).json({ message: 'Upload a payment QR code before enabling advance payments.' });
      }
    }

    guide.verifiedPayment = Boolean(guide.acceptManualUpi && guide.upiId && guide.upiPayeeName && guide.upiQrImage);
    
    await user.save();
    await guide.save();
    await guide.populate('userId', USER_PROFILE_FIELDS);
    const payload = toGuidePayload(guide);
    res.json({ message: 'Profile updated', guide: payload, user: payload.userId });
  } catch (err) {
    console.error('Error updating guide profile:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/payment-qr', verifyToken, authorizeRoles('guide'), uploadPaymentQr.single('paymentQr'), async (req, res) => {
  let uploaded = null;

  try {
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });
    if (!req.file) return res.status(400).json({ message: 'Please upload a QR image.' });

    uploaded = await uploadAndCleanupLocalFile(req.file.path, {
      folder: `travel2/guides/${req.user.userId}/payment-qr`,
      resource_type: 'image'
    });

    const previousPublicId = guide.upiQrPublicId || '';
    guide.upiQrImage = uploaded.secure_url;
    guide.upiQrPublicId = uploaded.public_id || '';
    guide.verifiedPayment = Boolean(guide.acceptManualUpi && guide.upiId && guide.upiPayeeName && guide.upiQrImage);
    await guide.save();
    await guide.populate('userId', USER_PROFILE_FIELDS);

    if (previousPublicId) {
      await destroyAsset(previousPublicId, { resource_type: 'image' }).catch(() => {});
    }

    const payload = toGuidePayload(guide);
    res.json({ message: 'Payment QR uploaded.', guide: payload, user: payload.userId });
  } catch (err) {
    await safeRemoveLocalFile(req.file?.path);
    if (uploaded?.public_id) {
      await destroyAsset(uploaded.public_id, { resource_type: 'image' }).catch(() => {});
    }
    console.error('Error uploading guide payment QR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/payment-qr', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });

    const previousPublicId = guide.upiQrPublicId || '';
    guide.upiQrImage = '';
    guide.upiQrPublicId = '';
    guide.acceptManualUpi = false;
    guide.verifiedPayment = false;
    await guide.save();
    await guide.populate('userId', USER_PROFILE_FIELDS);

    if (previousPublicId) {
      await destroyAsset(previousPublicId, { resource_type: 'image' }).catch(() => {});
    }

    const payload = toGuidePayload(guide);
    res.json({ message: 'Payment QR removed.', guide: payload, user: payload.userId });
  } catch (err) {
    console.error('Error removing guide payment QR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload completed-tour photos/videos for guide profile
router.post('/media', verifyToken, authorizeRoles('guide'), runGuideMediaUpload, async (req, res) => {
  const uploadedAssets = [];

  try {
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image or video file.' });
    }

    const newMedia = [];
    for (const file of req.files) {
      const uploaded = await uploadAndCleanupLocalFile(file.path, {
        folder: `travel2/guides/${req.user.userId}/tour-media`,
        resource_type: 'auto'
      });
      uploadedAssets.push(uploaded);
      newMedia.push({
        mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        resourceType: uploaded.resource_type,
        caption: '',
        uploadedAt: new Date()
      });
    }

    const currentMedia = Array.isArray(guide.tourMedia) ? guide.tourMedia : [];
    guide.tourMedia = [...currentMedia, ...newMedia];

    if (!guide.guideVideo) {
      const firstVideo = newMedia.find((item) => item.mediaType === 'video');
      if (firstVideo) guide.guideVideo = firstVideo.url;
    }

    await guide.save();
    await guide.populate('userId', USER_PROFILE_FIELDS);
    const payload = toGuidePayload(guide);
    res.json({ message: 'Media uploaded successfully.', guide: payload, user: payload.userId });
  } catch (err) {
    await cleanupLocalFiles(req.files);
    await Promise.all(
      uploadedAssets
        .filter((asset) => asset?.public_id)
        .map((asset) =>
          destroyAsset(asset.public_id, {
            resource_type: asset.resource_type || 'image'
          }).catch(() => {})
        )
    );
    console.error('Error uploading guide media:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove one completed-tour media item from guide profile
router.delete('/media/:mediaId', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });

    const mediaId = String(req.params.mediaId || '');
    const mediaList = Array.isArray(guide.tourMedia) ? guide.tourMedia : [];
    const mediaToRemove = mediaList.find((item) => item && String(item._id) === mediaId);
    if (!mediaToRemove) return res.status(404).json({ message: 'Media item not found' });

    const removeUrl = mediaToRemove.url || '';
    guide.tourMedia = mediaList.filter((item) => String(item._id) !== mediaId);

    if (removeUrl && guide.guideVideo === removeUrl) {
      const fallbackVideo = guide.tourMedia.find((item) => item.mediaType === 'video');
      guide.guideVideo = fallbackVideo ? fallbackVideo.url : '';
    }

    await guide.save();

    if (mediaToRemove.publicId) {
      await destroyAsset(mediaToRemove.publicId, {
        resource_type: mediaToRemove.resourceType || (mediaToRemove.mediaType === 'video' ? 'video' : 'image')
      }).catch(() => {});
    }

    if (removeUrl.startsWith('/uploads/guide-media/')) {
      const filename = path.basename(removeUrl);
      const filePath = path.join(__dirname, '../uploads/guide-media', filename);
      fs.unlink(filePath, () => {});
    }

    await guide.populate('userId', USER_PROFILE_FIELDS);
    const payload = toGuidePayload(guide);
    res.json({ message: 'Media removed successfully.', guide: payload, user: payload.userId });
  } catch (err) {
    console.error('Error deleting guide media:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
