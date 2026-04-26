const express = require('express');
const router = express.Router();
const db = require('../db/database');
const groqService = require('../services/groqService');

// POST /api/progress/complete
router.post('/complete', async (req, res) => {
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
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/:userId
router.get('/dashboard/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching dashboard data for userId:', userId);

    // 1. Latest plan
    const plan = db.prepare(
      'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(userId);

    if (!plan) {
      console.log('No plan found for userId:', userId);
      return res.json({ hasPlan: false });
    }

    const planJson = typeof plan.plan_json === 'string' 
      ? JSON.parse(plan.plan_json) 
      : plan.plan_json;

    // Migration: if any day.date is missing, calculate it on the fly
    if (planJson.days) {
      const startDate = new Date(plan.created_at || new Date());
      planJson.days = planJson.days.map((day, i) => {
        if (!day.date) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          day.date = d.toISOString().split('T')[0];
        }
        return day;
      });
    }

    console.log('Found plan:', plan.id);

    // 2. Task stats
    const totalTasks = db.prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE plan_id = ?'
    ).get(plan.id);

    const completedTasks = db.prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE plan_id = ? AND is_completed = 1'
    ).get(plan.id);

    // 3. Today's tasks
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = db.prepare(
      'SELECT * FROM tasks WHERE plan_id = ? AND date = ? ORDER BY id ASC'
    ).all(plan.id, today);

    // 4. Last 7 days completion (for chart)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = db.prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE plan_id = ? AND date = ? AND is_completed = 1"
      ).get(plan.id, dateStr);
      last7Days.push({ date: dateStr, completed: count.count });
    }

    // 5. Streak calculation
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const done = db.prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE plan_id = ? AND date = ? AND is_completed = 1"
      ).get(plan.id, dateStr);
      if (done.count > 0) streak++;
      else if (i > 0) break;
    }

    // 6. Weak areas (topics rated difficulty >= 4)
    const hardTasks = db.prepare(
      'SELECT topic FROM tasks WHERE plan_id = ? AND difficulty_rating >= 4'
    ).all(plan.id);
    const weakAreas = [...new Set(hardTasks.map(t => t.topic))].slice(0, 5);

    const response = {
      hasPlan: true,
      subject: planJson.subject,
      totalDays: planJson.total_days,
      examReadiness: planJson.exam_readiness_estimate,
      stats: {
        totalTasks: totalTasks.count,
        completedTasks: completedTasks.count,
        completionPercent: totalTasks.count > 0
          ? Math.round((completedTasks.count / totalTasks.count) * 100) : 0,
        streak,
        weakAreas
      },
      todayTasks,
      last7Days
    };

    console.log('Dashboard data fetched successfully');
    res.json(response);
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/stats/:userId
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get basic stats
    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(CASE WHEN is_completed = 1 THEN 1 END) * 100.0 / COUNT(*) as completionPercent,
          COUNT(CASE WHEN is_completed = 1 THEN 1 END) as tasksCompleted,
          COUNT(*) as totalTasks
         FROM tasks WHERE user_id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { completionPercent: 0, tasksCompleted: 0, totalTasks: 0 });
        }
      );
    });

    // Calculate current streak
    const dates = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT date(completed_at) as completion_date
         FROM tasks 
         WHERE user_id = ? AND is_completed = 1
         ORDER BY completed_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

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
    const weakAreas = await new Promise((resolve, reject) => {
      db.all(
        `SELECT topic, COUNT(*) as count 
         FROM tasks 
         WHERE user_id = ? AND difficulty_rating >= 4
         GROUP BY topic
         ORDER BY count DESC
         LIMIT 5`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get daily completion for last 7 days
    const dailyCompletion = await new Promise((resolve, reject) => {
      db.all(
        `SELECT date(completed_at) as date, COUNT(*) as count
         FROM tasks 
         WHERE user_id = ? AND is_completed = 1
           AND completed_at >= datetime('now', '-7 days')
         GROUP BY date(completed_at)
         ORDER BY date DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

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
  } catch (err) {
    console.error('[Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
