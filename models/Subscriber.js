const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
  }, 
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = (connection) => connection.model('Subscriber', subscriberSchema);
