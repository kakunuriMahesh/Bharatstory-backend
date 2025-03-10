const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const StoryCollection = require('../models/Story'); // Import the model for reference
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) cb(null, true);
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

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) reject(error);
      else resolve(result.secure_url);
    }).end(buffer);
  });
};

// GET all stories
router.get('/stories', authenticateToken, async (req, res) => {
  try {
    const storyConnection = req.app.get('storyConnection');
    const StoryModel = storyConnection.model('StoryCollection', StoryCollection.schema);
    const storyCollection = await StoryModel.findOne({ language: 'Eng' });
    res.json(storyCollection ? storyCollection.stories : []);
  } catch (err) {
    console.error('GET /stories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
  }
});

// GET single story
router.get('/stories/:id', authenticateToken, async (req, res) => {
  try {
    const storyConnection = req.app.get('storyConnection');
    const StoryModel = storyConnection.model('StoryCollection', StoryCollection.schema);
    const storyCollection = await StoryModel.findOne({ language: 'Eng' });
    const story = storyCollection?.stories.find((s) => s.id === req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (err) {
    console.error('GET /stories/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch story', details: err.message });
  }
});

// POST new story
router.post(
  '/stories',
  authenticateToken,
  upload.fields([{ name: 'storyCoverImage', maxCount: 1 }, { name: 'bannerImge', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { nameEn, nameTe, nameHi, languages } = req.body;
      const parsedLanguages = JSON.parse(languages || '["en", "te"]');
      if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });

      const name = {};
      if (parsedLanguages.includes('en')) name.en = nameEn || '';
      if (parsedLanguages.includes('te')) name.te = nameTe || '';
      if (parsedLanguages.includes('hi')) name.hi = nameHi || '';

      let storyCoverImage = '';
      if (req.files?.['storyCoverImage']) {
        storyCoverImage = await uploadToCloudinary(req.files['storyCoverImage'][0].buffer, 'bharat-stories/stories');
      }

      let bannerImge = '';
      if (req.files?.['bannerImge']) {
        bannerImge = await uploadToCloudinary(req.files['bannerImge'][0].buffer, 'bharat-stories/stories');
      }

      const storyConnection = req.app.get('storyConnection');
      const StoryModel = storyConnection.model('StoryCollection', StoryCollection.schema);
      const storyCollection = await StoryModel.findOne({ language: 'Eng' });
      const newStory = {
        id: uuidv4(),
        name,
        languages: parsedLanguages,
        storyCoverImage,
        bannerImge,
        parts: { card: [] },
      };

      if (!storyCollection) {
        await StoryModel.create({ language: 'Eng', stories: [newStory] });
      } else {
        storyCollection.stories.push(newStory);
        await storyCollection.save();
      }

      res.status(201).json({ message: 'Story added', story: newStory });
    } catch (err) {
      console.error('POST /stories error:', err);
      res.status(500).json({ error: 'Failed to add story', details: err.message });
    }
  }
);

// PUT update story
router.put(
  '/stories/:id',
  authenticateToken,
  upload.any(),
  async (req, res) => {
    try {
      const storyConnection = req.app.get('storyConnection');
      const StoryModel = storyConnection.model('StoryCollection', StoryCollection.schema);
      const storyCollection = await StoryModel.findOne({ language: 'Eng' });
      if (!storyCollection) return res.status(404).json({ error: 'Story collection not found' });

      const storyIndex = storyCollection.stories.findIndex((s) => s.id === req.params.id);
      if (storyIndex === -1) return res.status(404).json({ error: 'Story not found' });

      const existingStory = storyCollection.stories[storyIndex];
      const languages = JSON.parse(req.body.languages || '[]');

      const updatedFields = {
        'stories.$.name.en': languages.includes('en') ? req.body.nameEn || existingStory.name.en : existingStory.name.en,
        'stories.$.name.te': languages.includes('te') ? req.body.nameTe || existingStory.name.te : existingStory.name.te,
        'stories.$.name.hi': languages.includes('hi') ? req.body.nameHi || existingStory.name.hi || '' : existingStory.name.hi || '',
        'stories.$.languages': languages,
        'stories.$.storyCoverImage': existingStory.storyCoverImage, // Preserve existing
        'stories.$.bannerImge': existingStory.bannerImge, // Preserve existing
      };

      const storyCoverImageFile = req.files.find((f) => f.fieldname === 'storyCoverImage');
      if (storyCoverImageFile) {
        updatedFields['stories.$.storyCoverImage'] = await uploadToCloudinary(storyCoverImageFile.buffer, 'bharat-stories/stories');
      }

      const bannerImgeFile = req.files.find((f) => f.fieldname === 'bannerImge');
      if (bannerImgeFile) {
        updatedFields['stories.$.bannerImge'] = await uploadToCloudinary(bannerImgeFile.buffer, 'bharat-stories/stories');
      }

      await StoryModel.updateOne(
        { language: 'Eng', 'stories.id': req.params.id },
        { $set: updatedFields }
      );

      const updatedCollection = await StoryModel.findOne({ language: 'Eng' });
      const updatedStory = updatedCollection.stories.find((s) => s.id === req.params.id);
      res.json({ message: 'Story updated', story: updatedStory });
    } catch (err) {
      console.error('PUT /stories/:id error:', err);
      res.status(500).json({ error: 'Failed to update story', details: err.message });
    }
  }
);

// DELETE story
router.delete('/stories/:id', authenticateToken, async (req, res) => {
  try {
    const storyConnection = req.app.get('storyConnection');
    const StoryModel = storyConnection.model('StoryCollection', StoryCollection.schema);
    const storyCollection = await StoryModel.findOne({ language: 'Eng' });
    if (!storyCollection) return res.status(404).json({ error: 'Story collection not found' });

    storyCollection.stories = storyCollection.stories.filter((s) => s.id !== req.params.id);
    await storyCollection.save();

    res.json({ message: 'Story deleted successfully' });
  } catch (err) {
    console.error('DELETE /stories/:id error:', err);
    res.status(500).json({ error: 'Failed to delete story', details: err.message });
  }
});

// POST a part (add or update)
router.post(
  '/parts',
  authenticateToken,
  upload.any(),
  async (req, res) => {
    try {
      const {
        storyId,
        partId,
        titleEn,
        titleTe,
        titleHi,
        dateEn,
        dateTe,
        dateHi,
        descriptionEn,
        descriptionTe,
        descriptionHi,
        timeToReadEn,
        timeToReadTe,
        timeToReadHi,
        storyTypeEn,
        storyTypeTe,
        storyTypeHi,
        languages,
      } = req.body;

      const parsedLanguages = JSON.parse(languages || '["en", "te"]');
      if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });
      if (!storyId) return res.status(400).json({ error: 'storyId is required' });

      const storyConnection = req.app.get('storyConnection');
      const StoryModel = storyConnection.model('StoryCollection', StoryCollection.schema);
      const storyCollection = await StoryModel.findOne({ language: 'Eng' });
      if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

      const story = storyCollection.stories.find((s) => s.id === storyId);
      if (!story) return res.status(404).json({ error: 'Story not found' });

      const title = {};
      const date = {};
      const description = {};
      const timeToRead = {};
      const storyType = {};
      if (parsedLanguages.includes('en')) {
        title.en = titleEn || '';
        date.en = dateEn || '';
        description.en = descriptionEn || '';
        timeToRead.en = timeToReadEn || '';
        storyType.en = storyTypeEn || '';
      }
      if (parsedLanguages.includes('te')) {
        title.te = titleTe || '';
        date.te = dateTe || '';
        description.te = descriptionTe || '';
        timeToRead.te = timeToReadTe || '';
        storyType.te = storyTypeTe || '';
      }
      if (parsedLanguages.includes('hi')) {
        title.hi = titleHi || '';
        date.hi = dateHi || '';
        description.hi = descriptionHi || '';
        timeToRead.hi = timeToReadHi || '';
        storyType.hi = storyTypeHi || '';
      }

      let thumbnailImage = '';
      const thumbnailImageFile = req.files.find((f) => f.fieldname === 'thumbnailImage');
      if (thumbnailImageFile) {
        thumbnailImage = await uploadToCloudinary(thumbnailImageFile.buffer, 'bharat-stories/parts');
      } else if (partId) {
        const existingPart = story.parts.card.find((p) => p.id === partId);
        thumbnailImage = existingPart?.thumbnailImage || '';
      }

      const parts = [];
      let index = 0;
      while (req.body[`headingEn${index}`] || req.body[`headingTe${index}`] || req.body[`headingHi${index}`]) {
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
        let image = '';
        const partImageFile = req.files.find((f) => f.fieldname === `partImage${index}`);
        if (partImageFile) {
          image = await uploadToCloudinary(partImageFile.buffer, 'bharat-stories/parts');
        } else if (partId) {
          const existingPart = story.parts.card.find((p) => p.id === partId);
          image = existingPart?.part[index]?.image || '';
        }
        parts.push({
          id: req.body[`id${index}`] || uuidv4(),
          heading,
          quote,
          image,
          text,
        });
        index++;
      }

      const newPart = {
        id: partId || uuidv4(),
        title,
        date,
        thumbnailImage,
        description,
        timeToRead,
        storyType,
        part: parts,
      };

      if (partId) {
        const partIndex = story.parts.card.findIndex((p) => p.id === partId);
        if (partIndex !== -1) {
          story.parts.card[partIndex] = newPart;
        } else {
          story.parts.card.push(newPart);
        }
      } else {
        story.parts.card.push(newPart);
      }

      await storyCollection.save();
      res.status(201).json({ message: partId ? 'Part updated' : 'Part added', part: newPart });
    } catch (err) {
      console.error('POST /parts error:', err);
      res.status(500).json({ error: 'Failed to manage part', details: err.message });
    }
  }
);

// DELETE part
router.delete('/parts/:storyId/:partId', authenticateToken, async (req, res) => {
  try {
    const { storyId, partId } = req.params;
    const storyConnection = req.app.get('storyConnection');
    const StoryModel = storyConnection.model('StoryCollection', StoryCollection.schema);
    const storyCollection = await StoryModel.findOne({ language: 'Eng' });
    if (!storyCollection) return res.status(404).json({ error: 'Story collection not found' });

    const story = storyCollection.stories.find((s) => s.id === storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    story.parts.card = story.parts.card.filter((part) => part.id !== partId);
    await storyCollection.save();

    res.json({ message: 'Part deleted successfully' });
  } catch (err) {
    console.error('DELETE /parts error:', err);
    res.status(500).json({ error: 'Failed to delete part', details: err.message });
  }
});

module.exports = router;







//TODO: ----- this is code with schema in the same file-----
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const mongoose = require('mongoose');
// const { v4: uuidv4 } = require('uuid');
// const path = require('path');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// // Base URL for image paths (placeholder until cloud storage)
// const BASE_URL = 'https://bharatstorybooks.com/uploads';

// // Multer setup with memory storage
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
//     if (extname && mimetype) cb(null, true);
//     else cb(new Error('Only JPEG/PNG images are allowed'));
//   },
// });

// // Story Schema
// const storyCollectionSchema = new mongoose.Schema({
//   language: String,
//   stories: [{
//     id: String,
//     name: Object,
//     languages: [String],
//     storyCoverImage: String,
//     bannerImge: String,
//     parts: { card: Array },
//   }],
// });

// // Middleware to verify JWT
// const authenticateToken = (req, res, next) => {
//   const token = req.headers['authorization']?.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'No token provided' });

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) return res.status(403).json({ error: 'Invalid token' });
//     req.user = user;
//     next();
//   });
// };

// // GET all stories
// router.get('/stories', authenticateToken, async (req, res) => {
//   try {
//     const storyConnection = req.app.get('storyConnection');
//     const StoryCollection = storyConnection.model('StoryCollection', storyCollectionSchema);
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     res.json(storyCollection ? storyCollection.stories : []);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
//   }
// });

// // GET single story
// router.get('/stories/:id', authenticateToken, async (req, res) => {
//   try {
//     const storyConnection = req.app.get('storyConnection');
//     const StoryCollection = storyConnection.model('StoryCollection', storyCollectionSchema);
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     const story = storyCollection.stories.find((s) => s.id === req.params.id);
//     if (!story) return res.status(404).json({ error: 'Story not found' });
//     res.json(story);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch story', details: err.message });
//   }
// });

// // POST new story
// router.post(
//   '/stories',
//   authenticateToken,
//   upload.fields([
//     { name: 'storyCoverImage', maxCount: 1 },
//     { name: 'bannerImge', maxCount: 1 },
//   ]),
//   async (req, res) => {
//     try {
//       const { nameEn, nameTe, nameHi, languages } = req.body;
//       const parsedLanguages = languages ? JSON.parse(languages) : ['en', 'te'];
//       if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });

//       const name = {};
//       if (parsedLanguages.includes('en')) name.en = nameEn || '';
//       if (parsedLanguages.includes('te')) name.te = nameTe || '';
//       if (parsedLanguages.includes('hi')) name.hi = nameHi || '';

//       const storyCoverImage = req.files?.['storyCoverImage']
//         ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['storyCoverImage'][0].originalname)}`
//         : '';
//       const bannerImge = req.files?.['bannerImge']
//         ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['bannerImge'][0].originalname)}`
//         : '';

//       const storyConnection = req.app.get('storyConnection');
//       const StoryCollection = storyConnection.model('StoryCollection', storyCollectionSchema);
//       const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//       const newStory = {
//         id: uuidv4(),
//         name,
//         languages: parsedLanguages,
//         storyCoverImage,
//         bannerImge,
//         parts: { card: [] },
//       };

//       if (!storyCollection) {
//         await StoryCollection.create({ language: 'Eng', stories: [newStory] });
//       } else {
//         storyCollection.stories.push(newStory);
//         await storyCollection.save();
//       }

//       res.status(201).json({ message: 'Story added', story: newStory });
//     } catch (err) {
//       console.error('POST /stories error:', err);
//       res.status(500).json({ error: 'Failed to add story', details: err.message });
//     }
//   }
// );

// // PUT update story
// router.put(
//   '/stories/:id',
//   authenticateToken,
//   upload.any(),
//   async (req, res) => {
//     try {
//       const storyConnection = req.app.get('storyConnection');
//       const StoryCollection = storyConnection.model('StoryCollection', storyCollectionSchema);
//       const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//       if (!storyCollection) return res.status(404).json({ error: 'Story collection not found' });

//       const storyIndex = storyCollection.stories.findIndex((s) => s.id === req.params.id);
//       if (storyIndex === -1) return res.status(404).json({ error: 'Story not found' });

//       const existingStory = storyCollection.stories[storyIndex];
//       const languages = JSON.parse(req.body.languages || '[]');
//       const removeLanguages = req.body.removeLanguages ? JSON.parse(req.body.removeLanguages) : [];
//       const deleteContent = req.body.deleteContent === 'true';

//       console.log('Existing Story:', existingStory);
//       console.log('Request Body:', req.body);
//       console.log('Files:', req.files);
//       console.log('Remove Languages:', removeLanguages);
//       console.log('Delete Content:', deleteContent);

//       const updatedFields = {
//         'stories.$.name.en': languages.includes('en') ? req.body.nameEn || existingStory.name.en : existingStory.name.en,
//         'stories.$.name.te': languages.includes('te') ? req.body.nameTe || existingStory.name.te : existingStory.name.te,
//         'stories.$.name.hi': languages.includes('hi') ? req.body.nameHi || existingStory.name.hi || '' : existingStory.name.hi || '',
//         'stories.$.languages': languages,
//       };

//       const storyCoverImageFile = req.files.find((f) => f.fieldname === 'storyCoverImage');
//       if (storyCoverImageFile) {
//         updatedFields['stories.$.storyCoverImage'] = `${BASE_URL}/${uuidv4()}${path.extname(storyCoverImageFile.originalname)}`;
//       }
//       const bannerImgeFile = req.files.find((f) => f.fieldname === 'bannerImge');
//       if (bannerImgeFile) {
//         updatedFields['stories.$.bannerImge'] = `${BASE_URL}/${uuidv4()}${path.extname(bannerImgeFile.originalname)}`;
//       }

//       // Handle language removal and content deletion
//       if (removeLanguages.length > 0 && deleteContent) {
//         removeLanguages.forEach((lang) => {
//           updatedFields[`stories.$.name.${lang}`] = '';
//           existingStory.parts.card.forEach((card, index) => {
//             updatedFields[`stories.$.parts.card.${index}.title.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.date.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.description.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.timeToRead.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.storyType.${lang}`] = '';
//             card.part.forEach((part, partIndex) => {
//               updatedFields[`stories.$.parts.card.${index}.part.${partIndex}.heading.${lang}`] = '';
//               updatedFields[`stories.$.parts.card.${index}.part.${partIndex}.quote.${lang}`] = '';
//               updatedFields[`stories.$.parts.card.${index}.part.${partIndex}.text.${lang}`] = '';
//             });
//           });
//         });
//       }

//       console.log('Updated Fields:', updatedFields);

//       const updatedCollection = await StoryCollection.findOneAndUpdate(
//         { language: 'Eng', 'stories.id': req.params.id },
//         { $set: updatedFields },
//         { new: true }
//       );

//       if (!updatedCollection) return res.status(500).json({ error: 'Failed to update story in database' });

//       const updatedStory = updatedCollection.stories.find((s) => s.id === req.params.id);
//       console.log('Updated Story from DB:', updatedStory);

//       res.json({ message: 'Story updated', story: updatedStory });
//     } catch (err) {
//       console.error('PUT /stories/:id error:', err);
//       res.status(500).json({ error: 'Failed to update story', details: err.message });
//     }
//   }
// );

// // DELETE story
// router.delete('/stories/:id', authenticateToken, async (req, res) => {
//   try {
//     const storyConnection = req.app.get('storyConnection');
//     const StoryCollection = storyConnection.model('StoryCollection', storyCollectionSchema);
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     const storyIndex = storyCollection.stories.findIndex((s) => s.id === req.params.id);
//     if (storyIndex === -1) return res.status(404).json({ error: 'Story not found' });

//     storyCollection.stories.splice(storyIndex, 1);
//     await storyCollection.save();

//     res.json({ message: 'Story and its parts deleted successfully' });
//   } catch (err) {
//     console.error('DELETE /stories/:id error:', err);
//     res.status(500).json({ error: 'Failed to delete story', details: err.message });
//   }
// });

// // POST a part (add or update)
// router.post(
//   '/parts',
//   authenticateToken,
//   upload.any(),
//   async (req, res) => {
//     try {
//       console.log('POST /parts - req.body:', req.body);
//       console.log('POST /parts - req.files:', req.files || 'No files uploaded');

//       const {
//         storyId, partId, titleEn, titleTe, titleHi, dateEn, dateTe, dateHi,
//         descriptionEn, descriptionTe, descriptionHi, timeToReadEn, timeToReadTe, timeToReadHi,
//         storyTypeEn, storyTypeTe, storyTypeHi, languages,
//       } = req.body;

//       const parsedLanguages = languages ? JSON.parse(languages) : ['en', 'te'];
//       if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });

//       if (!storyId) return res.status(400).json({ error: 'storyId is required' });

//       const storyConnection = req.app.get('storyConnection');
//       const StoryCollection = storyConnection.model('StoryCollection', storyCollectionSchema);
//       const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//       if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

//       const story = storyCollection.stories.find((s) => s.id === storyId);
//       if (!story) return res.status(404).json({ error: 'Story not found' });

//       const invalidLanguages = parsedLanguages.filter((lang) => !story.languages.includes(lang));
//       if (invalidLanguages.length) {
//         return res.status(400).json({ error: `Cannot add part in languages not set in story: ${invalidLanguages.join(', ')}` });
//       }

//       const removeLanguages = req.body.removeLanguages ? JSON.parse(req.body.removeLanguages) : [];
//       const deleteContent = req.body.deleteContent === 'true';

//       const title = {};
//       const date = {};
//       const description = {};
//       const timeToRead = {};
//       const storyType = {};
//       if (parsedLanguages.includes('en')) {
//         if (!titleEn) return res.status(400).json({ error: 'titleEn is required when English is selected' });
//         title.en = titleEn;
//         date.en = dateEn || '';
//         description.en = descriptionEn || '';
//         timeToRead.en = timeToReadEn || '';
//         storyType.en = storyTypeEn || '';
//       }
//       if (parsedLanguages.includes('te')) {
//         if (!titleTe) return res.status(400).json({ error: 'titleTe is required when Telugu is selected' });
//         title.te = titleTe;
//         date.te = dateTe || '';
//         description.te = descriptionTe || '';
//         timeToRead.te = timeToReadTe || '';
//         storyType.te = storyTypeTe || '';
//       }
//       if (parsedLanguages.includes('hi')) {
//         if (!titleHi) return res.status(400).json({ error: 'titleHi is required when Hindi is selected' });
//         title.hi = titleHi;
//         date.hi = dateHi || '';
//         description.hi = descriptionHi || '';
//         timeToRead.hi = timeToReadHi || '';
//         storyType.hi = storyTypeHi || '';
//       }

//       const parts = [];
//       let index = 0;
//       while (req.body[`headingEn${index}`] || req.body[`headingTe${index}`] || req.body[`headingHi${index}`]) {
//         const partImageField = req.files.find((f) => f.fieldname === `partImage${index}`);
//         const heading = {};
//         const quote = {};
//         const text = {};
//         if (parsedLanguages.includes('en')) {
//           if (!req.body[`headingEn${index}`]) return res.status(400).json({ error: `headingEn${index} is required` });
//           if (!req.body[`textEn${index}`]) return res.status(400).json({ error: `textEn${index} is required` });
//           heading.en = req.body[`headingEn${index}`];
//           quote.en = req.body[`quoteEn${index}`] || '';
//           text.en = req.body[`textEn${index}`];
//         }
//         if (parsedLanguages.includes('te')) {
//           if (!req.body[`headingTe${index}`]) return res.status(400).json({ error: `headingTe${index} is required` });
//           if (!req.body[`textTe${index}`]) return res.status(400).json({ error: `textTe${index} is required` });
//           heading.te = req.body[`headingTe${index}`];
//           quote.te = req.body[`quoteTe${index}`] || '';
//           text.te = req.body[`textTe${index}`];
//         }
//         if (parsedLanguages.includes('hi')) {
//           if (!req.body[`headingHi${index}`]) return res.status(400).json({ error: `headingHi${index} is required` });
//           if (!req.body[`textHi${index}`]) return res.status(400).json({ error: `textHi${index} is required` });
//           heading.hi = req.body[`headingHi${index}`];
//           quote.hi = req.body[`quoteHi${index}`] || '';
//           text.hi = req.body[`textHi${index}`];
//         }
//         parts.push({
//           id: req.body[`id${index}`] || uuidv4(),
//           heading,
//           quote,
//           image: partImageField
//             ? `${BASE_URL}/${uuidv4()}${path.extname(partImageField.originalname)}`
//             : req.body[`partImage${index}`] || '',
//           text,
//         });
//         index++;
//       }

//       const newPart = {
//         id: partId || uuidv4(),
//         title,
//         date,
//         thumbnailImage: req.files.find((f) => f.fieldname === 'thumbnailImage')
//           ? `${BASE_URL}/${uuidv4()}${path.extname(req.files.find((f) => f.fieldname === 'thumbnailImage').originalname)}`
//           : req.body.thumbnailImage || '',
//         description,
//         timeToRead,
//         storyType,
//         part: parts,
//       };

//       if (partId && deleteContent && removeLanguages.length > 0) {
//         const partIndex = story.parts.card.findIndex((p) => p.id === partId);
//         if (partIndex !== -1) {
//           const existingPart = story.parts.card[partIndex];
//           removeLanguages.forEach((lang) => {
//             newPart.title[lang] = '';
//             newPart.date[lang] = '';
//             newPart.description[lang] = '';
//             newPart.timeToRead[lang] = '';
//             newPart.storyType[lang] = '';
//             newPart.part.forEach((p, i) => {
//               p.heading[lang] = existingPart.part[i]?.heading[lang] || '';
//               p.quote[lang] = existingPart.part[i]?.quote[lang] || '';
//               p.text[lang] = existingPart.part[i]?.text[lang] || '';
//             });
//           });
//           story.parts.card[partIndex] = newPart;
//         }
//       } else if (partId) {
//         const partIndex = story.parts.card.findIndex((p) => p.id === partId);
//         if (partIndex !== -1) {
//           const existingPart = story.parts.card[partIndex];
//           ['en', 'te', 'hi'].forEach((lang) => {
//             if (!parsedLanguages.includes(lang)) {
//               newPart.title[lang] = existingPart.title[lang] || '';
//               newPart.date[lang] = existingPart.date[lang] || '';
//               newPart.description[lang] = existingPart.description[lang] || '';
//               newPart.timeToRead[lang] = existingPart.timeToRead[lang] || '';
//               newPart.storyType[lang] = existingPart.storyType[lang] || '';
//               newPart.part.forEach((p, i) => {
//                 if (existingPart.part[i]) {
//                   p.heading[lang] = existingPart.part[i].heading[lang] || '';
//                   p.quote[lang] = existingPart.part[i].quote[lang] || '';
//                   p.text[lang] = existingPart.part[i].text[lang] || '';
//                 }
//               });
//             }
//           });
//           story.parts.card[partIndex] = newPart;
//         } else {
//           story.parts.card.push(newPart);
//         }
//       } else {
//         story.parts.card.push(newPart);
//       }

//       await storyCollection.save();
//       console.log('POST /parts - Success:', newPart);
//       res.status(201).json({ message: partId ? 'Part updated' : 'Part added', part: newPart });
//     } catch (err) {
//       console.error('POST /parts error:', err);
//       res.status(500).json({ error: 'Failed to manage part', details: err.message });
//     }
//   }
// );

// // DELETE part
// router.delete('/parts/:storyId/:partId', authenticateToken, async (req, res) => {
//   try {
//     const { storyId, partId } = req.params;
//     const storyConnection = req.app.get('storyConnection');
//     const StoryCollection = storyConnection.model('StoryCollection', storyCollectionSchema);
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     const story = storyCollection.stories.find((s) => s.id === storyId);
//     if (!story) return res.status(404).json({ error: 'Story not found' });

//     story.parts.card = story.parts.card.filter((part) => part.id !== partId);
//     await storyCollection.save();

//     res.json({ message: 'Part deleted successfully' });
//   } catch (err) {
//     console.error('DELETE /parts error:', err);
//     res.status(500).json({ error: 'Failed to delete part', details: err.message });
//   }
// });

// module.exports = router;


// TODO: old code

// -----this is before DB connection----- for admin login



// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const StoryCollection = require('../models/Story');
// const { v4: uuidv4 } = require('uuid');
// const path = require('path');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// // Base URL for image paths (placeholder until cloud storage)
// const BASE_URL = 'https://bharatstorybooks.com/uploads';

// // Multer setup with memory storage
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
//     if (extname && mimetype) cb(null, true);
//     else cb(new Error('Only JPEG/PNG images are allowed'));
//   },
// });

// // Middleware to verify JWT
// const authenticateToken = (req, res, next) => {
//   const token = req.headers['authorization']?.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'No token provided' });

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) return res.status(403).json({ error: 'Invalid token' });
//     req.user = user;
//     next();
//   });
// };

// // GET all stories
// router.get('/stories', authenticateToken, async (req, res) => {
//   try {
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     res.json(storyCollection ? storyCollection.stories : []);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
//   }
// });

// // GET single story
// router.get('/stories/:id', authenticateToken, async (req, res) => {
//   try {
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     const story = storyCollection.stories.find((s) => s.id === req.params.id);
//     if (!story) return res.status(404).json({ error: 'Story not found' });
//     res.json(story);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch story', details: err.message });
//   }
// });

// // POST new story
// router.post(
//   '/stories',
//   authenticateToken,
//   upload.fields([
//     { name: 'storyCoverImage', maxCount: 1 },
//     { name: 'bannerImge', maxCount: 1 },
//   ]),
//   async (req, res) => {
//     try {
//       const { nameEn, nameTe, nameHi, languages } = req.body;
//       const parsedLanguages = languages ? JSON.parse(languages) : ['en', 'te'];
//       if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });

//       const name = {};
//       if (parsedLanguages.includes('en')) name.en = nameEn || '';
//       if (parsedLanguages.includes('te')) name.te = nameTe || '';
//       if (parsedLanguages.includes('hi')) name.hi = nameHi || '';

//       const storyCoverImage = req.files?.['storyCoverImage']
//         ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['storyCoverImage'][0].originalname)}`
//         : '';
//       const bannerImge = req.files?.['bannerImge']
//         ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['bannerImge'][0].originalname)}`
//         : '';

//       const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//       const newStory = {
//         id: uuidv4(),
//         name,
//         languages: parsedLanguages,
//         storyCoverImage,
//         bannerImge,
//         parts: { card: [] },
//       };

//       if (!storyCollection) {
//         await StoryCollection.create({ language: 'Eng', stories: [newStory] });
//       } else {
//         storyCollection.stories.push(newStory);
//         await storyCollection.save();
//       }

//       res.status(201).json({ message: 'Story added', story: newStory });
//     } catch (err) {
//       console.error('POST /stories error:', err);
//       res.status(500).json({ error: 'Failed to add story', details: err.message });
//     }
//   }
// );

// // PUT update story
// router.put(
//   '/stories/:id',
//   authenticateToken,
//   upload.any(),
//   async (req, res) => {
//     try {
//       const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//       if (!storyCollection) return res.status(404).json({ error: 'Story collection not found' });

//       const storyIndex = storyCollection.stories.findIndex((s) => s.id === req.params.id);
//       if (storyIndex === -1) return res.status(404).json({ error: 'Story not found' });

//       const existingStory = storyCollection.stories[storyIndex];
//       const languages = JSON.parse(req.body.languages || '[]');
//       const removeLanguages = req.body.removeLanguages ? JSON.parse(req.body.removeLanguages) : [];
//       const deleteContent = req.body.deleteContent === 'true';

//       console.log('Existing Story:', existingStory);
//       console.log('Request Body:', req.body);
//       console.log('Files:', req.files);
//       console.log('Remove Languages:', removeLanguages);
//       console.log('Delete Content:', deleteContent);

//       const updatedFields = {
//         'stories.$.name.en': languages.includes('en') ? req.body.nameEn || existingStory.name.en : existingStory.name.en,
//         'stories.$.name.te': languages.includes('te') ? req.body.nameTe || existingStory.name.te : existingStory.name.te,
//         'stories.$.name.hi': languages.includes('hi') ? req.body.nameHi || existingStory.name.hi || '' : existingStory.name.hi || '',
//         'stories.$.languages': languages,
//       };

//       const storyCoverImageFile = req.files.find((f) => f.fieldname === 'storyCoverImage');
//       if (storyCoverImageFile) {
//         updatedFields['stories.$.storyCoverImage'] = `${BASE_URL}/${uuidv4()}${path.extname(storyCoverImageFile.originalname)}`;
//       }
//       const bannerImgeFile = req.files.find((f) => f.fieldname === 'bannerImge');
//       if (bannerImgeFile) {
//         updatedFields['stories.$.bannerImge'] = `${BASE_URL}/${uuidv4()}${path.extname(bannerImgeFile.originalname)}`;
//       }

//       // Handle language removal and content deletion
//       if (removeLanguages.length > 0 && deleteContent) {
//         removeLanguages.forEach((lang) => {
//           // Remove from story name
//           updatedFields[`stories.$.name.${lang}`] = '';
//           // Remove from all parts
//           existingStory.parts.card.forEach((card, index) => {
//             updatedFields[`stories.$.parts.card.${index}.title.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.date.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.description.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.timeToRead.${lang}`] = '';
//             updatedFields[`stories.$.parts.card.${index}.storyType.${lang}`] = '';
//             card.part.forEach((part, partIndex) => {
//               updatedFields[`stories.$.parts.card.${index}.part.${partIndex}.heading.${lang}`] = '';
//               updatedFields[`stories.$.parts.card.${index}.part.${partIndex}.quote.${lang}`] = '';
//               updatedFields[`stories.$.parts.card.${index}.part.${partIndex}.text.${lang}`] = '';
//             });
//           });
//         });
//       }

//       console.log('Updated Fields:', updatedFields);

//       const updatedCollection = await StoryCollection.findOneAndUpdate(
//         { language: 'Eng', 'stories.id': req.params.id },
//         { $set: updatedFields },
//         { new: true }
//       );

//       if (!updatedCollection) return res.status(500).json({ error: 'Failed to update story in database' });

//       const updatedStory = updatedCollection.stories.find((s) => s.id === req.params.id);
//       console.log('Updated Story from DB:', updatedStory);

//       res.json({ message: 'Story updated', story: updatedStory });
//     } catch (err) {
//       console.error('PUT /stories/:id error:', err);
//       res.status(500).json({ error: 'Failed to update story', details: err.message });
//     }
//   }
// );

// // DELETE story
// router.delete('/stories/:id', authenticateToken, async (req, res) => {
//   try {
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     const storyIndex = storyCollection.stories.findIndex((s) => s.id === req.params.id);
//     if (storyIndex === -1) return res.status(404).json({ error: 'Story not found' });

//     storyCollection.stories.splice(storyIndex, 1);
//     await storyCollection.save();

//     res.json({ message: 'Story and its parts deleted successfully' });
//   } catch (err) {
//     console.error('DELETE /stories/:id error:', err);
//     res.status(500).json({ error: 'Failed to delete story', details: err.message });
//   }
// });

// // POST a part (add or update)
// router.post(
//   '/parts',
//   authenticateToken,
//   upload.any(),
//   async (req, res) => {
//     try {
//       console.log('POST /parts - req.body:', req.body);
//       console.log('POST /parts - req.files:', req.files || 'No files uploaded');

//       const {
//         storyId, partId, titleEn, titleTe, titleHi, dateEn, dateTe, dateHi,
//         descriptionEn, descriptionTe, descriptionHi, timeToReadEn, timeToReadTe, timeToReadHi,
//         storyTypeEn, storyTypeTe, storyTypeHi, languages,
//       } = req.body;

//       const parsedLanguages = languages ? JSON.parse(languages) : ['en', 'te'];
//       if (!parsedLanguages.length) return res.status(400).json({ error: 'At least one language required' });

//       if (!storyId) return res.status(400).json({ error: 'storyId is required' });

//       const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//       if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

//       const story = storyCollection.stories.find((s) => s.id === storyId);
//       if (!story) return res.status(404).json({ error: 'Story not found' });

//       const invalidLanguages = parsedLanguages.filter((lang) => !story.languages.includes(lang));
//       if (invalidLanguages.length) {
//         return res.status(400).json({ error: `Cannot add part in languages not set in story: ${invalidLanguages.join(', ')}` });
//       }

//       const removeLanguages = req.body.removeLanguages ? JSON.parse(req.body.removeLanguages) : [];
//       const deleteContent = req.body.deleteContent === 'true';

//       const title = {};
//       const date = {};
//       const description = {};
//       const timeToRead = {};
//       const storyType = {};
//       if (parsedLanguages.includes('en')) {
//         if (!titleEn) return res.status(400).json({ error: 'titleEn is required when English is selected' });
//         title.en = titleEn;
//         date.en = dateEn || '';
//         description.en = descriptionEn || '';
//         timeToRead.en = timeToReadEn || '';
//         storyType.en = storyTypeEn || '';
//       }
//       if (parsedLanguages.includes('te')) {
//         if (!titleTe) return res.status(400).json({ error: 'titleTe is required when Telugu is selected' });
//         title.te = titleTe;
//         date.te = dateTe || '';
//         description.te = descriptionTe || '';
//         timeToRead.te = timeToReadTe || '';
//         storyType.te = storyTypeTe || '';
//       }
//       if (parsedLanguages.includes('hi')) {
//         if (!titleHi) return res.status(400).json({ error: 'titleHi is required when Hindi is selected' });
//         title.hi = titleHi;
//         date.hi = dateHi || '';
//         description.hi = descriptionHi || '';
//         timeToRead.hi = timeToReadHi || '';
//         storyType.hi = storyTypeHi || '';
//       }

//       const parts = [];
//       let index = 0;
//       while (req.body[`headingEn${index}`] || req.body[`headingTe${index}`] || req.body[`headingHi${index}`]) {
//         const partImageField = req.files.find((f) => f.fieldname === `partImage${index}`);
//         const heading = {};
//         const quote = {};
//         const text = {};
//         if (parsedLanguages.includes('en')) {
//           if (!req.body[`headingEn${index}`]) return res.status(400).json({ error: `headingEn${index} is required` });
//           if (!req.body[`textEn${index}`]) return res.status(400).json({ error: `textEn${index} is required` });
//           heading.en = req.body[`headingEn${index}`];
//           quote.en = req.body[`quoteEn${index}`] || '';
//           text.en = req.body[`textEn${index}`];
//         }
//         if (parsedLanguages.includes('te')) {
//           if (!req.body[`headingTe${index}`]) return res.status(400).json({ error: `headingTe${index} is required` });
//           if (!req.body[`textTe${index}`]) return res.status(400).json({ error: `textTe${index} is required` });
//           heading.te = req.body[`headingTe${index}`];
//           quote.te = req.body[`quoteTe${index}`] || '';
//           text.te = req.body[`textTe${index}`];
//         }
//         if (parsedLanguages.includes('hi')) {
//           if (!req.body[`headingHi${index}`]) return res.status(400).json({ error: `headingHi${index} is required` });
//           if (!req.body[`textHi${index}`]) return res.status(400).json({ error: `textHi${index} is required` });
//           heading.hi = req.body[`headingHi${index}`];
//           quote.hi = req.body[`quoteHi${index}`] || '';
//           text.hi = req.body[`textHi${index}`];
//         }
//         parts.push({
//           id: req.body[`id${index}`] || uuidv4(),
//           heading,
//           quote,
//           image: partImageField
//             ? `${BASE_URL}/${uuidv4()}${path.extname(partImageField.originalname)}`
//             : req.body[`partImage${index}`] || '',
//           text,
//         });
//         index++;
//       }

//       const newPart = {
//         id: partId || uuidv4(),
//         title,
//         date,
//         thumbnailImage: req.files.find((f) => f.fieldname === 'thumbnailImage')
//           ? `${BASE_URL}/${uuidv4()}${path.extname(req.files.find((f) => f.fieldname === 'thumbnailImage').originalname)}`
//           : req.body.thumbnailImage || '',
//         description,
//         timeToRead,
//         storyType,
//         part: parts,
//       };

//       if (partId && deleteContent && removeLanguages.length > 0) {
//         const partIndex = story.parts.card.findIndex((p) => p.id === partId);
//         if (partIndex !== -1) {
//           const existingPart = story.parts.card[partIndex];
//           removeLanguages.forEach((lang) => {
//             newPart.title[lang] = '';
//             newPart.date[lang] = '';
//             newPart.description[lang] = '';
//             newPart.timeToRead[lang] = '';
//             newPart.storyType[lang] = '';
//             newPart.part.forEach((p, i) => {
//               p.heading[lang] = existingPart.part[i]?.heading[lang] || '';
//               p.quote[lang] = existingPart.part[i]?.quote[lang] || '';
//               p.text[lang] = existingPart.part[i]?.text[lang] || '';
//             });
//           });
//           story.parts.card[partIndex] = newPart;
//         }
//       } else if (partId) {
//         const partIndex = story.parts.card.findIndex((p) => p.id === partId);
//         if (partIndex !== -1) {
//           const existingPart = story.parts.card[partIndex];
//           // Preserve existing data for unselected languages
//           ['en', 'te', 'hi'].forEach((lang) => {
//             if (!parsedLanguages.includes(lang)) {
//               newPart.title[lang] = existingPart.title[lang] || '';
//               newPart.date[lang] = existingPart.date[lang] || '';
//               newPart.description[lang] = existingPart.description[lang] || '';
//               newPart.timeToRead[lang] = existingPart.timeToRead[lang] || '';
//               newPart.storyType[lang] = existingPart.storyType[lang] || '';
//               newPart.part.forEach((p, i) => {
//                 if (existingPart.part[i]) {
//                   p.heading[lang] = existingPart.part[i].heading[lang] || '';
//                   p.quote[lang] = existingPart.part[i].quote[lang] || '';
//                   p.text[lang] = existingPart.part[i].text[lang] || '';
//                 }
//               });
//             }
//           });
//           story.parts.card[partIndex] = newPart;
//         } else {
//           story.parts.card.push(newPart);
//         }
//       } else {
//         story.parts.card.push(newPart);
//       }

//       await storyCollection.save();
//       console.log('POST /parts - Success:', newPart);
//       res.status(201).json({ message: partId ? 'Part updated' : 'Part added', part: newPart });
//     } catch (err) {
//       console.error('POST /parts error:', err);
//       res.status(500).json({ error: 'Failed to manage part', details: err.message });
//     }
//   }
// );


// router.delete('/parts/:storyId/:partId', authenticateToken, async (req, res) => {
//   try {
//     const { storyId, partId } = req.params;
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     const story = storyCollection.stories.find((s) => s.id === storyId);
//     if (!story) return res.status(404).json({ error: 'Story not found' });

//     story.parts.card = story.parts.card.filter((part) => part.id !== partId);
//     await storyCollection.save();

//     res.json({ message: 'Part deleted successfully' });
//   } catch (err) {
//     console.error('DELETE /parts error:', err);
//     res.status(500).json({ error: 'Failed to delete part', details: err.message });
//   }
// });

// module.exports = router;



