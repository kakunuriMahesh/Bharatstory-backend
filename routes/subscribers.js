const express = require('express');
const router = express.Router();

// Initialize Subscriber model with admin connection
const getSubscriberModel = require('../models/Subscriber');

// Placeholder for authentication middleware (adjust based on your auth system)
const protect = require('../middleware/auth'); // Adjust path as needed

// POST /api/subscribers/new-subscribe
router.post('/new-subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const adminConnection = req.app.get('adminConnection');
    const Subscriber = getSubscriberModel(adminConnection);

    // Check if email already exists
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: 'Email is already subscribed' });
    }

    // Create new subscriber
    const subscriber = new Subscriber({ email });
    await subscriber.save();

    res.status(201).json({ message: 'Successfully subscribed' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
});

// GET /api/subscribers - Fetch all subscribers (admin only)
router.get('/', protect, async (req, res) => {
  try {
    const adminConnection = req.app.get('adminConnection');
    const Subscriber = getSubscriberModel(adminConnection);

    const subscribers = await Subscriber.find({}, 'email').lean();
    const emails = subscribers.map((subscriber) => subscriber.email);

    res.status(200).json({ emails });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
});

module.exports = router;

// TODO: get all subscribers are not added

// const express = require('express');
// const router = express.Router();

// // Initialize Subscriber model with admin connection
// const getSubscriberModel = require('../models/Subscriber');

// // POST /api/subscribers/new-subscribe
// router.post('/new-subscribe', async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: 'Email is required' });
//     }

//     const adminConnection = req.app.get('adminConnection');
//     const Subscriber = getSubscriberModel(adminConnection);

//     // Check if email already exists
//     const existingSubscriber = await Subscriber.findOne({ email });
//     if (existingSubscriber) {
//       return res.status(400).json({ message: 'Email is already subscribed' });
//     }

//     // Create new subscriber
//     const subscriber = new Subscriber({ email });
//     await subscriber.save();

//     res.status(201).json({ message: 'Successfully subscribed' });
//   } catch (error) {
//     console.error('Subscription error:', error);
//     res.status(500).json({ message: 'Server error, please try again later' });
//   }
// });

// module.exports = router; 