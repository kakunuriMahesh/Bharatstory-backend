const mongoose = require('mongoose');

// Sub-schema for individual parts within a card
const PartSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Unique ID for each part
  heading: { en: String, te: String }, // English and Telugu headings
  quote: { en: String, te: String }, // Optional quotes
  image: String, // Image URL or base64 (temporary)
  text: { en: String, te: String }, // English and Telugu text content
});

// Sub-schema for cards (story parts)
const CardSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Unique ID for each card
  title: { en: String, te: String }, // Card title
  date: { en: String, te: String }, // Publication date
  thumbnailImage: String, // Thumbnail image URL or base64
  coverImage: String, // Cover image URL or base64
  description: { en: String, te: String }, // Card description
  timeToRead: { en: String, te: String }, // Reading time
  storyType: { en: String, te: String }, // Story type (e.g., fiction)
  part: [PartSchema], // Array of parts within the card
});

// Schema for a story
const StorySchema = new mongoose.Schema({
  id: { type: String, required: true }, // Unique ID for each story
  name: { en: String, te: String }, // Story name
  storyCoverImage: String, // Story cover image URL or base64
  bannerImge: String, // Banner image URL or base64 (typo: should be bannerImage)
  parts: { card: [CardSchema] }, // Array of cards (parts) for the story
});

// Top-level schema for language-based collections
const LanguageSchema = new mongoose.Schema({
  language: String, // Language identifier (e.g., 'Eng')
  stories: [StorySchema], // Array of stories
});

// Export the model, using 'storyCollections' collection name
module.exports = mongoose.model('StoryCollection', LanguageSchema, 'storyCollections');


// const mongoose = require('mongoose');

// const PartSchema = new mongoose.Schema({
//   id: { type: String, required: true },
//   heading: { en: String, te: String },
//   quote: { en: String, te: String }, // Optional
//   image: String,
//   text: { en: String, te: String },
// });

// const CardSchema = new mongoose.Schema({
//   id: { type: String, required: true },
//   title: { en: String, te: String },
//   date: { en: String, te: String },
//   thumbnailImage: String,
//   coverImage: String,
//   description: { en: String, te: String },
//   timeToRead: { en: String, te: String },
//   storyType: { en: String, te: String },
//   part: [PartSchema],
// });

// const StorySchema = new mongoose.Schema({
//   id: { type: String, required: true },
//   name: { en: String, te: String },
//   storyCoverImage: String,
//   bannerImge: String,
//   parts: { card: [CardSchema] },
// });

// const LanguageSchema = new mongoose.Schema({
//   language: String,
//   stories: [StorySchema],
// });

// module.exports = mongoose.model('StoryCollection', LanguageSchema, 'storyCollections');