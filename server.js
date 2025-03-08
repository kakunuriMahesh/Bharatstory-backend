const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const storyRoutes = require('./routes/stories');
const authRoutes = require('./routes/auth'); // Must be included

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded images
app.use('/api', storyRoutes);
app.use('/api/auth', authRoutes); // Register auth routes

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => res.send('Backend is running'));

// Start server (for local testing)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;

// -------first----------

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const storyRoutes = require('./routes/stories');

// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors()); // Keep for now; adjust later if frontend/backend domains align
// app.use(express.json());
// app.use('/uploads', express.static('uploads')); // Serve uploaded images

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// // // Routes
// app.use('/api', storyRoutes);

// // Start server (for local testing)
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// // Export for Vercel
// module.exports = app;



