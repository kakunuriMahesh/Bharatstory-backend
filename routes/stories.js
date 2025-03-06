const express = require('express');
const router = express.Router();
const multer = require('multer');
const StoryCollection = require('../models/Story');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Base URL for image paths (placeholder until cloud storage)
const BASE_URL = 'https://bharatstorybooks.com/uploads';

// Multer setup with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Only JPEG/PNG images are allowed'));
  },
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

// GET all stories
router.get('/stories', async (req, res) => {
  try {
    console.log('GET /stories - Fetching stories');
    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    res.json(storyCollection ? storyCollection.stories : []);
  } catch (err) {
    console.error('GET /stories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
  }
});

// POST a new story
router.post('/stories', (req, res, next) => {
  upload.fields([
    { name: 'storyCoverImage', maxCount: 1 },
    { name: 'bannerImge', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    console.log('POST /stories - req.body:', req.body);
    console.log('POST /stories - req.files:', req.files || 'No files uploaded');

    const { nameEn, nameTe } = req.body;

    if (!nameEn || !nameTe) {
      console.log('POST /stories - Validation failed: Missing nameEn or nameTe');
      return res.status(400).json({ error: 'nameEn and nameTe are required' });
    }

    const storyCoverImage = req.files && req.files['storyCoverImage'] && req.files['storyCoverImage'][0]
      ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['storyCoverImage'][0].originalname)}`
      : '';
    const bannerImge = req.files && req.files['bannerImge'] && req.files['bannerImge'][0]
      ? `${BASE_URL}/${uuidv4()}${path.extname(req.files['bannerImge'][0].originalname)}`
      : '';

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    const newStory = {
      id: uuidv4(),
      name: { en: nameEn, te: nameTe },
      storyCoverImage, // Store URL instead of base64
      bannerImge, // Store URL instead of base64
      parts: { card: [] },
    };

    if (!storyCollection) {
      console.log('POST /stories - Creating new collection');
      await StoryCollection.create({ language: 'Eng', stories: [newStory] });
    } else {
      console.log('POST /stories - Adding to existing collection');
      storyCollection.stories.push(newStory);
      await storyCollection.save();
    }

    console.log('POST /stories - Success:', newStory);
    res.status(201).json({ message: 'Story added', story: newStory });
  } catch (err) {
    console.error('POST /stories error:', err);
    res.status(500).json({ error: 'Failed to add story', details: err.message });
  }
});

// POST a part (add or update)
router.post('/parts', (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    console.log('POST /parts - req.body:', req.body);
    console.log('POST /parts - req.files:', req.files || 'No files uploaded');

    const {
      storyId, partId, titleEn, titleTe, dateEn, dateTe,
      descriptionEn, descriptionTe, timeToReadEn, timeToReadTe,
      storyTypeEn, storyTypeTe,
    } = req.body;

    if (!storyId || !titleEn || !titleTe) {
      console.log('POST /parts - Validation failed: Missing required fields');
      return res.status(400).json({ error: 'storyId, titleEn, and titleTe are required' });
    }

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

    const story = storyCollection.stories.find((s) => s.id === storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const parts = [];
    let index = 0;
    while (req.body[`headingEn${index}`] || req.body[`headingTe${index}`]) {
      const partImageField = req.files && req.files.find((f) => f.fieldname === `partImage${index}`);
      parts.push({
        id: uuidv4(),
        heading: { en: req.body[`headingEn${index}`] || '', te: req.body[`headingTe${index}`] || '' },
        quote: { en: req.body[`quoteEn${index}`] || '', te: req.body[`quoteTe${index}`] || '' },
        image: partImageField 
          ? `${BASE_URL}/${uuidv4()}${path.extname(partImageField.originalname)}` 
          : req.body[`partImage${index}`] || '',
        text: { en: req.body[`textEn${index}`] || '', te: req.body[`textTe${index}`] || '' },
      });
      index++;
    }

    const newPart = {
      id: partId || uuidv4(),
      title: { en: titleEn || '', te: titleTe || '' },
      date: { en: dateEn || '', te: dateTe || '' },
      thumbnailImage: req.files && req.files.find((f) => f.fieldname === 'thumbnailImage') 
        ? `${BASE_URL}/${uuidv4()}${path.extname(req.files.find((f) => f.fieldname === 'thumbnailImage').originalname)}` 
        : req.body.thumbnailImage || '',
      coverImage: req.files && req.files.find((f) => f.fieldname === 'coverImage') 
        ? `${BASE_URL}/${uuidv4()}${path.extname(req.files.find((f) => f.fieldname === 'coverImage').originalname)}` 
        : req.body.coverImage || '',
      description: { en: descriptionEn || '', te: descriptionTe || '' },
      timeToRead: { en: timeToReadEn || '', te: timeToReadTe || '' },
      storyType: { en: storyTypeEn || '', te: storyTypeTe || '' },
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
router.delete('/parts/:storyId/:partId', async (req, res) => {
  try {
    const { storyId, partId } = req.params;
    console.log('DELETE /parts - storyId:', storyId, 'partId:', partId);

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

    const story = storyCollection.stories.find((s) => s.id === storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    story.parts.card = story.parts.card.filter((part) => part.id !== partId);
    await storyCollection.save();

    console.log('DELETE /parts - Success');
    res.json({ message: 'Part deleted successfully' });
  } catch (err) {
    console.error('DELETE /parts error:', err);
    res.status(500).json({ error: 'Failed to delete part', details: err.message });
  }
});

module.exports = router;
// 

// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const StoryCollection = require('../models/Story');
// const { v4: uuidv4 } = require('uuid');
// const path = require('path');

// // Base URL for images with your domain
// const BASE_URL = 'https://bharatstorybooks.com';

// // Multer setup for image uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/'),
//   filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
// });
// const upload = multer({ storage });

// // Get all stories
// router.get('/stories', async (req, res) => {
//   try {
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     res.json(storyCollection ? storyCollection.stories : []);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
//   }
// });

// // Add a new story
// router.post('/stories', upload.fields([
//   { name: 'storyCoverImage', maxCount: 1 },
//   { name: 'bannerImge', maxCount: 1 },
// ]), async (req, res) => {
//   try {
//     console.log('Adding Story - req.body:', req.body);
//     console.log('Adding Story - req.files:', req.files);
//     const { nameEn, nameTe } = req.body;
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     const newStory = {
//       id: uuidv4(),
//       name: { en: nameEn, te: nameTe },
//       storyCoverImage: req.files['storyCoverImage'] ? `${BASE_URL}/uploads/${req.files['storyCoverImage'][0].filename}` : '',
//       bannerImge: req.files['bannerImge'] ? `${BASE_URL}/uploads/${req.files['bannerImge'][0].filename}` : '',
//       parts: { card: [] },
//     };

//     if (!storyCollection) {
//       await StoryCollection.create({ language: 'Eng', stories: [newStory] });
//     } else {
//       storyCollection.stories.push(newStory);
//       await storyCollection.save();
//     }

//     res.status(201).json({ message: 'Story added', story: newStory });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to add story', details: err.message });
//   }
// });

// // Add or update a part
// router.post('/parts', upload.any(), async (req, res) => {
//   try {
//     console.log('Received /parts - req.body:', req.body);
//     console.log('Received /parts - req.files:', req.files);

//     const {
//       storyId, partId, titleEn, titleTe, dateEn, dateTe,
//       descriptionEn, descriptionTe, timeToReadEn, timeToReadTe,
//       storyTypeEn, storyTypeTe,
//     } = req.body;

//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

//     const story = storyCollection.stories.find((s) => s.id === storyId);
//     if (!story) return res.status(404).json({ error: 'Story not found' });

//     // Extract parts dynamically
//     const parts = [];
//     let index = 0;
//     console.log('Starting part extraction...');
//     while (Object.keys(req.body).some(key => 
//       key === `headingEn${index}` || 
//       key === `headingTe${index}` || 
//       key === `textEn${index}` || 
//       key === `textTe${index}` || 
//       key === `quoteEn${index}` || 
//       key === `quoteTe${index}`
//     )) {
//       const partImageField = req.files.find((f) => f.fieldname === `partImage${index}`);
//       const part = {
//         id: uuidv4(),
//         heading: {
//           en: req.body[`headingEn${index}`] || '',
//           te: req.body[`headingTe${index}`] || '',
//         },
//         quote: {
//           en: req.body[`quoteEn${index}`] || '',
//           te: req.body[`quoteTe${index}`] || '',
//         },
//         image: partImageField ? `${BASE_URL}/uploads/${partImageField.filename}` : req.body[`partImage${index}`] || '',
//         text: {
//           en: req.body[`textEn${index}`] || '',
//           te: req.body[`textTe${index}`] || '',
//         },
//       };
//       console.log(`Extracted part ${index}:`, part);
//       parts.push(part);
//       index++;
//     }

//     const newPart = {
//       id: partId || uuidv4(),
//       title: { en: titleEn, te: titleTe },
//       date: { en: dateEn, te: dateTe },
//       thumbnailImage: req.files.find((f) => f.fieldname === 'thumbnailImage') 
//         ? `${BASE_URL}/uploads/${req.files.find((f) => f.fieldname === 'thumbnailImage').filename}` 
//         : req.body.thumbnailImage || '',
//       coverImage: req.files.find((f) => f.fieldname === 'coverImage') 
//         ? `${BASE_URL}/uploads/${req.files.find((f) => f.fieldname === 'coverImage').filename}` 
//         : req.body.coverImage || '',
//       description: { en: descriptionEn, te: descriptionTe },
//       timeToRead: { en: timeToReadEn, te: timeToReadTe },
//       storyType: { en: storyTypeEn, te: storyTypeTe },
//       part: parts,
//     };

//     console.log('Constructed newPart:', newPart);

//     if (partId) {
//       const partIndex = story.parts.card.findIndex((p) => p.id === partId);
//       if (partIndex !== -1) {
//         story.parts.card[partIndex] = newPart;
//       } else {
//         story.parts.card.push(newPart);
//       }
//     } else {
//       story.parts.card.push(newPart);
//     }

//     await storyCollection.save();
//     console.log('Database updated successfully');
//     res.status(201).json({ message: partId ? 'Part updated' : 'Part added', part: newPart });
//   } catch (err) {
//     console.error('Error in /parts:', err);
//     res.status(500).json({ error: 'Failed to manage part', details: err.message });
//   }
// });

// // Delete a part
// router.delete('/parts/:storyId/:partId', async (req, res) => {
//   try {
//     const { storyId, partId } = req.params;
//     console.log('Deleting part - storyId:', storyId, 'partId:', partId);
//     const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
//     if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

//     const story = storyCollection.stories.find((s) => s.id === storyId);
//     if (!story) return res.status(404).json({ error: 'Story not found' });

//     story.parts.card = story.parts.card.filter((part) => part.id !== partId);
//     await storyCollection.save();

//     res.json({ message: 'Part deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to delete part', details: err.message });
//   }
// });

// module.exports = router;