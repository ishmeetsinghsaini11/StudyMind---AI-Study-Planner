const express = require('express');
const router = express.Router();
const db = require('../db/database');
const groqService = require('../services/groqService');

// POST /api/flashcards/generate
router.post('/generate', async (req, res) => {
  try {
    const { userId, topic } = req.body;

    // Generate flashcards using Groq
    const cards = await groqService.generateFlashcards(topic);

    // Save each card to flashcards table
    const cardInserts = cards.map((card) => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO flashcards (user_id, topic, question, answer) VALUES (?, ?, ?, ?)',
          [userId, topic, card.question, card.answer],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    });

    await Promise.all(cardInserts);

    res.json(cards);
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flashcards/:userId
router.get('/:userId', async (req, res) => {
  try {
    const cards = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM flashcards WHERE user_id = ? ORDER BY last_reviewed DESC',
        [req.params.userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Group by topic
    const grouped = cards.reduce((acc, card) => {
      if (!acc[card.topic]) {
        acc[card.topic] = [];
      }
      acc[card.topic].push(card);
      return acc;
    }, {});

    res.json(grouped);
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/flashcards/review
router.post('/review', (req, res) => {
  try {
    const { cardId, rating } = req.body;
    console.log('Recording review for card:', cardId, 'rating:', rating);

    if (!cardId) {
      return res.status(400).json({ error: 'cardId is required' });
    }

    db.run(
      'UPDATE flashcards SET times_reviewed = times_reviewed + 1, last_reviewed = CURRENT_TIMESTAMP WHERE id = ?',
      [cardId],
      function(err) {
        if (err) {
          console.error('[Route Error]', err);
          res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
          res.status(404).json({ error: 'Card not found with id: ' + cardId });
        } else {
          console.log('Review recorded successfully for card:', cardId);
          res.json({ success: true, cardId, rating });
        }
      }
    );
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
