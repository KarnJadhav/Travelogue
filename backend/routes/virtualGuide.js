const express = require('express');
const router = express.Router();
const { ask } = require('../controllers/virtualGuideController');

router.post('/ask', ask);

module.exports = router;
