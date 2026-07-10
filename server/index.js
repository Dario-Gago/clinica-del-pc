import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';

dotenv.config();

const aplicacion = express();
const puerto = process.env.PORT || 3001;
const directorioSubidas = process.env.UPLOAD_DIR || 'uploads';

// Crear directorio de subidas si no existe
if (!fs.existsSync(directorioSubidas)) {
  fs.mkdirSync(directorioSubidas, { recursive: true });
  console.log(`Directorio de subidas creado: ${directorioSubidas}`);
}

// Configuración de multer
const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, directorioSubidas);
  },
  filename: (req, file, cb) => {
    // Generar sufijo único: timestamp + nombre original
    const sufijoUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, sufijoUnico + path.extname(file.originalname));
  }
});

const subida = multer({ storage: almacenamiento });

// Multer con almacenamiento en memoria (para exportar Word sin guardar en disco)
const subidaMemoria = multer({ storage: multer.memoryStorage() });

// Middleware
aplicacion.use(cors());
aplicacion.use(express.json({ limit: '50mb' }));
aplicacion.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos desde el directorio de subidas
aplicacion.use('/uploads', express.static(directorioSubidas));

// Conexión a PostgreSQL
const poolConexiones = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'clinica_del_pc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Inicializar tablas de la base de datos
async function inicializarBaseDeDatos() {
  try {
    // Crear tabla students (sin nombre_pc)
    await poolConexiones.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla computers
    await poolConexiones.query(`
      CREATE TABLE IF NOT EXISTS computers (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        nombre_pc VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla steps (con computer_id en lugar de student_id)
    await poolConexiones.query(`
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

    // Crear tabla images
    await poolConexiones.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        step_record_id INTEGER REFERENCES steps(id) ON DELETE CASCADE,
        image_name VARCHAR(255) NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tablas de la base de datos inicializadas correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
}

// Rutas de la API

// Guardar datos completos del estudiante
aplicacion.post('/api/save', subida.array('images', 50), async (req, res) => {
  const cliente = await poolConexiones.connect();
  try {
    await cliente.query('BEGIN');

    const infoUsuario = req.body.userInfo;
    const pasosCompletados = req.body.completedSteps;
    const notasPasos = req.body.stepNotes;
    const infoImagenes = req.body.imagesInfo;
    const archivosSubidos = req.files;

    console.log('Datos recibidos:', { infoUsuario, pasosCompletados, notasPasos, infoImagenes });
    console.log('Archivos subidos:', archivosSubidos?.length || 0);

    // Parsear cadenas JSON
    const infoUsuarioParseada = infoUsuario ? (typeof infoUsuario === 'string' ? JSON.parse(infoUsuario) : infoUsuario) : null;
    const pasosCompletadosParseados = pasosCompletados ? (typeof pasosCompletados === 'string' ? JSON.parse(pasosCompletados) : pasosCompletados) : {};
    const notasPasosParseadas = notasPasos ? (typeof notasPasos === 'string' ? JSON.parse(notasPasos) : notasPasos) : {};
    const infoImagenesParseada = infoImagenes ? (typeof infoImagenes === 'string' ? JSON.parse(infoImagenes) : infoImagenes) : {};

    if (!infoUsuarioParseada) {
      throw new Error('infoUsuario es requerida');
    }

    // Insertar u obtener estudiante
    let resultadoEstudiante;
    const estudianteExistente = await cliente.query(
      'SELECT id FROM students WHERE nombre = $1 AND apellido = $2',
      [infoUsuarioParseada.nombre, infoUsuarioParseada.apellido]
    );

    if (estudianteExistente.rows.length > 0) {
      resultadoEstudiante = estudianteExistente.rows[0];
    } else {
      resultadoEstudiante = await cliente.query(
        'INSERT INTO students (nombre, apellido) VALUES ($1, $2) RETURNING id',
        [infoUsuarioParseada.nombre, infoUsuarioParseada.apellido]
      );
      resultadoEstudiante = resultadoEstudiante.rows[0];
    }

    const idEstudiante = resultadoEstudiante.id;

    // Insertar u obtener computador
    let resultadoComputador;
    const computadorExistente = await cliente.query(
      'SELECT id FROM computers WHERE student_id = $1 AND nombre_pc = $2',
      [idEstudiante, infoUsuarioParseada.nombrePC]
    );

    if (computadorExistente.rows.length > 0) {
      resultadoComputador = computadorExistente.rows[0];
    } else {
      resultadoComputador = await cliente.query(
        'INSERT INTO computers (student_id, nombre_pc) VALUES ($1, $2) RETURNING id',
        [idEstudiante, infoUsuarioParseada.nombrePC]
      );
      resultadoComputador = resultadoComputador.rows[0];
    }

    const idComputador = resultadoComputador.id;

    // Eliminar pasos existentes solo de este computador (no borra otros computadores)
    await cliente.query('DELETE FROM steps WHERE computer_id = $1', [idComputador]);

    // Insertar pasos
    for (const [idPaso, completado] of Object.entries(pasosCompletadosParseados)) {
      const resultadoPaso = await cliente.query(
        `INSERT INTO steps (computer_id, step_id, completed, notes) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [idComputador, parseInt(idPaso), completado, notasPasosParseadas[idPaso] || null]
      );

      const idRegistroPaso = resultadoPaso.rows[0].id;

      // Insertar imágenes para este paso
      if (infoImagenesParseada && infoImagenesParseada[idPaso]) {
        const imagenesPaso = infoImagenesParseada[idPaso];
        for (let i = 0; i < imagenesPaso.length; i++) {
          const infoImagen = imagenesPaso[i];
          const archivoSubido = archivosSubidos.find(f => f.originalname === infoImagen.originalName);
          
          if (archivoSubido) {
            // Cambiar nombre del archivo: nombre_estudiante_apellido_nombrepc_paso.ext
            const nombreEstudiante = `${infoUsuarioParseada.nombre}_${infoUsuarioParseada.apellido}`;
            const nombrePC = infoUsuarioParseada.nombrePC.replace(/[^a-zA-Z0-9]/g, '_');
            const extension = path.extname(archivoSubido.originalname);
            const nuevoNombreArchivo = `${nombreEstudiante}_${nombrePC}_paso${idPaso}${extension}`;
            
            // Renombrar archivo
            const rutaAntigua = archivoSubido.path;
            const rutaNueva = path.join(directorioSubidas, nuevoNombreArchivo);
            fs.renameSync(rutaAntigua, rutaNueva);
            
            await cliente.query(
              'INSERT INTO images (step_record_id, image_name, image_path) VALUES ($1, $2, $3)',
              [idRegistroPaso, nuevoNombreArchivo, rutaNueva]
            );
          }
        }
      }
    }

    await cliente.query('COMMIT');
    res.json({ success: true, message: 'Datos guardados correctamente', idEstudiante, idComputador });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('Error al guardar datos:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    cliente.release();
  }
});

// Obtener datos del estudiante
aplicacion.get('/api/student/:studentId', async (req, res) => {
  try {
    const { studentId: idEstudiante } = req.params;

    // Obtener información del estudiante
    const resultadoEstudiante = await poolConexiones.query('SELECT * FROM students WHERE id = $1', [idEstudiante]);
    
    if (resultadoEstudiante.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });
    }

    // Obtener computadores de este estudiante
    const resultadoComputadores = await poolConexiones.query('SELECT * FROM computers WHERE student_id = $1 ORDER BY created_at DESC', [idEstudiante]);
    
    // Obtener pasos para cada computador
    const computadoresConPasos = await Promise.all(
      resultadoComputadores.rows.map(async (computador) => {
        const resultadoPasos = await poolConexiones.query('SELECT * FROM steps WHERE computer_id = $1', [computador.id]);
        
        // Obtener imágenes para cada paso
        const pasosConImagenes = await Promise.all(
          resultadoPasos.rows.map(async (paso) => {
            const resultadoImagenes = await poolConexiones.query(
              'SELECT * FROM images WHERE step_record_id = $1',
              [paso.id]
            );
            return {
              ...paso,
              images: resultadoImagenes.rows
            };
          })
        );

        return {
          ...computador,
          steps: pasosConImagenes
        };
      })
    );

    res.json({
      success: true,
      student: resultadoEstudiante.rows[0],
      computers: computadoresConPasos
    });
  } catch (error) {
    console.error('Error al obtener datos del estudiante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todos los estudiantes
aplicacion.get('/api/students', async (req, res) => {
  try {
    const resultado = await poolConexiones.query('SELECT * FROM students ORDER BY created_at DESC');
    res.json({ success: true, students: resultado.rows });
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todos los datos (estudiantes con computadores, pasos e imágenes)
aplicacion.get('/api/admin/all-data', async (req, res) => {
  try {
    // Obtener todos los estudiantes
    const resultadoEstudiantes = await poolConexiones.query('SELECT * FROM students ORDER BY created_at DESC');
    
    // Obtener todos los datos para cada estudiante
    const estudiantesConDatosCompletos = await Promise.all(
      resultadoEstudiantes.rows.map(async (estudiante) => {
        // Obtener computadores de este estudiante
        const resultadoComputadores = await poolConexiones.query(
          'SELECT * FROM computers WHERE student_id = $1 ORDER BY created_at DESC',
          [estudiante.id]
        );
        
        // Obtener pasos para cada computador
        const computadoresConPasos = await Promise.all(
          resultadoComputadores.rows.map(async (computador) => {
            const resultadoPasos = await poolConexiones.query(
              'SELECT * FROM steps WHERE computer_id = $1 ORDER BY step_id',
              [computador.id]
            );
            
            // Obtener imágenes para cada paso
            const pasosConImagenes = await Promise.all(
              resultadoPasos.rows.map(async (paso) => {
                const resultadoImagenes = await poolConexiones.query(
                  'SELECT * FROM images WHERE step_record_id = $1 ORDER BY created_at',
                  [paso.id]
                );
                return {
                  ...paso,
                  images: resultadoImagenes.rows
                };
              })
            );

            return {
              ...computador,
              steps: pasosConImagenes
            };
          })
        );

        return {
          ...estudiante,
          computers: computadoresConPasos
        };
      })
    );

    res.json({
      success: true,
      data: estudiantesConDatosCompletos
    });
  } catch (error) {
    console.error('Error al obtener todos los datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar a Excel
aplicacion.get('/api/admin/export-excel', async (req, res) => {
  try {
    // Obtener todos los estudiantes con sus datos
    const resultadoEstudiantes = await poolConexiones.query('SELECT * FROM students ORDER BY created_at DESC');
    
    const estudiantesConDatosCompletos = await Promise.all(
      resultadoEstudiantes.rows.map(async (estudiante) => {
        const resultadoComputadores = await poolConexiones.query(
          'SELECT * FROM computers WHERE student_id = $1 ORDER BY created_at DESC',
          [estudiante.id]
        );
        
        const computadoresConPasos = await Promise.all(
          resultadoComputadores.rows.map(async (computador) => {
            const resultadoPasos = await poolConexiones.query(
              'SELECT * FROM steps WHERE computer_id = $1 ORDER BY step_id',
              [computador.id]
            );
            
            const pasosConImagenes = await Promise.all(
              resultadoPasos.rows.map(async (paso) => {
                const resultadoImagenes = await poolConexiones.query(
                  'SELECT * FROM images WHERE step_record_id = $1 ORDER BY created_at',
                  [paso.id]
                );
                return {
                  ...paso,
                  images: resultadoImagenes.rows
                };
              })
            );

            return {
              ...computador,
              steps: pasosConImagenes
            };
          })
        );

        return {
          ...estudiante,
          computers: computadoresConPasos
        };
      })
    );

    // Crear libro
    const libro = XLSX.utils.book_new();

    // Crear hoja de resumen con todos los estudiantes
    const datosResumen = [
      ['Estudiante', 'Apellido', 'Fecha Registro', 'Total PCs', 'Total Pasos', 'Pasos Completados']
    ];

    estudiantesConDatosCompletos.forEach(estudiante => {
      const totalPasos = estudiante.computers.reduce((acum, computador) => acum + computador.steps.length, 0);
      const pasosCompletados = estudiante.computers.reduce((acum, computador) => 
        acum + computador.steps.filter(paso => paso.completed).length, 0);
      
      datosResumen.push([
        estudiante.nombre,
        estudiante.apellido,
        new Date(estudiante.created_at).toLocaleDateString(),
        estudiante.computers.length,
        totalPasos,
        pasosCompletados
      ]);
    });

    const hojaResumen = XLSX.utils.aoa_to_sheet(datosResumen);
    
    // Ajustar automáticamente anchos de columnas para hoja de resumen
    const anchosColumnas = datosResumen[0].map((_, indiceColumna) => {
      const anchoMaximo = datosResumen.reduce((maximo, fila) => {
        const valorCelda = fila[indiceColumna] ? fila[indiceColumna].toString() : '';
        return Math.max(maximo, valorCelda.length);
      }, 0);
      return { wch: Math.min(anchoMaximo + 2, 50) }; // Limitar ancho máximo a 50
    });
    hojaResumen['!cols'] = anchosColumnas;
    
    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

    // Crear una hoja por cada estudiante con datos detallados
    estudiantesConDatosCompletos.forEach(estudiante => {
      const datosEstudiante = [
        ['Nombre', estudiante.nombre],
        ['Apellido', estudiante.apellido],
        ['Fecha Registro', new Date(estudiante.created_at).toLocaleString()],
        [],
        ['Computadores'],
        ['Nombre PC', 'Fecha Creación', 'Total Pasos', 'Pasos Completados']
      ];

      estudiante.computers.forEach(computador => {
        const cuentaCompletados = computador.steps.filter(paso => paso.completed).length;
        datosEstudiante.push([
          computador.nombre_pc,
          new Date(computador.created_at).toLocaleDateString(),
          computador.steps.length,
          cuentaCompletados
        ]);

        // Agregar pasos para este computador
        datosEstudiante.push([]);
        datosEstudiante.push([`Pasos - ${computador.nombre_pc}`]);
        datosEstudiante.push(['Paso', 'Completado', 'Notas', 'Imágenes']);

        computador.steps.forEach(paso => {
          const nombresImagenes = paso.images.map(imagen => imagen.image_name).join(', ');
          datosEstudiante.push([
            paso.step_id,
            paso.completed ? 'Sí' : 'No',
            paso.notes || '',
            nombresImagenes
          ]);
        });
        datosEstudiante.push([]);
      });

      const hojaEstudiante = XLSX.utils.aoa_to_sheet(datosEstudiante);
      
      // Ajustar automáticamente anchos de columnas para hoja de estudiante
      const anchosColumnasEstudiante = datosEstudiante[0].map((_, indiceColumna) => {
        const anchoMaximo = datosEstudiante.reduce((maximo, fila) => {
          const valorCelda = fila[indiceColumna] ? fila[indiceColumna].toString() : '';
          return Math.max(maximo, valorCelda.length);
        }, 0);
        return { wch: Math.min(anchoMaximo + 2, 50) }; // Limitar ancho máximo a 50
      });
      hojaEstudiante['!cols'] = anchosColumnasEstudiante;
      
      const nombreHoja = `${estudiante.nombre}_${estudiante.apellido}`.substring(0, 31).replace(/[\\/?*[\]]/g, '');
      XLSX.utils.book_append_sheet(libro, hojaEstudiante, nombreHoja);
    });

    // Generar buffer
    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=clinica_del_pc_export.xlsx');
    res.send(buffer);

  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar a Word para el estudiante
aplicacion.post('/api/export-word', subidaMemoria.array('images'), async (req, res) => {
  try {
    const infoUsuario = req.body.userInfo;
    const pasosCompletados = req.body.completedSteps;
    const notasPasos = req.body.stepNotes;
    const infoImagenes = req.body.imagesInfo;
    const pasos = req.body.steps;
    const mapeoImagenes = req.body.imageMapping;
    const archivosSubidos = req.files;
    
    const infoUsuarioParseada = JSON.parse(infoUsuario);
    const pasosCompletadosParseados = JSON.parse(pasosCompletados);
    const notasPasosParseadas = JSON.parse(notasPasos);
    const infoImagenesParseada = JSON.parse(infoImagenes);
    const pasosParseados = JSON.parse(pasos);
    const mapeoImagenesParseado = JSON.parse(mapeoImagenes);

    // Crear arreglo de archivos subidos por índice
    const arregloArchivos = archivosSubidos || [];

    // Función auxiliar para obtener el buffer de imagen por índice
    const obtenerBufferImagen = (indice) => {
      if (arregloArchivos[indice] && arregloArchivos[indice].buffer) {
        return arregloArchivos[indice].buffer;
      }
      return null;
    };

    // Construir elementos del documento
    const elementosDocumento = [
      // Título
      new Paragraph({
        text: "Clínica del PC - Reporte de Mantenimiento",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      
      // Información del estudiante
      new Paragraph({
        text: "Información del Estudiante",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Nombre: ", bold: true }),
          new TextRun(infoUsuarioParseada.nombre)
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Apellido: ", bold: true }),
          new TextRun(infoUsuarioParseada.apellido)
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Computador: ", bold: true }),
          new TextRun(infoUsuarioParseada.nombrePC)
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Fecha: ", bold: true }),
          new TextRun(new Date().toLocaleDateString())
        ]
      }),
      
      // Pasos
      new Paragraph({
        text: "Pasos de Mantenimiento",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    ];

    // Procesar cada paso
    for (const paso of pasosParseados) {
      const estaCompletado = pasosCompletadosParseados[paso.id] || false;
      const notas = notasPasosParseadas[paso.id] || '';
      const imagenes = infoImagenesParseada[paso.id] || [];
      const indicesImagenes = mapeoImagenesParseado[paso.id] || [];

      // Título del paso y estado
      elementosDocumento.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Paso ${paso.id}: ${paso.titulo}`, bold: true, size: 28 }),
            new TextRun({ text: estaCompletado ? " ✓" : " ○", color: estaCompletado ? "008000" : "FF0000", size: 28 })
          ],
          spacing: { before: 300, after: 200 }
        })
      );

      // Instrucciones
      elementosDocumento.push(
        new Paragraph({
          text: "Instrucciones:",
          bold: true,
          spacing: { before: 100 }
        })
      );
      
      paso.instrucciones.forEach(instruccion => {
        elementosDocumento.push(
          new Paragraph({
            text: `• ${instruccion}`,
            bullet: { level: 0 },
            spacing: { left: 720, hanging: 360 }
          })
        );
      });

      // Evidencia requerida
      elementosDocumento.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Evidencia requerida: ", bold: true }),
            new TextRun(paso.evidencia)
          ],
          spacing: { before: 100 }
        })
      );

      // Estado
      elementosDocumento.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Estado: ", bold: true }),
            new TextRun(estaCompletado ? "Completado" : "Pendiente"),
            new TextRun({ text: estaCompletado ? " ✓" : " ○", color: estaCompletado ? "008000" : "FF0000" })
          ],
          spacing: { before: 100 }
        })
      );

      // Notas
      if (notas) {
        elementosDocumento.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Notas: ", bold: true }),
              new TextRun(notas)
            ],
            spacing: { before: 100 }
          })
        );
      }

      // Imágenes
      if (indicesImagenes.length > 0) {
        elementosDocumento.push(
          new Paragraph({
            text: `Imágenes (${indicesImagenes.length}):`,
            bold: true,
            spacing: { before: 100 }
          })
        );

        for (const indice of indicesImagenes) {
          const bufferImagen = obtenerBufferImagen(indice);
          if (bufferImagen) {
            elementosDocumento.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: bufferImagen,
                    transformation: { width: 400, height: 300 }
                  })
                ],
                spacing: { before: 100 }
              })
            );
          } else {
            elementosDocumento.push(
              new Paragraph({
                text: `• Imagen no disponible`,
                italics: true,
                spacing: { before: 100 }
              })
            );
          }
        }
      }

      // Separador
      elementosDocumento.push(
        new Paragraph({
          text: "─".repeat(80),
          spacing: { before: 300, after: 100 }
        })
      );
    }

    // Crear documento
    const documento = new Document({
      sections: [{
        properties: {},
        children: elementosDocumento
      }]
    });

    // Generar buffer
    const buffer = await Packer.toBuffer(documento);

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${infoUsuarioParseada.nombre}_${infoUsuarioParseada.apellido}_${infoUsuarioParseada.nombrePC}.docx`);
    res.send(buffer);

  } catch (error) {
    console.error('Error al exportar a Word:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verificación de salud
aplicacion.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'El servidor está ejecutándose' });
});

// Inicializar base de datos y arrancar servidor
inicializarBaseDeDatos().then(() => {
  aplicacion.listen(puerto, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    const ipsRed = [];
    for (const nombre in interfaces) {
      for (const detalle of interfaces[nombre]) {
        if (detalle.family === 'IPv4' && !detalle.internal) {
          ipsRed.push(detalle.address);
        }
      }
    }
    console.log(`Servidor ejecutándose en http://localhost:${puerto}`);
    if (ipsRed.length === 0) {
      console.log(`Servidor ejecutándose en http://0.0.0.0:${puerto}`);
    } else {
      ipsRed.forEach(ip => {
        console.log(`Servidor ejecutándose en http://${ip}:${puerto}`);
      });
    }
  });
}).catch(error => {
  console.error('Error al iniciar el servidor:', error);
});
