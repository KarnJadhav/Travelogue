const express = require('express');
const router = express.Router();
const {
  generate,
  saveGenerated,
  listSaved,
  getSavedById,
  updateSaved,
  deleteSaved,
  getPreferences,
  downloadPdf,
  getSocialContent,
} = require('../controllers/itineraryController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.use(verifyToken, authorizeRoles('tourist'));
router.get('/preferences', getPreferences);
router.get('/social-content', getSocialContent);
router.get('/saved', listSaved);
router.get('/saved/:id', getSavedById);
router.post('/generate', generate);
router.post('/saved', saveGenerated);
router.put('/saved/:id', updateSaved);
router.delete('/saved/:id', deleteSaved);
router.post('/pdf', downloadPdf);

module.exports = router;
