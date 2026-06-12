const { streamGuideReply, sanitizeHistory } = require('../services/guideAiService');

const STREAM_UNAVAILABLE_MESSAGE = 'Guide is temporarily unavailable';

const writeSse = (res, event, payload) => {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
};

const askGuide = async (req, res) => {
  const { query, history } = req.body || {};
  const safeQuery = typeof query === 'string' ? query.trim() : '';

  if (!safeQuery) {
    return res.status(400).json({ message: 'Query is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const abortController = new AbortController();
  let streamClosed = false;

  const handleDisconnect = () => {
    if (streamClosed) return;
    streamClosed = true;
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  };

  req.on('aborted', handleDisconnect);
  res.on('close', handleDisconnect);

  try {
    writeSse(res, 'ready', { status: 'streaming' });

    const safeHistory = sanitizeHistory(history);
    const meta = await streamGuideReply({
      query: safeQuery,
      history: safeHistory,
      signal: abortController.signal,
      onToken: (token) => {
        if (!streamClosed) {
          writeSse(res, 'token', { token });
        }
      },
    });

    if (!streamClosed) {
      writeSse(res, 'done', {
        provider: meta.provider,
        model: meta.model,
        finishReason: meta.finishReason,
        continuationCount: meta.continuationCount || 0,
      });
    }
  } catch (error) {
    if (streamClosed || abortController.signal.aborted) {
      return res.end();
    }
    console.error('[GuideAI] Streaming error:', error.message);
    writeSse(res, 'error', { message: STREAM_UNAVAILABLE_MESSAGE });
  }

  if (!res.writableEnded) {
    return res.end();
  }
  return undefined;
};

module.exports = {
  askGuide,
};
