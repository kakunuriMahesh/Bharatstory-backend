const mongoose = require('mongoose');

const PartSchema = new mongoose.Schema({
  id: { type: String, required: true },
  heading: { en: String, te: String, hi: String }, // Hindi added
  quote: { en: String, te: String, hi: String },
  image: String,
  text: { en: String, te: String, hi: String },
});

const CardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { en: String, te: String, hi: String },
  date: { en: String, te: String, hi: String },
  thumbnailImage: String,
  coverImage: String,
  description: { en: String, te: String, hi: String },
  timeToRead: { en: String, te: String, hi: String },
  storyType: { en: String, te: String, hi: String },
  part: [PartSchema],
});

// TODO:

const AgePartContentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  oneLineText: { en: String, te: String, hi: String }, // used for toddler
  headingText: { en: String, te: String, hi: String }, // used for kids
  imageUrl: String,
});

// 🔹 Updated: multilingual fields for age cards
const AgeCardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { en: String, te: String, hi: String },
  thumbnailImage: String,
  coverImage: String,
  description: { en: String, te: String, hi: String },
  timeToRead: { en: String, te: String, hi: String },
  storyType: { en: String, te: String, hi: String },
  partContent: [AgePartContentSchema],
});

const StorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { en: String, te: String, hi: String },
  languages: [String], // e.g., ["en", "te", "hi"]
  storyCoverImage: String,
  bannerImge: String,
  parts: { card: [CardSchema] }, // Adult (18+)
  toddler: { card: [AgeCardSchema] }, // Toddler (3-5)
  kids: { card: [AgeCardSchema] }, // Kids (6-8)
  child: { card: [CardSchema] }, // Child (9-12)
  teen: { card: [CardSchema] }, // Teen (13-18)
});

const LanguageSchema = new mongoose.Schema({
  language: String, 
  stories: [StorySchema],
});

module.exports = mongoose.model('StoryCollection', LanguageSchema, 'storyCollections');


// const mongoose = require('mongoose');

// // Sub-schema for parts within a card
// const PartSchema = new mongoose.Schema({
//   id: { type: String, required: true },
//   heading: { en: String, te: String },
//   quote: { en: String, te: String },
//   image: String,
//   text: { en: String, te: String },
// });

// // Sub-schema for cards (story parts)
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

// // Schema for a story
// const StorySchema = new mongoose.Schema({
//   id: { type: String, required: true },
//   name: { en: String, te: String },
//   storyCoverImage: String, // Will store URL instead of base64
//   bannerImge: String, // Will store URL
//   parts: { card: [CardSchema] },
// });

// // Top-level schema
// const LanguageSchema = new mongoose.Schema({
//   language: String,
//   stories: [StorySchema],
// });

// module.exports = mongoose.model('StoryCollection', LanguageSchema, 'storyCollections');
