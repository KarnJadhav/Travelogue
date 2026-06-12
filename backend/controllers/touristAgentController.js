const { handleCommand } = require('../services/touristAgentService');

const processCommand = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { command, pendingAction } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await handleCommand({
      command,
      userId,
      pendingAction: pendingAction || null,
    });

    return res.json({
      success: Boolean(result?.success),
      reply: result?.reply || 'Done.',
      action: result?.action || null,
      pendingAction: result?.pendingAction || null,
      data: result?.data || null,
      result: result?.result || null,
    });
  } catch (error) {
    console.error('[TouristAgent] processCommand error:', error.message);
    return res.status(500).json({
      success: false,
      reply: 'Agent is temporarily unavailable. Please try again.',
      action: null,
      pendingAction: null,
    });
  }
};

module.exports = {
  processCommand,
};
