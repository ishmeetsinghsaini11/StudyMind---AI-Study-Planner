const express = require('express');
const router = express.Router();
const db = require('../db/database');
const groqService = require('../services/groqService');

// GET /api/chat/history/:userId
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Load last 20 messages from chat_history
    const messages = await new Promise((resolve, reject) => {
      db.all(
        'SELECT role, message, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.reverse());
        }
      );
    });

    res.json({ messages });
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { userId, message } = req.body;
    console.log('Chat request for userId:', userId);

    // Load last 8 messages from chat_history
    const history = await new Promise((resolve, reject) => {
      db.all(
        'SELECT role, message FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 8',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.reverse());
        }
      );
    });

    // Fetch today's tasks
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT title, is_completed FROM tasks WHERE user_id = ? AND date = ?',
        [userId, today],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const completedToday = todayTasks.filter(t => t.is_completed === 1).length;

    // Fetch the user's latest plan from DB
    const plan = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    let planData = null;
    if (plan) {
      planData = typeof plan.plan_json === 'string' 
        ? JSON.parse(plan.plan_json) 
        : plan.plan_json;
    }

    // Fetch progress stats
    const completedTasks = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND is_completed = 1',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { count: 0 });
        }
      );
    });

    const totalTasks = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM tasks WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { count: 0 });
        }
      );
    });

    // Build userContext
    const userContext = {
      subject: planData?.subject || 'your subject',
      currentDay: totalTasks.count > 0 
        ? Math.ceil((completedTasks.count / totalTasks.count) * (planData?.total_days || 14))
        : 1,
      totalDays: planData?.total_days || 14,
      todayTasks: todayTasks,
      completedToday: completedToday,
      weakAreas: planData?.weak_areas || [],
      examReadiness: planData?.exam_readiness_estimate || 'unknown',
      streak: 1 // TODO: calculate actual streak from consecutive completed days
    };

    console.log('User context:', userContext);

    // Build messages array
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.message })),
      { role: 'user', content: message }
    ];

    // Call Groq chat with context
    const reply = await groqService.chatWithAI(messages, userContext);

    // Save user message and assistant reply to chat_history
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO chat_history (user_id, role, message) VALUES (?, ?, ?)',
        [userId, 'user', message],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO chat_history (user_id, role, message) VALUES (?, ?, ?)',
        [userId, 'assistant', reply],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ reply });
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
