const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  try { res.json({ success: true, data: db.getSalesPersons() }); }
  catch(e) { res.status(500).json({ success: false, error: '服务器内部错误' }); }
});

router.post('/', (req, res) => {
  try {
    const { name, group } = req.body || {};
    if (!name) return res.json({ success: false, error: '名称不能为空' });
    const person = db.addSalesPerson({ name: name.trim(), group: (group || '').trim() });
    res.json({ success: true, data: person });
  } catch(e) { res.status(500).json({ success: false, error: '服务器内部错误' }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.deleteSalesPerson(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, error: '服务器内部错误' }); }
});

module.exports = router;
