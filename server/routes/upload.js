const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/upload/syllabus
router.post('/syllabus', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);

    const data = await pdfParse(dataBuffer);
    const summary = data.text.substring(0, 3000);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({ summary });
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
