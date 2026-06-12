const { askVirtualGuide } = require('../services/virtualGuideService');

const ask = async (req, res) => {
  try {
    const { question, destination, model, attachments } = req.body || {};

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ message: 'Question is required.' });
    }

    const result = await askVirtualGuide({
      question: question.trim(),
      destination: destination ? String(destination).trim() : '',
      model: model ? String(model).trim() : '',
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    return res.json(result);
  } catch (error) {
    console.error('[VirtualGuide] Error:', error.message);
    return res.status(500).json({
      message: 'Virtual guide is unavailable right now. Check AI provider configuration.',
    });
  }
};

module.exports = {
  ask,
};
