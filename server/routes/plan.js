const express = require('express');
const router = express.Router();
const db = require('../db/database');
const groqService = require('../services/groqService');

// POST /api/plan/generate
router.post('/generate', async (req, res) => {
  try {
    const { userId, subject, userProfile, syllabusSummary } = req.body;
    console.log('Generating plan for userId:', userId);
    console.log('Subject received:', subject);
    console.log('UserProfile received:', JSON.stringify(userProfile, null, 2));

    // Generate study plan using Groq
    const plan = await groqService.generateStudyPlan(userProfile, syllabusSummary);
    console.log('Study plan generated successfully');

    // Calculate real dates for each day
    const startDate = new Date();
    plan.days = plan.days.map((day, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return {
        ...day,
        date: date.toISOString().split('T')[0]  // "YYYY-MM-DD" format
      };
    });
    console.log('Dates calculated for', plan.days.length, 'days');

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
            'INSERT INTO tasks (plan_id, user_id, day_number, topic, title, estimated_minutes, difficulty, is_completed, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [planId, userId, day.day, day.topics.join(', '), task.title, task.duration_mins, day.difficulty, 0, day.date],
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
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plan/:userId
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching plan for userId:', userId);

    db.get(
      'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId],
      (err, plan) => {
        if (err) {
          console.error('Error fetching plan:', err);
          return res.status(500).json({ error: err.message });
        }
        
        console.log('Plan found:', plan ? plan.id : 'NONE');

        if (!plan) {
          return res.status(404).json({ error: 'No plan found', hasPlan: false });
        }

        let planJson;
        try {
          planJson = typeof plan.plan_json === 'string' 
            ? JSON.parse(plan.plan_json) 
            : plan.plan_json;
        } catch(e) {
          console.error('JSON parse error:', e);
          planJson = { days: [] };
        }

        // Get tasks for this plan
        db.all(
          'SELECT * FROM tasks WHERE plan_id = ?',
          [plan.id],
          (err, tasks) => {
            if (err) {
              console.error('Error fetching tasks:', err);
              return res.status(500).json({ error: err.message });
            }
            
            console.log('Tasks found:', tasks ? tasks.length : 'NONE');
            
            res.json({
              hasPlan: true,
              plan: {
                ...plan,
                plan_json: planJson
              },
              tasks: tasks || [],
              todayTasks: (tasks || []).filter(t => t.date === new Date().toISOString().split('T')[0]),
              stats: {
                totalTasks: (tasks || []).length,
                completedTasks: (tasks || []).filter(t => t.is_completed === 1).length,
                completionPercent: (tasks || []).length > 0 ? Math.round(((tasks || []).filter(t => t.is_completed === 1).length / (tasks || []).length) * 100) : 0,
                streak: 1, // TODO: calculate actual streak
                flashcardCount: 0 // TODO: get from flashcards table
              }
            });
          }
        );
      }
    );
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
