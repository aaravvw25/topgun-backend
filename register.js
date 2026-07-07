const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db/pool');

const router = express.Router();

// Prevent spam/abuse: max 5 submissions per IP per 15 minutes.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { result: 'error', message: 'Too many attempts. Please try again later.' },
});

const VALID_DIVISIONS = new Set([
  "Men's RX",
  "Women's RX",
  "Men's Scaled",
  "Women's Scaled",
  "Teens (16-17)",
  "Masters (40+)",
]);

function isValidPhone(v) {
  return /^[0-9]{10}$/.test(v);
}
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const {
      name, phone, email, age, division, tshirt,
      emergencyContact, tgMembership,
    } = req.body || {};

    // Never trust the client — re-validate everything server-side.
    const errors = [];
    if (!name || String(name).trim().length < 2) errors.push('Full name is required.');
    if (!isValidPhone(String(phone || ''))) errors.push('Phone must be a 10-digit number.');
    const ageNum = parseInt(age, 10);
    if (!ageNum || ageNum < 16 || ageNum > 75) errors.push('Age must be between 16 and 75.');
    if (!isValidEmail(String(email || ''))) errors.push('A valid email is required.');
    if (!tgMembership || String(tgMembership).trim().length === 0) errors.push('TG Membership number is required.');
    if (!emergencyContact || String(emergencyContact).trim().length === 0) errors.push('Emergency contact is required.');
    if (!tshirt || String(tshirt).trim().length === 0) errors.push('T-shirt size is required.');
    if (!division || String(division).trim().length === 0) errors.push('Division is required.');

    if (errors.length) {
      return res.status(400).json({ result: 'error', message: errors[0] });
    }

    const insertQuery = `
      INSERT INTO registrations
        (name, phone, email, age, division, tshirt, emergency_contact, tg_membership)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at;
    `;
    const values = [
      String(name).trim(),
      String(phone).trim(),
      String(email).trim().toLowerCase(),
      ageNum,
      String(division).trim(),
      String(tshirt).trim(),
      String(emergencyContact).trim(),
      String(tgMembership).trim(),
    ];

    const result = await pool.query(insertQuery, values);

    return res.status(201).json({
      result: 'success',
      id: result.rows[0].id,
    });
  } catch (err) {
    // Postgres unique_violation on phone number
    if (err.code === '23505') {
      return res.status(409).json({
        result: 'error',
        message: 'This phone number has already been registered.',
      });
    }
    console.error('Registration error:', err);
    return res.status(500).json({
      result: 'error',
      message: 'Something went wrong on our end. Please try again.',
    });
  }
});

module.exports = router;
