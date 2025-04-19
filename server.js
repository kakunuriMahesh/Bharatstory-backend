const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const storyRoutes = require("./routes/stories");
const authRoutes = require("./routes/auth");
const subscriberRoutes = require("./routes/subscribers"); // Add this line

dotenv.config();

console.log("ENV Variables:", {
  ADMIN_MONGO_URI: process.env.ADMIN_MONGO_URI ? "Set" : "Missing",
  STORY_MONGO_URI: process.env.STORY_MONGO_URI ? "Set" : "Missing",
  JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Missing",
  PORT: process.env.PORT || "Not set, defaulting to 5000",
});

const app = express();

// CORS configuration
const allowedOrigins = [
  "https://bharat-story-admin-v2.vercel.app", // Vercel frontend
  "http://localhost:5173", // Local dev
  "https://darkgreen-guanaco-940547.hostingersite.com", // Hostinger frontend
  "https://bharatstorybooks.com", // Custom domain
  "https://www.bharatstorybooks.com", // Custom domain with www
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked origin:", origin); // Debug log
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static("uploads")); // Note: Adjust for production
app.use("/api", storyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/subscribers", subscriberRoutes); // Add this line

// Admin DB Connection
const adminDbUri = process.env.ADMIN_MONGO_URI;
const adminConnection = mongoose.createConnection(adminDbUri);
adminConnection.on("connected", () =>
  console.log("Connected to Admin MongoDB")
);
adminConnection.on("error", (err) =>
  console.error("Admin MongoDB connection error:", err)
);

// Story DB Connection
const storyDbUri = process.env.STORY_MONGO_URI;
if (!storyDbUri) {
  console.error("STORY_MONGO_URI is not defined. Please check your .env file.");
}
const storyConnection = mongoose.createConnection(storyDbUri);
storyConnection.on("connected", () =>
  console.log("Connected to Story MongoDB")
);
storyConnection.on("error", (err) =>
  console.error("Story MongoDB connection error:", err)
);

app.set("adminConnection", adminConnection);
app.set("storyConnection", storyConnection);

app.get("/", (req, res) => res.send("Backend is running"));

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;


// TODO: adding new-subsctibe endpoint

// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const storyRoutes = require("./routes/stories");
// const authRoutes = require("./routes/auth");

// dotenv.config();

// console.log("ENV Variables:", {
//   ADMIN_MONGO_URI: process.env.ADMIN_MONGO_URI ? "Set" : "Missing",
//   STORY_MONGO_URI: process.env.STORY_MONGO_URI ? "Set" : "Missing",
//   JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Missing",
//   PORT: process.env.PORT || "Not set, defaulting to 5000",
// });

// const app = express();

// // CORS configuration
// const allowedOrigins = [
//   "https://bharat-story-admin-v2.vercel.app", // Vercel frontend
//   "http://localhost:5173", // Local dev
//   "https://darkgreen-guanaco-940547.hostingersite.com", // Hostinger frontend
//   "https://bharatstorybooks.com", // Custom domain
//   "https://www.bharatstorybooks.com", // Custom domain with www
// ];
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         console.log("Blocked origin:", origin); // Debug log
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   })
// );
// app.use(express.json());
// app.use("/uploads", express.static("uploads")); // Note: Adjust for production
// app.use("/api", storyRoutes);
// app.use("/api/auth", authRoutes);

// // Admin DB Connection
// const adminDbUri = process.env.ADMIN_MONGO_URI;
// const adminConnection = mongoose.createConnection(adminDbUri);
// adminConnection.on("connected", () =>
//   console.log("Connected to Admin MongoDB")
// );
// adminConnection.on("error", (err) =>
//   console.error("Admin MongoDB connection error:", err)
// );

// // Story DB Connection
// const storyDbUri = process.env.STORY_MONGO_URI;
// if (!storyDbUri) {
//   console.error("STORY_MONGO_URI is not defined. Please check your .env file.");
// }
// const storyConnection = mongoose.createConnection(storyDbUri);
// storyConnection.on("connected", () =>
//   console.log("Connected to Story MongoDB")
// );
// storyConnection.on("error", (err) =>
//   console.error("Story MongoDB connection error:", err)
// );

// app.set("adminConnection", adminConnection);
// app.set("storyConnection", storyConnection);

// app.get("/", (req, res) => res.send("Backend is running"));

// if (process.env.NODE_ENV !== "production") {
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// }

// module.exports = app;

// -----this is before DB connection----- for admin login

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const storyRoutes = require('./routes/stories');
// const authRoutes = require('./routes/auth');

// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors({
//   origin: 'https://bharat-story-admin-v2.vercel.app', // Replace with your frontend URL
//   credentials: true,
// }));
// app.use(express.json());
// app.use('/uploads', express.static('uploads')); // Note: This may not work on Vercel unless uploads are handled differently
// app.use('/api', storyRoutes);
// app.use('/api/auth', authRoutes);

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// // Root route
// app.get('/', (req, res) => res.send('Backend is running'));

// // Vercel doesn't use app.listen in serverless mode, but keep it for local testing
// if (process.env.NODE_ENV !== 'production') {
//   const PORT = process.env.PORT || 5000; // Use 5000 locally, Vercel assigns its own port
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// }

// module.exports = app; // Export for Vercel
