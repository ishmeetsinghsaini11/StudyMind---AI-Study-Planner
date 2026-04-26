const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const db = require('./db/database')

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const planRoutes = require('./routes/plan')
const progressRoutes = require('./routes/progress')
const chatRoutes = require('./routes/chat')
const flashcardRoutes = require('./routes/flashcards')
const uploadRoutes = require('./routes/upload')

app.use('/api/plan', planRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/flashcards', flashcardRoutes)
app.use('/api/upload', uploadRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Dashboard data aggregation
app.get('/api/dashboard/:userId', (req, res) => {
  const { userId } = req.params
  console.log('Fetching dashboard for userId:', userId)
  
  // Get latest study plan
  db.get(
    'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId],
    (err, plan) => {
      if (err) {
        console.error('Error fetching plan:', err.message)
        return res.status(500).json({ error: err.message })
      }
      
      if (!plan) {
        console.log('No plan found for userId:', userId)
        return res.json({ hasPlan: false })
      }
      
      // Get tasks for this plan
      db.all(
        'SELECT * FROM tasks WHERE plan_id = ?',
        [plan.id],
        (err, tasks) => {
          if (err) {
            console.error('Error fetching tasks:', err.message)
            return res.status(500).json({ error: err.message })
          }
          
          // Calculate stats
          const totalTasks = tasks.length
          const completedTasks = tasks.filter(t => t.is_completed).length
          const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          
          // Get today's tasks
          const today = new Date().toISOString().split('T')[0]
          const todayTasks = tasks.filter(t => t.date === today)
          
          // Get flashcard count
          db.all(
            'SELECT COUNT(*) as count FROM flashcards WHERE user_id = ?',
            [userId],
            (err, flashcardResult) => {
              if (err) {
                console.error('Error fetching flashcards:', err.message)
                return res.status(500).json({ error: err.message })
              }
              
              const flashcardCount = flashcardResult[0].count
              
              res.json({
                hasPlan: true,
                plan: JSON.parse(plan.plan_json),
                stats: {
                  totalTasks,
                  completedTasks,
                  completionPercent,
                  streak: 1, // TODO: calculate actual streak
                  flashcardCount
                },
                todayTasks
              })
            }
          )
        }
      )
    }
  )
})

// Guest user creation
app.post('/api/guest', (req, res) => {
  const { name } = req.body
  console.log('=== GUEST CREATION START ===')
  console.log('Request body:', req.body)
  console.log('Name:', name)
  
  if (!name) {
    console.log('Name is missing, returning 400')
    return res.status(400).json({ error: 'Name is required' })
  }
  
  console.log('About to insert into database...')
  
  db.run(
    'INSERT INTO users (name) VALUES (?)',
    [name.trim()],
    function(err) {
      console.log('=== DB RUN CALLBACK FIRED ===')
      console.log('Error:', err)
      console.log('this.lastID:', this.lastID)
      
      if (err) {
        console.error('Guest creation error:', err.message)
        return res.status(500).json({ error: err.message })
      }
      
      if (!this.lastID) {
        console.error('No lastID returned')
        return res.status(500).json({ error: 'Failed to create guest' })
      }
      
      const response = { userId: this.lastID, name: name.trim() }
      console.log('Sending response:', response)
      res.json(response)
      console.log('Response sent')
    }
  )
  
  console.log('DB.run called (callback pending)')
})

// Get all guests
app.get('/api/guests', (req, res) => {
  db.all(
    'SELECT id, name, created_at FROM users ORDER BY id ASC',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: err.message })
      }
      res.json({ users })
    }
  )
})

// Update guest profile
app.put('/api/guest/profile/:userId', (req, res) => {
  const { userId } = req.params
  const { learning_style, knowledge_level, daily_hours, energy_pattern, goal } = req.body
  console.log('Updating profile for userId:', userId)
  
  // First check if users table has these columns, if not alter table
  const alterColumns = [
    'ALTER TABLE users ADD COLUMN learning_style TEXT',
    'ALTER TABLE users ADD COLUMN knowledge_level TEXT',
    'ALTER TABLE users ADD COLUMN daily_hours INTEGER',
    'ALTER TABLE users ADD COLUMN energy_pattern TEXT',
    'ALTER TABLE users ADD COLUMN goal TEXT'
  ]
  
  let alterIndex = 0
  const alterNext = () => {
    if (alterIndex < alterColumns.length) {
      db.run(alterColumns[alterIndex], (err) => {
        alterIndex++
        alterNext() // Continue even if column exists
      })
    } else {
      // After all alter attempts, do the update
      db.run(
        `UPDATE users SET
          learning_style = ?,
          knowledge_level = ?,
          daily_hours = ?,
          energy_pattern = ?,
          goal = ?
        WHERE id = ?`,
        [learning_style, knowledge_level, daily_hours, energy_pattern, goal, userId],
        (err) => {
          if (err) {
            console.error('Profile update error:', err.message)
            return res.status(500).json({ error: err.message })
          }
          res.json({ success: true })
        }
      )
    }
  }
  
  alterNext()
})

// Delete guest
app.delete('/api/guest/:userId', (req, res) => {
  const { userId } = req.params
  console.log('=== DELETE GUEST START ===')
  console.log('userId:', userId)
  
  const deleteSteps = [
    {
      name: 'chat_history',
      sql: 'DELETE FROM chat_history WHERE user_id = ?'
    },
    {
      name: 'flashcards',
      sql: 'DELETE FROM flashcards WHERE user_id = ?'
    },
    {
      name: 'tasks',
      sql: 'DELETE FROM tasks WHERE user_id = ?'
    },
    {
      name: 'study_plans',
      sql: 'DELETE FROM study_plans WHERE user_id = ?'
    },
    {
      name: 'users',
      sql: 'DELETE FROM users WHERE id = ?'
    }
  ]
  
  let stepIndex = 0
  const runNextStep = () => {
    if (stepIndex < deleteSteps.length) {
      const step = deleteSteps[stepIndex]
      console.log(`Running delete step ${stepIndex + 1}: ${step.name}`)
      
      db.run(step.sql, [userId], (err) => {
        if (err) {
          console.error(`Delete ${step.name} error:`, err.message)
          return res.status(500).json({ error: `Failed to delete ${step.name}: ${err.message}` })
        }
        console.log(`✓ ${step.name} deleted`)
        stepIndex++
        runNextStep()
      })
    } else {
      console.log('✓ All data deleted successfully')
      res.json({ success: true })
    }
  }
  
  runNextStep()
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log('Server running on port', PORT)
})
