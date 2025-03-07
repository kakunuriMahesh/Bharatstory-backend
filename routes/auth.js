const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log('POST /auth/login - Received:', { username, password });
  console.log('POST /auth/login - JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');

  if (!process.env.JWT_SECRET) {
    console.error('POST /auth/login - JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing' });
  }

  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    console.log('POST /auth/login - Invalid credentials');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('POST /auth/login - Success, token generated:', token);
    res.json({ token });
  } catch (err) {
    console.error('POST /auth/login - Token generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate token', details: err.message });
  }
});

module.exports = router;