import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'clinica_del_pc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Initialize database tables
async function initDB() {
  try {
    // Create students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        nombre_pc VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create steps table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS steps (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        step_id INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        step_record_id INTEGER REFERENCES steps(id) ON DELETE CASCADE,
        image_name VARCHAR(255) NOT NULL,
        image_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// API Routes

// Save complete student data
app.post('/api/save', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { userInfo, completedSteps, stepNotes, stepImages } = req.body;

    // Insert or update student
    let studentResult;
    const existingStudent = await client.query(
      'SELECT id FROM students WHERE nombre = $1 AND apellido = $2 AND nombre_pc = $3',
      [userInfo.nombre, userInfo.apellido, userInfo.nombrePC]
    );

    if (existingStudent.rows.length > 0) {
      studentResult = existingStudent.rows[0];
    } else {
      studentResult = await client.query(
        'INSERT INTO students (nombre, apellido, nombre_pc) VALUES ($1, $2, $3) RETURNING id',
        [userInfo.nombre, userInfo.apellido, userInfo.nombrePC]
      );
      studentResult = studentResult.rows[0];
    }

    const studentId = studentResult.id;

    // Delete existing steps for this student
    await client.query('DELETE FROM steps WHERE student_id = $1', [studentId]);

    // Insert steps
    for (const [stepId, completed] of Object.entries(completedSteps)) {
      const stepResult = await client.query(
        `INSERT INTO steps (student_id, step_id, completed, notes) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [studentId, parseInt(stepId), completed, stepNotes[stepId] || null]
      );

      const stepRecordId = stepResult.rows[0].id;

      // Insert images for this step
      if (stepImages[stepId] && stepImages[stepId].length > 0) {
        for (const image of stepImages[stepId]) {
          const imageData = image.data || image.url;
          await client.query(
            'INSERT INTO images (step_record_id, image_name, image_data) VALUES ($1, $2, $3)',
            [stepRecordId, image.name, imageData]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Data saved successfully', studentId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get student data
app.get('/api/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student info
    const studentResult = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Get steps
    const stepsResult = await pool.query('SELECT * FROM steps WHERE student_id = $1', [studentId]);
    
    // Get images for each step
    const stepsWithImages = await Promise.all(
      stepsResult.rows.map(async (step) => {
        const imagesResult = await pool.query(
          'SELECT * FROM images WHERE step_record_id = $1',
          [step.id]
        );
        return {
          ...step,
          images: imagesResult.rows
        };
      })
    );

    res.json({
      success: true,
      student: studentResult.rows[0],
      steps: stepsWithImages
    });
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
    res.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Initialize database and start server
initDB().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`Server running on http://localhost:${port}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
});
