const express = require('express');
const router = express.Router();
const multer = require('multer');
const StoryCollection = require('../models/Story');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Base URL for image paths (placeholder until cloud storage)
const BASE_URL = 'https://bharatstorybooks.com/uploads';

// Multer setup with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Only JPEG/PNG images are allowed'));
  },
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// GET all stories
router.get('/stories', authenticateToken, async (req, res) => {
  try {
    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    res.json(storyCollection ? storyCollection.stories : []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
  }
});

// GET single story
router.get('/stories/:id', authenticateToken, async (req, res) => {
  try {
    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    const story = storyCollection.stories.find((s) => s.id === req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story', details: err.message });
  }
});


// POST new story
router.post('/stories', authenticateToken, upload.fields([
  { name: 'storyCoverImage', maxCount: 1 },
  { name: 'bannerImge', maxCount: 1 },
]), async (req, res) => {
  try {
    const { nameEn, nameTe, nameHi, languages } = req.body;
    const parsedLanguages = languages ? JSON.parse(languages) : ['en', 'te']; // Default to en, te
    if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });

    const name = {};
    if (parsedLanguages.includes('en')) name.en = nameEn || '';
    if (parsedLanguages.includes('te')) name.te = nameTe || '';
    if (parsedLanguages.includes('hi')) name.hi = nameHi || '';

    const storyCoverImage = req.files && req.files['storyCoverImage']
      ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['storyCoverImage'][0].originalname)}`
      : '';
    const bannerImge = req.files && req.files['bannerImge']
      ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['bannerImge'][0].originalname)}`
      : '';

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    const newStory = {
      id: uuidv4(),
      name,
      languages: parsedLanguages,
      storyCoverImage,
      bannerImge,
      parts: { card: [] },
    };

    if (!storyCollection) {
      await StoryCollection.create({ language: 'Eng', stories: [newStory] });
    } else {
      storyCollection.stories.push(newStory);
      await storyCollection.save();
    }

    res.status(201).json({ message: 'Story added', story: newStory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add story', details: err.message });
  }
});

// PUT update story
router.put('/stories/:id', authenticateToken, upload.fields([
  { name: 'storyCoverImage', maxCount: 1 },
  { name: 'bannerImge', maxCount: 1 },
]), async (req, res) => {
  try {
    const { nameEn, nameTe, nameHi, languages } = req.body;
    const parsedLanguages = languages ? JSON.parse(languages) : null;

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    const storyIndex = storyCollection.stories.findIndex((s) => s.id === req.params.id);
    if (storyIndex === -1) return res.status(404).json({ error: 'Story not found' });

    const existingStory = storyCollection.stories[storyIndex];
    const updatedName = {
      en: parsedLanguages?.includes('en') ? (nameEn || existingStory.name.en) : existingStory.name.en,
      te: parsedLanguages?.includes('te') ? (nameTe || existingStory.name.te) : existingStory.name.te,
      hi: parsedLanguages?.includes('hi') ? (nameHi || existingStory.name.hi) : existingStory.name.hi,
    };

    const updatedStory = {
      ...existingStory,
      name: updatedName,
      languages: parsedLanguages || existingStory.languages,
      storyCoverImage: req.files && req.files['storyCoverImage']
        ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['storyCoverImage'][0].originalname)}`
        : existingStory.storyCoverImage,
      bannerImge: req.files && req.files['bannerImge']
        ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['bannerImge'][0].originalname)}`
        : existingStory.bannerImge,
    };

    storyCollection.stories[storyIndex] = updatedStory;
    await storyCollection.save();

    res.json({ message: 'Story updated', story: updatedStory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update story', details: err.message });
  }
});


// DELETE story
router.delete('/stories/:id', authenticateToken, async (req, res) => {
  try {
    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    const storyIndex = storyCollection.stories.findIndex((s) => s.id === req.params.id);
    if (storyIndex === -1) return res.status(404).json({ error: 'Story not found' });

    storyCollection.stories.splice(storyIndex, 1); // Deletes story and its parts
    await storyCollection.save();

    res.json({ message: 'Story and its parts deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story', details: err.message });
  }
});




// Multer error handler
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({ error: 'File upload error', details: err.message });
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(400).json({ error: 'Invalid file upload', details: err.message });
  }
  next();
};

// POST a part (add or update)
router.post('/parts', authenticateToken, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    console.log('POST /parts - req.body:', req.body);
    console.log('POST /parts - req.files:', req.files || 'No files uploaded');

    const {
      storyId, partId, titleEn, titleTe, titleHi, dateEn, dateTe, dateHi,
      descriptionEn, descriptionTe, descriptionHi, timeToReadEn, timeToReadTe, timeToReadHi,
      storyTypeEn, storyTypeTe, storyTypeHi, languages,
    } = req.body;

    const parsedLanguages = languages ? JSON.parse(languages) : ['en', 'te'];
    if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });

    if (!storyId) return res.status(400).json({ error: 'storyId is required' });

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

    const story = storyCollection.stories.find((s) => s.id === storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Validate part languages against story languages
    const invalidLanguages = parsedLanguages.filter((lang) => !story.languages.includes(lang));
    if (invalidLanguages.length) {
      return res.status(400).json({ error: `Cannot add part in languages not set in story: ${invalidLanguages.join(', ')}` });
    }

    // Build title, date, etc., based on selected languages
    const title = {};
    const date = {};
    const description = {};
    const timeToRead = {};
    const storyType = {};
    if (parsedLanguages.includes('en')) {
      if (!titleEn) return res.status(400).json({ error: 'titleEn is required when English is selected' });
      title.en = titleEn;
      date.en = dateEn || '';
      description.en = descriptionEn || '';
      timeToRead.en = timeToReadEn || '';
      storyType.en = storyTypeEn || '';
    }
    if (parsedLanguages.includes('te')) {
      if (!titleTe) return res.status(400).json({ error: 'titleTe is required when Telugu is selected' });
      title.te = titleTe;
      date.te = dateTe || '';
      description.te = descriptionTe || '';
      timeToRead.te = timeToReadTe || '';
      storyType.te = storyTypeTe || '';
    }
    if (parsedLanguages.includes('hi')) {
      if (!titleHi) return res.status(400).json({ error: 'titleHi is required when Hindi is selected' });
      title.hi = titleHi;
      date.hi = dateHi || '';
      description.hi = descriptionHi || '';
      timeToRead.hi = timeToReadHi || '';
      storyType.hi = storyTypeHi || '';
    }

    // Handle dynamic parts
    const parts = [];
    let index = 0;
    while (req.body[`headingEn${index}`] || req.body[`headingTe${index}`] || req.body[`headingHi${index}`]) {
      const partImageField = req.files && req.files.find((f) => f.fieldname === `partImage${index}`);
      const heading = {};
      const quote = {};
      const text = {};
      if (parsedLanguages.includes('en')) {
        heading.en = req.body[`headingEn${index}`] || '';
        quote.en = req.body[`quoteEn${index}`] || '';
        text.en = req.body[`textEn${index}`] || '';
      }
      if (parsedLanguages.includes('te')) {
        heading.te = req.body[`headingTe${index}`] || '';
        quote.te = req.body[`quoteTe${index}`] || '';
        text.te = req.body[`textTe${index}`] || '';
      }
      if (parsedLanguages.includes('hi')) {
        heading.hi = req.body[`headingHi${index}`] || '';
        quote.hi = req.body[`quoteHi${index}`] || '';
        text.hi = req.body[`textHi${index}`] || '';
      }
      parts.push({
        id: uuidv4(),
        heading,
        quote,
        image: partImageField 
          ? `${BASE_URL}/${uuidv4()}${path.extname(partImageField.originalname)}` 
          : req.body[`partImage${index}`] || '',
        text,
      });
      index++;
    }

    const newPart = {
      id: partId || uuidv4(),
      title,
      date,
      thumbnailImage: req.files && req.files.find((f) => f.fieldname === 'thumbnailImage') 
        ? `${BASE_URL}/${uuidv4()}${path.extname(req.files.find((f) => f.fieldname === 'thumbnailImage').originalname)}` 
        : req.body.thumbnailImage || '',
      coverImage: req.files && req.files.find((f) => f.fieldname === 'coverImage') 
        ? `${BASE_URL}/${uuidv4()}${path.extname(req.files.find((f) => f.fieldname === 'coverImage').originalname)}` 
        : req.body.coverImage || '',
      description,
      timeToRead,
      storyType,
      part: parts,
    };

    if (partId) {
      const partIndex = story.parts.card.findIndex((p) => p.id === partId);
      if (partIndex !== -1) story.parts.card[partIndex] = newPart;
      else story.parts.card.push(newPart);
    } else {
      story.parts.card.push(newPart);
    }

    await storyCollection.save();
    console.log('POST /parts - Success:', newPart);
    res.status(201).json({ message: partId ? 'Part updated' : 'Part added', part: newPart });
  } catch (err) {
    console.error('POST /parts error:', err);
    res.status(500).json({ error: 'Failed to manage part', details: err.message });
  }
});

// DELETE a part
router.delete('/parts/:storyId/:partId', authenticateToken, async (req, res) => {
  try {
    const { storyId, partId } = req.params;
    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    const story = storyCollection.stories.find((s) => s.id === storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    story.parts.card = story.parts.card.filter((part) => part.id !== partId);
    await storyCollection.save();

    res.json({ message: 'Part deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete part', details: err.message });
  }
});

// router.delete('/parts/:storyId/:partId', async (req, res) => {
//   try {
//     const { storyId, partId } = req.params;
//     console.log('DELETE /parts - storyId:', storyId, 'partId:', partId);

//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

//     const story = storyCollection.stories.find((s) => s.id === storyId);
//     if (!story) return res.status(404).json({ error: 'Story not found' });

//     story.parts.card = story.parts.card.filter((part) => part.id !== partId);
//     await storyCollection.save();

//     console.log('DELETE /parts - Success');
//     res.json({ message: 'Part deleted successfully' });
//   } catch (err) {
//     console.error('DELETE /parts error:', err);
//     res.status(500).json({ error: 'Failed to delete part', details: err.message });
//   }
// });

module.exports = router;