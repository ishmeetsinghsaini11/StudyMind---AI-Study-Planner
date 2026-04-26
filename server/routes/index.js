const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const groqService = require('../services/groqService');

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/plan/generate
router.post('/plan/generate', async (req, res) => {
  try {
    const { userId, subject, userProfile, syllabusSummary } = req.body;

    // Generate study plan using Groq
    const plan = await groqService.generateStudyPlan(userProfile, syllabusSummary);

    // Save plan to study_plans table
    const planResult = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO study_plans (user_id, subject, start_date, end_date, plan_json) VALUES (?, ?, ?, ?, ?)',
        [userId, subject, new Date().toISOString().split('T')[0], null, JSON.stringify(plan)],
        function(err) {
          if (err) reject(err);
          else resolve({ planId: this.lastID });
        }
      );
    });

    const planId = planResult.planId;

    // Flatten and save tasks to tasks table
    const taskInserts = plan.days.map((day) => {
      return day.tasks.map((task) => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO tasks (plan_id, user_id, day_number, topic, subtask, estimated_minutes, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [planId, userId, day.day, day.topics.join(', '), task.title, task.duration_mins, 0],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      });
    });

    await Promise.all(taskInserts.flat());

    res.json(plan);
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/plan/:userId
router.get('/plan/:userId', (req, res) => {
  db.get(
    'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.params.userId],
    (err, plan) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!plan) {
        res.status(404).json({ error: 'No plan found for this user' });
      } else {
        db.all(
          'SELECT * FROM tasks WHERE plan_id = ? ORDER BY day_number',
          [plan.id],
          (err, tasks) => {
            if (err) {
              res.status(500).json({ error: err.message });
            } else {
              res.json({ ...plan, tasks, plan_json: JSON.parse(plan.plan_json) });
            }
          }
        );
      }
    }
  );
});

// POST /api/progress/complete
router.post('/progress/complete', async (req, res) => {
  try {
    const { taskId, difficultyRating } = req.body;

    // Mark task as completed
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tasks SET is_completed = 1, difficulty_rating = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [difficultyRating, taskId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Get task info to check for plan adaptation
    const task = await new Promise((resolve, reject) => {
      db.get('SELECT plan_id, user_id FROM tasks WHERE id = ?', [taskId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Check if 3+ tasks in last 2 days have difficulty >= 4
    const recentTasks = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM tasks 
         WHERE user_id = ? 
         AND completed_at >= datetime('now', '-2 days')
         AND difficulty_rating >= 4`,
        [task.user_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    let planAdapted = false;

    if (recentTasks.length >= 3) {
      // Get current plan
      const plan = await new Promise((resolve, reject) => {
        db.get('SELECT plan_json FROM study_plans WHERE id = ?', [task.plan_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const planJson = JSON.parse(plan.plan_json);
      const progressData = {
        completedTasks: recentTasks.length,
        avgDifficulty: recentTasks.reduce((sum, t) => sum + t.difficulty_rating, 0) / recentTasks.length
      };

      // Adapt plan
      const adaptedDays = await groqService.adaptPlan(planJson, progressData);

      // Update plan with adapted days
      planJson.days = adaptedDays;
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE study_plans SET plan_json = ? WHERE id = ?',
          [JSON.stringify(planJson), task.plan_id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      planAdapted = true;
    }

    res.json({ success: true, planAdapted });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/progress/stats/:userId
router.get('/progress/stats/:userId', (req, res) => {
  db.get(
    `SELECT 
      COUNT(CASE WHEN is_completed = 1 THEN 1 END) * 100.0 / COUNT(*) as completionPercent,
      COUNT(CASE WHEN is_completed = 1 THEN 1 END) as tasksCompleted,
      COUNT(*) as totalTasks
     FROM tasks WHERE user_id = ?`,
    [req.params.userId],
    (err, stats) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Calculate current streak
      db.all(
        `SELECT DISTINCT date(completed_at) as completion_date
         FROM tasks 
         WHERE user_id = ? AND is_completed = 1
         ORDER BY completed_at DESC`,
        [req.params.userId],
        (err, dates) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          let currentStreak = 0;
          let checkDate = new Date();
          checkDate.setHours(0, 0, 0, 0);

          for (const row of dates) {
            const completionDate = new Date(row.completion_date);
            completionDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((checkDate - completionDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0 || diffDays === 1) {
              currentStreak++;
              checkDate = completionDate;
            } else {
              break;
            }
          }

          // Get weak areas (tasks with difficulty >= 4)
          db.all(
            `SELECT topic, COUNT(*) as count 
             FROM tasks 
             WHERE user_id = ? AND difficulty_rating >= 4
             GROUP BY topic
             ORDER BY count DESC
             LIMIT 5`,
            [req.params.userId],
            (err, weakAreas) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }

              // Get daily completion for last 7 days
              db.all(
                `SELECT date(completed_at) as date, COUNT(*) as count
                 FROM tasks 
                 WHERE user_id = ? AND is_completed = 1
                   AND completed_at >= datetime('now', '-7 days')
                 GROUP BY date(completed_at)
                 ORDER BY date DESC`,
                [req.params.userId],
                (err, dailyCompletion) => {
                  if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                  }

                  res.json({
                    completionPercent: Math.round(stats.completionPercent || 0),
                    tasksCompleted: stats.tasksCompleted || 0,
                    totalTasks: stats.totalTasks || 0,
                    currentStreak,
                    weakAreas: weakAreas.map(w => w.topic),
                    dailyCompletion: dailyCompletion.map(d => ({
                      date: d.date,
                      count: d.count
                    }))
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// POST /api/flashcards/generate
router.post('/flashcards/generate', async (req, res) => {
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
  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flashcards/:userId
router.get('/flashcards/:userId', (req, res) => {
  db.all(
    'SELECT * FROM flashcards WHERE user_id = ? ORDER BY last_reviewed DESC',
    [req.params.userId],
    (err, cards) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        // Group by topic
        const grouped = cards.reduce((acc, card) => {
          if (!acc[card.topic]) {
            acc[card.topic] = [];
          }
          acc[card.topic].push(card);
          return acc;
        }, {});

        res.json(grouped);
      }
    }
  );
});

// POST /api/flashcards/review
router.post('/flashcards/review', (req, res) => {
  const { cardId, rating } = req.body;

  db.run(
    'UPDATE flashcards SET times_reviewed = times_reviewed + 1, last_reviewed = CURRENT_TIMESTAMP WHERE id = ?',
    [cardId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    }
  );
});

// POST /api/chat
router.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;

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

    // Build userContext from latest study plan stats
    const plan = await new Promise((resolve, reject) => {
      db.get(
        'SELECT plan_json FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    let userContext = {
      subject: 'Unknown',
      currentDay: 1,
      totalDays: 14,
      weakAreas: []
    };

    if (plan) {
      const planJson = JSON.parse(plan.plan_json);
      userContext = {
        subject: planJson.subject || 'Unknown',
        currentDay: planJson.days?.filter(d => d.tasks?.some(t => t.completed))?.length + 1 || 1,
        totalDays: planJson.total_days || 14,
        weakAreas: planJson.weak_areas || []
      };
    }

    // Build messages array
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.message })),
      { role: 'user', content: message }
    ];

    // Call Groq chat
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
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload/syllabus
router.post('/upload/syllabus', upload.single('file'), async (req, res) => {
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
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users
router.post('/users', (req, res) => {
  const { name, email, learning_style, knowledge_level, daily_hours, energy_pattern, goal } = req.body;

  db.run(
    'INSERT INTO users (name, email, learning_style, knowledge_level, daily_hours, energy_pattern, goal) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, learning_style, knowledge_level, daily_hours, energy_pattern, goal],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ userId: this.lastID });
      }
    }
  );
});

// GET /api/users/:userId
router.get('/users/:userId', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.userId], (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.json(user);
    }
  });
});

module.exports = router;
