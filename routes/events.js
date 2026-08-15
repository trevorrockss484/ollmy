// SSE 实时更新通道
const express = require('express');
const router = express.Router();
const bus = require('../database/events');

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: 'connected' });

  const onDaily = (payload) => send({ type: 'daily-changed', ...payload });
  bus.on('daily-changed', onDaily);
  const onCs = (payload) => send({ type: 'customer-stats-changed', ...payload });
  bus.on('customer-stats-changed', onCs);

  // 心跳保活
  const hb = setInterval(() => res.write(': ping\n\n'), 30000);

  req.on('close', () => {
    clearInterval(hb);
    bus.off('daily-changed', onDaily);
    bus.off('customer-stats-changed', onCs);
  });
});

module.exports = router;
