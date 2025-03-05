const mongoose = require('mongoose');

const PartSchema = new mongoose.Schema({
  id: { type: String, required: true },
  heading: { en: String, te: String },
  quote: { en: String, te: String }, // Optional
  image: String,
  text: { en: String, te: String },
});

const CardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { en: String, te: String },
  date: { en: String, te: String },
  thumbnailImage: String,
  coverImage: String,
  description: { en: String, te: String },
  timeToRead: { en: String, te: String },
  storyType: { en: String, te: String },
  part: [PartSchema],
});

const StorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { en: String, te: String },
  storyCoverImage: String,
  bannerImge: String,
  parts: { card: [CardSchema] },
});

const LanguageSchema = new mongoose.Schema({
  language: String,
  stories: [StorySchema],
});

module.exports = mongoose.model('StoryCollection', LanguageSchema, 'storyCollections');