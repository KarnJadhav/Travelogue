const express = require('express');
const Guide = require('../models/Guide');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

function parseCloudinaryDeliveryUrl(assetUrl = '') {
  try {
    const parsedUrl = new URL(String(assetUrl || '').trim());
    const host = String(parsedUrl.hostname || '').toLowerCase();
    if (!host.endsWith('res.cloudinary.com')) return null;

    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const resourceType = segments[1] || 'image';
    const deliveryType = segments[2] || 'upload';
    const deliveryIndex = segments.findIndex((segment) => segment === deliveryType);
    if (deliveryIndex < 0) return null;

    let remainder = segments.slice(deliveryIndex + 1);
    const versionIndex = remainder.findIndex((segment) => /^v\d+$/.test(segment));
    if (versionIndex >= 0) {
      remainder = remainder.slice(versionIndex + 1);
    }

    const assetPath = decodeURIComponent(remainder.join('/'));
    if (!assetPath) return null;

    const dotIndex = assetPath.lastIndexOf('.');
    const hasExtension = dotIndex > -1 && dotIndex < assetPath.length - 1;
    const format = hasExtension ? assetPath.slice(dotIndex + 1).toLowerCase() : '';
    const publicId = hasExtension ? assetPath.slice(0, dotIndex) : assetPath;

    if (!publicId) return null;

    return {
      resourceType,
      deliveryType,
      publicId,
      format
    };
  } catch (_err) {
    return null;
  }
}

function normalizeProofUrl(proofPath = '', req) {
  const raw = String(proofPath || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const safePath = raw.replace(/\\/g, '/');
  const prefixedPath = safePath.startsWith('/') ? safePath : `/${safePath}`;
  return `${req.protocol}://${req.get('host')}${prefixedPath}`;
}

async function resolveGuideIdentityProofUrl(guide, req) {
  const baseProofUrl = normalizeProofUrl(guide?.identityProof || '', req);
  if (!baseProofUrl) return '';

  const lowerUrl = baseProofUrl.split('?')[0].toLowerCase();
  const isPdf = lowerUrl.endsWith('.pdf');
  if (!isPdf || !/https?:\/\/res\.cloudinary\.com\//i.test(baseProofUrl)) {
    return baseProofUrl;
  }

  const parsedAsset = parseCloudinaryDeliveryUrl(baseProofUrl);
  if (!parsedAsset?.publicId) return baseProofUrl;

  const format = parsedAsset.format || 'pdf';
  return cloudinary.utils.private_download_url(parsedAsset.publicId, format, {
    resource_type: parsedAsset.resourceType || 'image',
    type: parsedAsset.deliveryType || 'upload',
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment: false
  });
}

// List pending guides
router.get('/pending', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const pendingGuides = await Guide.find({ approved: false }).populate('userId');
    res.json({ guides: pendingGuides });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get guide identity proof URL (signed for Cloudinary PDFs)
router.get('/identity-proof-url/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const guide = await Guide.findById(req.params.id).select('identityProof').lean();
    if (!guide) return res.status(404).json({ message: 'Guide not found' });
    if (!guide.identityProof) {
      return res.status(404).json({ message: 'Identity proof not found' });
    }

    const url = await resolveGuideIdentityProofUrl(guide, req);
    if (!url) {
      return res.status(404).json({ message: 'Identity proof not found' });
    }

    return res.json({ url });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to resolve identity proof URL', error: err.message });
  }
});

// Approve or reject guide
router.post('/action/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const guideId = req.params.id;
    const guide = await Guide.findById(guideId).populate('userId');
    if (!guide) return res.status(404).json({ message: 'Guide not found' });
    if (action === 'approve') {
      guide.approved = true;
      guide.verifiedID = Boolean(guide.identityProof);
      guide.currency = 'INR';
      await guide.save();
      try {
        await sendEmail(
          guide.userId.email,
          'Guide Application Approved',
          'Congratulations! Your guide application has been approved.',
          { context: 'Guide approval' }
        );
      } catch (emailErr) {
        console.error('Failed to send approval email:', emailErr.message);
        // Optionally, you can log this or notify admin, but don't fail the request
      }
      res.json({ message: 'Guide approved', guide });
    } else if (action === 'reject') {
      try {
        await sendEmail(
          guide.userId.email,
          'Guide Application Rejected',
          'Sorry, your guide application has been rejected.',
          { context: 'Guide rejection' }
        );
      } catch (emailErr) {
        console.error('Failed to send rejection email:', emailErr.message);
      }
      guide.rejected = true;
      guide.approved = false;
      guide.currency = 'INR';
      await guide.save();
      res.json({ message: 'Guide rejected', guide });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
