const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'studymind.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('=== Database Check ===');
  
  db.all('SELECT id, user_id FROM study_plans', (err, plans) => {
    if (err) {
      console.error('Plans query error:', err);
    } else {
      console.log('Plans:', plans);
    }
  });
  
  db.all('SELECT id, name, email FROM users', (err, users) => {
    if (err) {
      console.error('Users query error:', err);
    } else {
      console.log('Users:', users);
    }
    
    db.close();
  });
});
