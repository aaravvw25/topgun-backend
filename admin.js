const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

// Very simple shared-secret auth — enough to keep the list private.
// Send header:  x-admin-key: <your ADMIN_KEY value>
function requireAdminKey(req, res, next) {
  const key = req.header('x-admin-key');
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ result: 'error', message: 'ADMIN_KEY not configured on server.' });
  }
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ result: 'error', message: 'Unauthorized.' });
  }
  next();
}

router.get('/registrations', requireAdminKey, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, email, age, division, tshirt, emergency_contact, tg_membership, created_at FROM registrations ORDER BY created_at DESC;'
    );
    res.json({ result: 'success', count: result.rows.length, registrations: result.rows });
  } catch (err) {
    console.error('Admin list error:', err);
    res.status(500).json({ result: 'error', message: 'Failed to fetch registrations.' });
  }
});

router.get('/registrations/export', requireAdminKey, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, email, age, division, tshirt, emergency_contact, tg_membership, created_at FROM registrations ORDER BY created_at ASC;'
    );
    const header = 'id,name,phone,email,age,division,tshirt,emergency_contact,tg_membership,created_at';
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = result.rows.map((r) =>
      [r.id, r.name, r.phone, r.email, r.age, r.division, r.tshirt, r.emergency_contact, r.tg_membership, r.created_at]
        .map(escape)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Admin export error:', err);
    res.status(500).json({ result: 'error', message: 'Failed to export registrations.' });
  }
});

module.exports = router;
