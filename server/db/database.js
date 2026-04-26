const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'studymind.db');
console.log('DB Path:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT,
      start_date TEXT,
      end_date TEXT,
      plan_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER,
      user_id INTEGER,
      day_number INTEGER,
      date TEXT,
      topic TEXT,
      title TEXT,
      estimated_minutes INTEGER,
      difficulty TEXT,
      is_completed INTEGER DEFAULT 0,
      difficulty_rating INTEGER,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      topic TEXT,
      question TEXT,
      answer TEXT,
      times_reviewed INTEGER DEFAULT 0,
      last_reviewed TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role TEXT,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('DB initialized successfully');
});

module.exports = db;
