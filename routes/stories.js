const express = require('express');
const router = express.Router();
const multer = require('multer');
const StoryCollection = require('../models/Story');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Base URL for images (will be updated later for persistent storage)
const BASE_URL = 'https://bharatstorybooks.com';

// Multer setup for image uploads (temporary storage in Vercel)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// Get all stories
router.get('/stories', async (req, res) => {
  try {
    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    res.json(storyCollection ? storyCollection.stories : []);
  } catch (err) {
    console.error('GET /stories error:', err); // Log error for debugging
    res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
  }
});

// Add a new story
router.post('/stories', upload.fields([
  { name: 'storyCoverImage', maxCount: 1 },
  { name: 'bannerImge', maxCount: 1 },
]), async (req, res) => {
  try {
    console.log('POST /stories - req.body:', req.body); // Debug payload
    console.log('POST /stories - req.files:', req.files); // Debug uploaded files
    const { nameEn, nameTe } = req.body;

    // Validate required fields
    if (!nameEn || !nameTe) {
      return res.status(400).json({ error: 'nameEn and nameTe are required' });
    }

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    const newStory = {
      id: uuidv4(),
      name: { en: nameEn, te: nameTe },
      storyCoverImage: req.files['storyCoverImage'] 
        ? `${BASE_URL}/uploads/${req.files['storyCoverImage'][0].filename}` 
        : '',
      bannerImge: req.files['bannerImge'] 
        ? `${BASE_URL}/uploads/${req.files['bannerImge'][0].filename}` 
        : '',
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
    console.error('POST /stories error:', err); // Log detailed error
    res.status(500).json({ error: 'Failed to add story', details: err.message });
  }
});

// Add or update a part
router.post('/parts', upload.any(), async (req, res) => {
  try {
    console.log('POST /parts - req.body:', req.body); // Debug payload
    console.log('POST /parts - req.files:', req.files); // Debug uploaded files

    const {
      storyId, partId, titleEn, titleTe, dateEn, dateTe,
      descriptionEn, descriptionTe, timeToReadEn, timeToReadTe,
      storyTypeEn, storyTypeTe,
    } = req.body;

    // Validate required fields
    if (!storyId || !titleEn || !titleTe) {
      return res.status(400).json({ error: 'storyId, titleEn, and titleTe are required' });
    }

    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

    const story = storyCollection.stories.find((s) => s.id === storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Extract parts dynamically
    const parts = [];
    let index = 0;
    while (req.body[`headingEn${index}`] || req.body[`headingTe${index}`]) {
      const partImageField = req.files.find((f) => f.fieldname === `partImage${index}`);
      parts.push({
        id: uuidv4(),
        heading: {
          en: req.body[`headingEn${index}`] || '',
          te: req.body[`headingTe${index}`] || '',
        },
        quote: {
          en: req.body[`quoteEn${index}`] || '',
          te: req.body[`quoteTe${index}`] || '',
        },
        image: partImageField 
          ? `${BASE_URL}/uploads/${partImageField.filename}` 
          : req.body[`partImage${index}`] || '',
        text: {
          en: req.body[`textEn${index}`] || '',
          te: req.body[`textTe${index}`] || '',
        },
      });
      index++;
    }

    const newPart = {
      id: partId || uuidv4(),
      title: { en: titleEn || '', te: titleTe || '' },
      date: { en: dateEn || '', te: dateTe || '' },
      thumbnailImage: req.files.find((f) => f.fieldname === 'thumbnailImage') 
        ? `${BASE_URL}/uploads/${req.files.find((f) => f.fieldname === 'thumbnailImage').filename}` 
        : req.body.thumbnailImage || '',
      coverImage: req.files.find((f) => f.fieldname === 'coverImage') 
        ? `${BASE_URL}/uploads/${req.files.find((f) => f.fieldname === 'coverImage').filename}` 
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
    res.status(201).json({ message: partId ? 'Part updated' : 'Part added', part: newPart });
  } catch (err) {
    console.error('POST /parts error:', err); // Log detailed error
    res.status(500).json({ error: 'Failed to manage part', details: err.message });
  }
});

// Delete a part
router.delete('/parts/:storyId/:partId', async (req, res) => {
  try {
    const { storyId, partId } = req.params;
    console.log('DELETE /parts - storyId:', storyId, 'partId:', partId); // Debug params
    const storyCollection = await StoryCollection.findOne({ language: 'Eng' });
    if (!storyCollection) return res.status(404).json({ error: 'No stories found' });

    const story = storyCollection.stories.find((s) => s.id === storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    story.parts.card = story.parts.card.filter((part) => part.id !== partId);
    await storyCollection.save();

    res.json({ message: 'Part deleted successfully' });
  } catch (err) {
    console.error('DELETE /parts error:', err); // Log detailed error
    res.status(500).json({ error: 'Failed to delete part', details: err.message });
  }
});

module.exports = router;



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