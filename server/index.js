import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const uploadDir = process.env.UPLOAD_DIR || 'uploads';

// Crear directorio de uploads si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Directorio de uploads creado: ${uploadDir}`);
}

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp + nombre original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Multer con almacenamiento en memoria (para exportar Word sin guardar en disco)
const uploadMemory = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos desde el directorio de uploads
app.use('/uploads', express.static(uploadDir));

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
    // Create students table (sin nombre_pc)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create computers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS computers (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        nombre_pc VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create steps table (con computer_id en lugar de student_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS steps (
        id SERIAL PRIMARY KEY,
        computer_id INTEGER REFERENCES computers(id) ON DELETE CASCADE,
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
        image_path VARCHAR(500) NOT NULL,
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
app.post('/api/save', upload.array('images', 50), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { userInfo, completedSteps, stepNotes, imagesInfo } = req.body;
    const uploadedFiles = req.files;

    console.log('Received data:', { userInfo, completedSteps, stepNotes, imagesInfo });
    console.log('Uploaded files:', uploadedFiles?.length || 0);

    // Parse JSON strings
    const parsedUserInfo = userInfo ? (typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo) : null;
    const parsedCompletedSteps = completedSteps ? (typeof completedSteps === 'string' ? JSON.parse(completedSteps) : completedSteps) : {};
    const parsedStepNotes = stepNotes ? (typeof stepNotes === 'string' ? JSON.parse(stepNotes) : stepNotes) : {};
    const parsedImagesInfo = imagesInfo ? (typeof imagesInfo === 'string' ? JSON.parse(imagesInfo) : imagesInfo) : {};

    if (!parsedUserInfo) {
      throw new Error('userInfo is required');
    }

    // Insert or get student
    let studentResult;
    const existingStudent = await client.query(
      'SELECT id FROM students WHERE nombre = $1 AND apellido = $2',
      [parsedUserInfo.nombre, parsedUserInfo.apellido]
    );

    if (existingStudent.rows.length > 0) {
      studentResult = existingStudent.rows[0];
    } else {
      studentResult = await client.query(
        'INSERT INTO students (nombre, apellido) VALUES ($1, $2) RETURNING id',
        [parsedUserInfo.nombre, parsedUserInfo.apellido]
      );
      studentResult = studentResult.rows[0];
    }

    const studentId = studentResult.id;

    // Insert or get computer
    let computerResult;
    const existingComputer = await client.query(
      'SELECT id FROM computers WHERE student_id = $1 AND nombre_pc = $2',
      [studentId, parsedUserInfo.nombrePC]
    );

    if (existingComputer.rows.length > 0) {
      computerResult = existingComputer.rows[0];
    } else {
      computerResult = await client.query(
        'INSERT INTO computers (student_id, nombre_pc) VALUES ($1, $2) RETURNING id',
        [studentId, parsedUserInfo.nombrePC]
      );
      computerResult = computerResult.rows[0];
    }

    const computerId = computerResult.id;

    // Delete existing steps for this computer only (no borra otros computadores)
    await client.query('DELETE FROM steps WHERE computer_id = $1', [computerId]);

    // Insert steps
    for (const [stepId, completed] of Object.entries(parsedCompletedSteps)) {
      const stepResult = await client.query(
        `INSERT INTO steps (computer_id, step_id, completed, notes) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [computerId, parseInt(stepId), completed, parsedStepNotes[stepId] || null]
      );

      const stepRecordId = stepResult.rows[0].id;

      // Insert images for this step
      if (parsedImagesInfo && parsedImagesInfo[stepId]) {
        const stepImages = parsedImagesInfo[stepId];
        for (let i = 0; i < stepImages.length; i++) {
          const imageInfo = stepImages[i];
          const uploadedFile = uploadedFiles.find(f => f.originalname === imageInfo.originalName);
          
          if (uploadedFile) {
            // Cambiar nombre del archivo: nombre_estudiante_apellido_nombrepc_paso_timestamp.ext
            const studentName = `${parsedUserInfo.nombre}_${parsedUserInfo.apellido}`;
            const pcName = parsedUserInfo.nombrePC.replace(/[^a-zA-Z0-9]/g, '_');
            const timestamp = Date.now();
            const ext = path.extname(uploadedFile.originalname);
            const newFileName = `${studentName}_${pcName}_paso${stepId}_${timestamp}${ext}`;
            
            // Renombrar archivo
            const oldPath = uploadedFile.path;
            const newPath = path.join(uploadDir, newFileName);
            fs.renameSync(oldPath, newPath);
            
            await client.query(
              'INSERT INTO images (step_record_id, image_name, image_path) VALUES ($1, $2, $3)',
              [stepRecordId, newFileName, newPath]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Data saved successfully', studentId, computerId });
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

    // Get computers for this student
    const computersResult = await pool.query('SELECT * FROM computers WHERE student_id = $1 ORDER BY created_at DESC', [studentId]);
    
    // Get steps for each computer
    const computersWithSteps = await Promise.all(
      computersResult.rows.map(async (computer) => {
        const stepsResult = await pool.query('SELECT * FROM steps WHERE computer_id = $1', [computer.id]);
        
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

        return {
          ...computer,
          steps: stepsWithImages
        };
      })
    );

    res.json({
      success: true,
      student: studentResult.rows[0],
      computers: computersWithSteps
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

// Get all data (students with computers, steps and images)
app.get('/api/admin/all-data', async (req, res) => {
  try {
    // Get all students
    const studentsResult = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
    
    // Get all data for each student
    const studentsWithFullData = await Promise.all(
      studentsResult.rows.map(async (student) => {
        // Get computers for this student
        const computersResult = await pool.query(
          'SELECT * FROM computers WHERE student_id = $1 ORDER BY created_at DESC',
          [student.id]
        );
        
        // Get steps for each computer
        const computersWithSteps = await Promise.all(
          computersResult.rows.map(async (computer) => {
            const stepsResult = await pool.query(
              'SELECT * FROM steps WHERE computer_id = $1 ORDER BY step_id',
              [computer.id]
            );
            
            // Get images for each step
            const stepsWithImages = await Promise.all(
              stepsResult.rows.map(async (step) => {
                const imagesResult = await pool.query(
                  'SELECT * FROM images WHERE step_record_id = $1 ORDER BY created_at',
                  [step.id]
                );
                return {
                  ...step,
                  images: imagesResult.rows
                };
              })
            );

            return {
              ...computer,
              steps: stepsWithImages
            };
          })
        );

        return {
          ...student,
          computers: computersWithSteps
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithFullData
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export to Excel
app.get('/api/admin/export-excel', async (req, res) => {
  try {
    // Get all students with their data
    const studentsResult = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
    
    const studentsWithFullData = await Promise.all(
      studentsResult.rows.map(async (student) => {
        const computersResult = await pool.query(
          'SELECT * FROM computers WHERE student_id = $1 ORDER BY created_at DESC',
          [student.id]
        );
        
        const computersWithSteps = await Promise.all(
          computersResult.rows.map(async (computer) => {
            const stepsResult = await pool.query(
              'SELECT * FROM steps WHERE computer_id = $1 ORDER BY step_id',
              [computer.id]
            );
            
            const stepsWithImages = await Promise.all(
              stepsResult.rows.map(async (step) => {
                const imagesResult = await pool.query(
                  'SELECT * FROM images WHERE step_record_id = $1 ORDER BY created_at',
                  [step.id]
                );
                return {
                  ...step,
                  images: imagesResult.rows
                };
              })
            );

            return {
              ...computer,
              steps: stepsWithImages
            };
          })
        );

        return {
          ...student,
          computers: computersWithSteps
        };
      })
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create a summary sheet with all students
    const summaryData = [
      ['Estudiante', 'Apellido', 'Fecha Registro', 'Total PCs', 'Total Pasos', 'Pasos Completados']
    ];

    studentsWithFullData.forEach(student => {
      const totalSteps = student.computers.reduce((acc, comp) => acc + comp.steps.length, 0);
      const completedSteps = student.computers.reduce((acc, comp) => 
        acc + comp.steps.filter(s => s.completed).length, 0);
      
      summaryData.push([
        student.nombre,
        student.apellido,
        new Date(student.created_at).toLocaleDateString(),
        student.computers.length,
        totalSteps,
        completedSteps
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Auto-fit column widths for summary sheet
    const colWidths = summaryData[0].map((_, colIndex) => {
      const maxWidth = summaryData.reduce((max, row) => {
        const cellValue = row[colIndex] ? row[colIndex].toString() : '';
        return Math.max(max, cellValue.length);
      }, 0);
      return { wch: Math.min(maxWidth + 2, 50) }; // Limit max width to 50
    });
    summarySheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Create a sheet for each student with detailed data
    studentsWithFullData.forEach(student => {
      const studentData = [
        ['Nombre', student.nombre],
        ['Apellido', student.apellido],
        ['Fecha Registro', new Date(student.created_at).toLocaleString()],
        [],
        ['Computadores'],
        ['Nombre PC', 'Fecha Creación', 'Total Pasos', 'Pasos Completados']
      ];

      student.computers.forEach(computer => {
        const completedCount = computer.steps.filter(s => s.completed).length;
        studentData.push([
          computer.nombre_pc,
          new Date(computer.created_at).toLocaleDateString(),
          computer.steps.length,
          completedCount
        ]);

        // Add steps for this computer
        studentData.push([]);
        studentData.push([`Pasos - ${computer.nombre_pc}`]);
        studentData.push(['Paso', 'Completado', 'Notas', 'Imágenes']);

        computer.steps.forEach(step => {
          const imageNames = step.images.map(img => img.image_name).join(', ');
          studentData.push([
            step.step_id,
            step.completed ? 'Sí' : 'No',
            step.notes || '',
            imageNames
          ]);
        });
        studentData.push([]);
      });

      const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
      
      // Auto-fit column widths for student sheet
      const studentColWidths = studentData[0].map((_, colIndex) => {
        const maxWidth = studentData.reduce((max, row) => {
          const cellValue = row[colIndex] ? row[colIndex].toString() : '';
          return Math.max(max, cellValue.length);
        }, 0);
        return { wch: Math.min(maxWidth + 2, 50) }; // Limit max width to 50
      });
      studentSheet['!cols'] = studentColWidths;
      
      const sheetName = `${student.nombre}_${student.apellido}`.substring(0, 31).replace(/[\\/?*[\]]/g, '');
      XLSX.utils.book_append_sheet(workbook, studentSheet, sheetName);
    });

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=clinica_del_pc_export.xlsx');
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export to Word for student
app.post('/api/export-word', uploadMemory.array('images'), async (req, res) => {
  try {
    const userInfo = req.body.userInfo;
    const completedSteps = req.body.completedSteps;
    const stepNotes = req.body.stepNotes;
    const imagesInfo = req.body.imagesInfo;
    const steps = req.body.steps;
    const imageMapping = req.body.imageMapping;
    const uploadedFiles = req.files;
    
    const parsedUserInfo = JSON.parse(userInfo);
    const parsedCompletedSteps = JSON.parse(completedSteps);
    const parsedStepNotes = JSON.parse(stepNotes);
    const parsedImagesInfo = JSON.parse(imagesInfo);
    const parsedSteps = JSON.parse(steps);
    const parsedImageMapping = JSON.parse(imageMapping);

    // Create array of uploaded files by index
    const fileArray = uploadedFiles || [];

    // Helper function to get image buffer by index
    const getImageBuffer = (index) => {
      if (fileArray[index] && fileArray[index].buffer) {
        return fileArray[index].buffer;
      }
      return null;
    };

    // Build document children
    const documentChildren = [
      // Title
      new Paragraph({
        text: "Clínica del PC - Reporte de Mantenimiento",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      
      // Student Info
      new Paragraph({
        text: "Información del Estudiante",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Nombre: ", bold: true }),
          new TextRun(parsedUserInfo.nombre)
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Apellido: ", bold: true }),
          new TextRun(parsedUserInfo.apellido)
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Computador: ", bold: true }),
          new TextRun(parsedUserInfo.nombrePC)
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Fecha: ", bold: true }),
          new TextRun(new Date().toLocaleDateString())
        ]
      }),
      
      // Steps
      new Paragraph({
        text: "Pasos de Mantenimiento",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    ];

    // Process each step
    for (const step of parsedSteps) {
      const isCompleted = parsedCompletedSteps[step.id] || false;
      const notes = parsedStepNotes[step.id] || '';
      const images = parsedImagesInfo[step.id] || [];
      const imageIndices = parsedImageMapping[step.id] || [];

      // Step title and status
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Paso ${step.id}: ${step.title}`, bold: true, size: 28 }),
            new TextRun({ text: isCompleted ? " ✓" : " ○", color: isCompleted ? "008000" : "FF0000", size: 28 })
          ],
          spacing: { before: 300, after: 200 }
        })
      );

      // Instructions
      documentChildren.push(
        new Paragraph({
          text: "Instrucciones:",
          bold: true,
          spacing: { before: 100 }
        })
      );
      
      step.instructions.forEach(instruction => {
        documentChildren.push(
          new Paragraph({
            text: `• ${instruction}`,
            bullet: { level: 0 },
            spacing: { left: 720, hanging: 360 }
          })
        );
      });

      // Evidence required
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Evidencia requerida: ", bold: true }),
            new TextRun(step.evidence)
          ],
          spacing: { before: 100 }
        })
      );

      // Status
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Estado: ", bold: true }),
            new TextRun(isCompleted ? "Completado" : "Pendiente"),
            new TextRun({ text: isCompleted ? " ✓" : " ○", color: isCompleted ? "008000" : "FF0000" })
          ],
          spacing: { before: 100 }
        })
      );

      // Notes
      if (notes) {
        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Notas: ", bold: true }),
              new TextRun(notes)
            ],
            spacing: { before: 100 }
          })
        );
      }

      // Images
      if (imageIndices.length > 0) {
        documentChildren.push(
          new Paragraph({
            text: `Imágenes (${imageIndices.length}):`,
            bold: true,
            spacing: { before: 100 }
          })
        );

        for (const index of imageIndices) {
          const imageBuffer = getImageBuffer(index);
          if (imageBuffer) {
            documentChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: { width: 400, height: 300 }
                  })
                ],
                spacing: { before: 100 }
              })
            );
          } else {
            documentChildren.push(
              new Paragraph({
                text: `• Imagen no disponible`,
                italics: true,
                spacing: { before: 100 }
              })
            );
          }
        }
      }

      // Separator
      documentChildren.push(
        new Paragraph({
          text: "─".repeat(80),
          spacing: { before: 300, after: 100 }
        })
      );
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: documentChildren
      }]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${parsedUserInfo.nombre}_${parsedUserInfo.apellido}_${parsedUserInfo.nombrePC}.docx`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting to Word:', error);
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
