const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('POST /auth/login - Received:', { username, password });
  console.log('POST /auth/login - JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');

  if (!process.env.JWT_SECRET) {
    console.error('POST /auth/login - JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing' });
  }

  try {
    const adminConnection = req.app.get('adminConnection');
    const Admin = adminConnection.model('Admin', adminSchema);

    const admin = await Admin.findOne({ username });
    if (!admin) {
      console.log('POST /auth/login - Invalid credentials: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log('POST /auth/login - Invalid credentials: Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('POST /auth/login - Success, token generated:', token);
    res.json({ token });
  } catch (err) {
    console.error('POST /auth/login - Error:', err.message);
    res.status(500).json({ error: 'Failed to login', details: err.message });
  }
});

module.exports = router;






// -----this is before DB connection----- for admin login



// const express = require('express');
// const router = express.Router();
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// router.post('/login', (req, res) => {
//   const { username, password } = req.body;

//   console.log('POST /auth/login - Received:', { username, password });
//   console.log('POST /auth/login - JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');

//   if (!process.env.JWT_SECRET) {
//     console.error('POST /auth/login - JWT_SECRET is not set');
//     return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing' });
//   }

//   if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
//     console.log('POST /auth/login - Invalid credentials');
//     return res.status(401).json({ error: 'Invalid credentials' });
//   }

//   try {
//     // Generate JWT token
//     const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
//     console.log('POST /auth/login - Success, token generated:', token);
//     res.json({ token });
//   } catch (err) {
//     console.error('POST /auth/login - Token generation error:', err.message);
//     res.status(500).json({ error: 'Failed to generate token', details: err.message });
//   }
// });

// module.exports = router;