// Import required packages
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Create Express app
const app = express();
const PORT = 3000;

// Middleware - these help process requests
app.use(cors()); // Allows frontend to connect
app.use(express.json()); // Allows reading JSON data from requests

// Connect to SQLite database (creates database.db if it doesn't exist)
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    createTables();
  }
});

// Create tables if they don't exist
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS diseases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      causes TEXT NOT NULL,
      prevention TEXT NOT NULL,
      when_to_see_doctor TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('✅ Diseases table ready');
      insertSampleData();
    }
  });
}

// Insert sample disease data (only if table is empty)
function insertSampleData() {
  db.get('SELECT COUNT(*) as count FROM diseases', (err, row) => {
    if (row.count === 0) {
      const sampleDiseases = [
        {
          name: 'Diabetes',
          symptoms: 'Increased thirst, frequent urination, extreme hunger, unexplained weight loss, fatigue, blurred vision, slow-healing sores',
          causes: 'Insulin resistance, pancreas not producing enough insulin, genetic factors, obesity, sedentary lifestyle',
          prevention: 'Maintain healthy weight, exercise regularly (30 mins daily), eat balanced diet with less sugar, monitor blood sugar levels, avoid smoking',
          when_to_see_doctor: 'If you experience excessive thirst and urination, unexplained weight loss, or persistent fatigue. Regular checkups if you have family history.'
        },
        {
          name: 'Dengue',
          symptoms: 'High fever, severe headache, pain behind eyes, joint and muscle pain, nausea, vomiting, skin rash, mild bleeding (nose/gums)',
          causes: 'Aedes mosquito bite carrying dengue virus, standing water breeding grounds, tropical climate areas',
          prevention: 'Use mosquito repellent, wear long sleeves, eliminate standing water, use mosquito nets, keep surroundings clean',
          when_to_see_doctor: 'Immediately if you have high fever with severe headache, persistent vomiting, bleeding, difficulty breathing, or severe abdominal pain.'
        },
        {
          name: 'Malaria',
          symptoms: 'High fever with chills, sweating, headache, nausea, vomiting, muscle pain, fatigue, anemia',
          causes: 'Anopheles mosquito bite carrying plasmodium parasite, exposure to infected blood',
          prevention: 'Sleep under mosquito nets, use insect repellent, take antimalarial medication in high-risk areas, eliminate mosquito breeding sites',
          when_to_see_doctor: 'Seek immediate care for high fever after visiting malaria-prone areas, severe headache, confusion, seizures, or difficulty breathing.'
        },
        {
          name: 'Common Cold',
          symptoms: 'Runny nose, sore throat, cough, sneezing, mild headache, slight fever, body aches',
          causes: 'Viral infection (rhinovirus), spread through droplets, weakened immunity, seasonal changes',
          prevention: 'Wash hands frequently, avoid close contact with sick people, boost immunity with vitamin C, stay hydrated, get enough sleep',
          when_to_see_doctor: 'If symptoms last more than 10 days, fever above 101.3°F, difficulty breathing, severe throat pain, or symptoms worsen after improving.'
        },
        {
          name: 'Hypertension',
          symptoms: 'Usually no symptoms (silent killer), sometimes headaches, shortness of breath, nosebleeds in severe cases',
          causes: 'High salt intake, obesity, lack of exercise, stress, smoking, alcohol, genetic factors',
          prevention: 'Reduce salt intake, exercise regularly, maintain healthy weight, manage stress, limit alcohol, quit smoking, monitor blood pressure',
          when_to_see_doctor: 'Regular checkups recommended. Seek immediate care for severe headache, chest pain, vision problems, or difficulty breathing.'
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO diseases (name, symptoms, causes, prevention, when_to_see_doctor)
        VALUES (?, ?, ?, ?, ?)
      `);

      sampleDiseases.forEach(disease => {
        stmt.run(disease.name, disease.symptoms, disease.causes, disease.prevention, disease.when_to_see_doctor);
      });

      stmt.finalize();
      console.log('✅ Sample disease data inserted');
    }
  });
}

// ==================== API ROUTES ====================

// 1. GET all diseases (for admin dashboard)
app.get('/api/diseases', (req, res) => {
  db.all('SELECT * FROM diseases', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ diseases: rows });
    }
  });
});

// 2. GET single disease by ID
app.get('/api/diseases/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM diseases WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Disease not found' });
    } else {
      res.json({ disease: row });
    }
  });
});

// 3. POST - Add new disease (admin only)
app.post('/api/diseases', (req, res) => {
  const { name, symptoms, causes, prevention, when_to_see_doctor } = req.body;
  
  db.run(
    `INSERT INTO diseases (name, symptoms, causes, prevention, when_to_see_doctor)
     VALUES (?, ?, ?, ?, ?)`,
    [name, symptoms, causes, prevention, when_to_see_doctor],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Disease added successfully', id: this.lastID });
      }
    }
  );
});

// 4. PUT - Update disease (admin only)
app.put('/api/diseases/:id', (req, res) => {
  const id = req.params.id;
  const { name, symptoms, causes, prevention, when_to_see_doctor } = req.body;
  
  db.run(
    `UPDATE diseases 
     SET name = ?, symptoms = ?, causes = ?, prevention = ?, when_to_see_doctor = ?
     WHERE id = ?`,
    [name, symptoms, causes, prevention, when_to_see_doctor, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Disease not found' });
      } else {
        res.json({ message: 'Disease updated successfully' });
      }
    }
  );
});

// 5. DELETE - Remove disease (admin only)
app.delete('/api/diseases/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM diseases WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Disease not found' });
    } else {
      res.json({ message: 'Disease deleted successfully' });
    }
  });
});

// 6. POST - Chatbot query (searches diseases by keyword)
app.post('/api/chatbot', (req, res) => {
  const { message } = req.body;
  const searchTerm = message.toLowerCase();

  // Search for diseases matching the user's message
  db.all(
    `SELECT * FROM diseases WHERE 
     LOWER(name) LIKE ? OR 
     LOWER(symptoms) LIKE ? OR 
     LOWER(causes) LIKE ?`,
    [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (rows.length === 0) {
        res.json({
          reply: "I'm sorry, I couldn't find information about that. Please try asking about common diseases like diabetes, dengue, malaria, common cold, or hypertension. You can also ask about symptoms, causes, or prevention."
        });
      } else {
        // Format response based on what user asked
        let reply = formatChatbotResponse(rows[0], searchTerm);
        res.json({ reply, disease: rows[0] });
      }
    }
  );
});

// Helper function to format chatbot responses
function formatChatbotResponse(disease, query) {
  let response = `**${disease.name}**\n\n`;
  
  if (query.includes('symptom')) {
    response += `**Symptoms:**\n${disease.symptoms}\n\n`;
  } else if (query.includes('cause')) {
    response += `**Causes:**\n${disease.causes}\n\n`;
  } else if (query.includes('prevent') || query.includes('avoid')) {
    response += `**Prevention:**\n${disease.prevention}\n\n`;
  } else if (query.includes('doctor') || query.includes('hospital')) {
    response += `**When to see a doctor:**\n${disease.when_to_see_doctor}\n\n`;
  } else {
    // Give complete information if no specific query
    response += `**Symptoms:**\n${disease.symptoms}\n\n`;
    response += `**Causes:**\n${disease.causes}\n\n`;
    response += `**Prevention:**\n${disease.prevention}\n\n`;
    response += `**When to see a doctor:**\n${disease.when_to_see_doctor}`;
  }
  
  return response;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});