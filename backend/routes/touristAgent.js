const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { processCommand } = require('../controllers/touristAgentController');

const router = express.Router();

router.post('/command', verifyToken, authorizeRoles('tourist'), processCommand);

module.exports = router;
