import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { pasos } from './pasos'
import { obtenerUrlServidor } from './configuracion'

// --- IndexedDB helpers para persistir imágenes en el navegador ---
const NOMBRE_DB = 'clinicaDelPC_imagenes'
const VERSION_DB = 1
const NOMBRE_ALMACEN = 'imagenes'

const abrirDB = () => {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB)
    solicitud.onupgradeneeded = (evento) => {
      const db = evento.target.result
      if (!db.objectStoreNames.contains(NOMBRE_ALMACEN)) {
        db.createObjectStore(NOMBRE_ALMACEN, { keyPath: 'nombre' })
      }
    }
    solicitud.onsuccess = (evento) => resolve(evento.target.result)
    solicitud.onerror = (evento) => reject(evento.target.error)
  })
}

const guardarImagenDB = async (imagen) => {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(NOMBRE_ALMACEN, 'readwrite')
    const almacen = transaccion.objectStore(NOMBRE_ALMACEN)
    const solicitud = almacen.put(imagen)
    solicitud.onsuccess = () => resolve()
    solicitud.onerror = (evento) => reject(evento.target.error)
  })
}

const obtenerImagenesDB = async () => {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(NOMBRE_ALMACEN, 'readonly')
    const almacen = transaccion.objectStore(NOMBRE_ALMACEN)
    const solicitud = almacen.getAll()
    solicitud.onsuccess = () => resolve(solicitud.result)
    solicitud.onerror = (evento) => reject(evento.target.error)
  })
}

const eliminarImagenDB = async (nombre) => {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(NOMBRE_ALMACEN, 'readwrite')
    const almacen = transaccion.objectStore(NOMBRE_ALMACEN)
    const solicitud = almacen.delete(nombre)
    solicitud.onsuccess = () => resolve()
    solicitud.onerror = (evento) => reject(evento.target.error)
  })
}

const limpiarImagenesDB = async () => {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(NOMBRE_ALMACEN, 'readwrite')
    const almacen = transaccion.objectStore(NOMBRE_ALMACEN)
    const solicitud = almacen.clear()
    solicitud.onsuccess = () => resolve()
    solicitud.onerror = (evento) => reject(evento.target.error)
  })
}

function App() {
  const [pasosCompletados, setPasosCompletados] = useState({})
  const [pasoActual, setPasoActual] = useState(1)
  const [infoUsuario, setInfoUsuario] = useState({
    nombre: '',
    apellido: '',
    nombrePC: ''
  })
  const [mostrarFormulario, setMostrarFormulario] = useState(true)
  const [notasPasos, setNotasPasos] = useState({})
  const [imagenesPasos, setImagenesPasos] = useState({})
  const [archivosImagen, setArchivosImagen] = useState({})
  const [conectado, setConectado] = useState(true)

  // Cargar datos desde localStorage y de IndexedDB al montar
  useEffect(() => {
    const cargarDatos = async () => {
      const datosGuardados = localStorage.getItem('clinicaDelPC')
      console.log('Datos en localStorage:', datosGuardados)
      if (datosGuardados) {
        try {
          const parseado = JSON.parse(datosGuardados)
          console.log('Datos parseados:', parseado)
          if (parseado.userInfo) {
            console.log('Configurando infoUsuario:', parseado.userInfo)
            setInfoUsuario(parseado.userInfo)
            // No ocultamos el formulario, solo autocompletamos los campos
          }
          if (parseado.showForm !== undefined) setMostrarFormulario(parseado.showForm)
          if (parseado.completedSteps) setPasosCompletados(parseado.completedSteps)
          if (parseado.stepNotes) setNotasPasos(parseado.stepNotes)
        } catch (error) {
          console.error('Error al cargar datos:', error)
        }
      }

      try {
        const imagenes = await obtenerImagenesDB()
        const imagenesPorPaso = {}
        const archivosPorPaso = {}
        imagenes.forEach(img => {
          const url = URL.createObjectURL(img.blob)
          if (!imagenesPorPaso[img.idPaso]) imagenesPorPaso[img.idPaso] = []
          imagenesPorPaso[img.idPaso].push({
            nombre: img.nombre,
            nombreOriginal: img.nombreOriginal,
            url
          })
          if (!archivosPorPaso[img.idPaso]) archivosPorPaso[img.idPaso] = []
          archivosPorPaso[img.idPaso].push({
            archivo: img.blob,
            nombre: img.nombre
          })
        })
        setImagenesPasos(imagenesPorPaso)
        setArchivosImagen(archivosPorPaso)
      } catch (error) {
        console.error('Error al cargar imágenes:', error)
      }
    }

    cargarDatos()
  }, [])

  // Verificar conectividad con el backend
  useEffect(() => {
    const verificarConexion = async () => {
      try {
        const respuesta = await fetch(`${obtenerUrlServidor()}/api/health`, { method: 'GET' })
        setConectado(respuesta.ok)
      } catch (error) {
        setConectado(false)
      }
    }
    verificarConexion()
    const intervalo = setInterval(verificarConexion, 10000)
    return () => clearInterval(intervalo)
  }, [])

  // Solicitar almacenamiento persistente para que las imágenes no se borren
  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {
        console.warn('No se pudo solicitar almacenamiento persistente')
      })
    }
  }, [])

  // Guardar datos en localStorage cuando cambien (sin imágenes)
  useEffect(() => {
    // No guardar si infoUsuario está vacío (estado inicial)
    if (!infoUsuario.nombre && !infoUsuario.apellido && !infoUsuario.nombrePC) {
      return
    }
    
    const datosGuardar = {
      userInfo: infoUsuario,
      showForm: mostrarFormulario,
      completedSteps: pasosCompletados,
      stepNotes: notasPasos
      // No guardamos imágenes en localStorage
    }
    try {
      localStorage.setItem('clinicaDelPC', JSON.stringify(datosGuardar))
    } catch (error) {
      console.error('Error al guardar datos:', error)
    }
  }, [infoUsuario, mostrarFormulario, pasosCompletados, notasPasos])

  const alternarPaso = (idPaso) => {
    setPasosCompletados(prev => ({
      ...prev,
      [idPaso]: !prev[idPaso]
    }))
  }

  const manejarCambioNota = (idPaso, nota) => {
    setNotasPasos(prev => ({
      ...prev,
      [idPaso]: nota
    }))
  }

  const manejarSubidaImagen = async (idPaso, e) => {
    const archivos = e.target.files
    if (archivos && archivos.length > 0) {
      const timestamp = Date.now()
      
      const nuevasImagenes = Array.from(archivos).map((archivo, indice) => {
        // Generar un nombre único para evitar colisiones entre pasos y archivos
        const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9.]/g, '_')
        const nombreUnico = `${timestamp}_${idPaso}_${indice}_${nombreSeguro}`
        
        return {
          idPaso,
          nombre: nombreUnico,
          nombreOriginal: archivo.name,
          url: URL.createObjectURL(archivo),
          archivo: archivo
        }
      })

      // Guardar imágenes en IndexedDB para que no se pierdan al recargar
      try {
        await Promise.all(
          nuevasImagenes.map(img =>
            guardarImagenDB({
              idPaso: img.idPaso,
              nombre: img.nombre,
              nombreOriginal: img.nombreOriginal,
              blob: img.archivo
            })
          )
        )
      } catch (error) {
        console.error('Error al guardar imagen en IndexedDB:', error)
      }
      
      setImagenesPasos(prev => ({
        ...prev,
        [idPaso]: [...(prev[idPaso] || []), ...nuevasImagenes.map(img => ({
          nombre: img.nombre,
          nombreOriginal: img.nombreOriginal,
          url: img.url
        }))]
      }))
      
      setArchivosImagen(prev => ({
        ...prev,
        [idPaso]: [...(prev[idPaso] || []), ...nuevasImagenes.map(img => ({
          archivo: img.archivo,
          nombre: img.nombre
        }))]
      }))
    }
  }

  const eliminarImagen = (idPaso, indice) => {
    const imagen = imagenesPasos[idPaso]?.[indice]
    if (imagen?.url) URL.revokeObjectURL(imagen.url)

    if (imagen?.nombre) {
      eliminarImagenDB(imagen.nombre).catch(error => {
        console.error('Error al eliminar imagen de IndexedDB:', error)
      })
    }

    setImagenesPasos(prev => ({
      ...prev,
      [idPaso]: prev[idPaso].filter((_, i) => i !== indice)
    }))
    setArchivosImagen(prev => ({
      ...prev,
      [idPaso]: prev[idPaso].filter((_, i) => i !== indice)
    }))
  }

  const cuentaCompletados = Object.values(pasosCompletados).filter(Boolean).length
  const progreso = (cuentaCompletados / pasos.length) * 100

  const guardarEnBaseDatos = async () => {
    try {
      // Usar la URL del servidor (VITE_API_URL, IP de la ventana o localhost)
      const urlServidor = obtenerUrlServidor()
      
      // Crear FormData para enviar archivos
      const datosFormulario = new FormData()
      
      // Agregar datos JSON
      datosFormulario.append('userInfo', JSON.stringify(infoUsuario))
      datosFormulario.append('completedSteps', JSON.stringify(pasosCompletados))
      datosFormulario.append('stepNotes', JSON.stringify(notasPasos))
      
      // Preparar información de imágenes (con nombres únicos para evitar colisiones)
      const infoImagenes = {}
      Object.keys(imagenesPasos).forEach(idPaso => {
        infoImagenes[idPaso] = imagenesPasos[idPaso].map(img => ({
          name: img.nombreOriginal,
          originalName: img.nombre
        }))
      })
      datosFormulario.append('imagesInfo', JSON.stringify(infoImagenes))
      
      // Agregar archivos de imagen con nombres únicos
      Object.keys(archivosImagen).forEach(idPaso => {
        archivosImagen[idPaso].forEach(item => {
          datosFormulario.append('images', item.archivo, item.nombre)
        })
      })
      
      const respuesta = await fetch(`${urlServidor}/api/save`, {
        method: 'POST',
        body: datosFormulario
      })

      const datos = await respuesta.json()
      
      if (datos.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: 'Datos guardados exitosamente en la base de datos',
          confirmButtonColor: '#22c55e'
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al guardar: ' + datos.error,
          confirmButtonColor: '#1e40af'
        })
      }
    } catch (error) {
      console.error('Error al guardar en base de datos:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Error de conexión con el servidor. Asegúrate de que el backend esté corriendo. Si usas un hotspot de celular, es posible que bloquee la comunicación entre dispositivos (aislamiento de cliente).',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const manejarEnvioInfoUsuario = (e) => {
    e.preventDefault()
    setMostrarFormulario(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const manejarCambioInfoUsuario = (e) => {
    setInfoUsuario(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const manejarNuevoPC = () => {
    Swal.fire({
      title: '¿Nuevo PC?',
      text: '¿Estás seguro de que quieres empezar con un nuevo PC? Se mantendrán tus datos personales.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, nuevo PC',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Liberar URLs de objetos y limpiar imágenes de IndexedDB
        Object.values(imagenesPasos).forEach(lista =>
          lista.forEach(img => {
            if (img.url) URL.revokeObjectURL(img.url)
          })
        )
        limpiarImagenesDB().catch(error => {
          console.error('Error al limpiar imágenes de IndexedDB:', error)
        })

        // Reiniciar todo excepto nombre y apellido del estudiante
        setInfoUsuario(prev => ({
          nombre: prev.nombre,
          apellido: prev.apellido,
          nombrePC: ''
        }))
        setPasosCompletados({})
        setNotasPasos({})
        setImagenesPasos({})
        setArchivosImagen({})
        setMostrarFormulario(true)
        // Actualizar localStorage con los datos del estudiante
        const datosActuales = JSON.parse(localStorage.getItem('clinicaDelPC') || '{}')
        localStorage.setItem('clinicaDelPC', JSON.stringify({
          ...datosActuales,
          userInfo: {
            nombre: infoUsuario.nombre,
            apellido: infoUsuario.apellido,
            nombrePC: ''
          },
          showForm: true,
          completedSteps: {},
          stepNotes: {}
        }))
        
        Swal.fire({
          icon: 'success',
          title: 'Reiniciado',
          text: 'Puedes empezar con un nuevo PC',
          confirmButtonColor: '#22c55e'
        })
      }
    })
  }

  const manejarExportarWord = async () => {
    try {
      const urlServidor = obtenerUrlServidor()

      Swal.fire({
        title: 'Generando Word...',
        text: 'Por favor espera mientras se genera el documento',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Create FormData to send images
      const datosFormulario = new FormData()
      datosFormulario.append('userInfo', JSON.stringify(infoUsuario))
      datosFormulario.append('completedSteps', JSON.stringify(pasosCompletados))
      datosFormulario.append('stepNotes', JSON.stringify(notasPasos))
      // Preparar información de imágenes para el documento Word
      const infoImagenes = {}
      Object.keys(imagenesPasos).forEach(idPaso => {
        infoImagenes[idPaso] = imagenesPasos[idPaso].map(img => ({
          name: img.nombreOriginal,
          originalName: img.nombre
        }))
      })
      datosFormulario.append('imagesInfo', JSON.stringify(infoImagenes))
      datosFormulario.append('steps', JSON.stringify(pasos))

      // Agregar archivos de imagen con mapeo por paso
      const mapeoImagenes = {};
      let indiceArchivo = 0;
      
      Object.keys(archivosImagen).forEach(idPaso => {
        mapeoImagenes[idPaso] = [];
        archivosImagen[idPaso].forEach(item => {
          datosFormulario.append('images', item.archivo, item.nombre);
          mapeoImagenes[idPaso].push(indiceArchivo);
          indiceArchivo++;
        });
      });
      
      datosFormulario.append('imageMapping', JSON.stringify(mapeoImagenes));

      const respuesta = await fetch(`${urlServidor}/api/export-word`, {
        method: 'POST',
        body: datosFormulario
      })

      if (!respuesta.ok) {
        throw new Error('Error al generar el documento Word')
      }

      const blob = await respuesta.blob()
      const url = window.URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `reporte_${infoUsuario.nombre}_${infoUsuario.apellido}_${infoUsuario.nombrePC}.docx`
      document.body.appendChild(enlace)
      enlace.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(enlace)

      Swal.fire({
        icon: 'success',
        title: '¡Word generado!',
        text: 'El documento se ha descargado exitosamente',
        confirmButtonColor: '#22c55e'
      })
    } catch (error) {
      console.error('Error exporting to Word:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al generar el documento Word: ' + error.message,
        confirmButtonColor: '#1e40af'
      })
    }
  }

  if (mostrarFormulario) {
    return (
      <div className="app">
        {!conectado && (
          <div className="connection-banner">
            ⚠️ No se detecta conexión con el servidor. Verifica que el backend esté corriendo. Si usas hotspot de celular, puede estar bloqueando la comunicación entre dispositivos.
          </div>
        )}
        <header className="header">
          <h1>🏥 Clínica del PC</h1>
          <p className="subtitle">Guía de mantenimiento de software</p>
        </header>

        <main className="main-content">
          <div className="form-container">
            <h2>Información del Estudiante</h2>
            <form onSubmit={manejarEnvioInfoUsuario} className="user-form">
              <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={infoUsuario.nombre}
                  onChange={manejarCambioInfoUsuario}
                  required
                  placeholder="Tu nombre"
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido">Apellido</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={infoUsuario.apellido}
                  onChange={manejarCambioInfoUsuario}
                  required
                  placeholder="Tu apellido"
                />
              </div>

              <div className="form-group">
                <label htmlFor="nombrePC">Nombre del PC</label>
                <input
                  type="text"
                  id="nombrePC"
                  name="nombrePC"
                  value={infoUsuario.nombrePC}
                  onChange={manejarCambioInfoUsuario}
                  required
                  placeholder="Nombre del computador"
                />
              </div>

              <button type="submit" className="primary">
                Comenzar Guía
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {!conectado && (
        <div className="connection-banner">
          ⚠️ No se detecta conexión con el servidor. Verifica que el backend esté corriendo. Si usas hotspot de celular, puede estar bloqueando la comunicación entre dispositivos.
        </div>
      )}
      <header className="header">
        <h1>🏥 Clínica del PC</h1>
        <p className="subtitle">Guía de mantenimiento de software</p>
        
        <div className="reminder-banner">
          ⚠️ No te olvides de guardar en la base de datos
        </div>
        
        <div className="user-info-display">
          <p><strong>Estudiante:</strong> {infoUsuario.nombre} {infoUsuario.apellido}</p>
          <p><strong>PC:</strong> {infoUsuario.nombrePC}</p>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progreso}%` }}></div>
          </div>
          <p className="progress-text">{cuentaCompletados} de {pasos.length} pasos completados ({Math.round(progreso)}%)</p>
        </div>
      </header>

      <main className="main-content">
        <div className="steps-container">
          {pasos.map((step) => (
            <div 
              key={step.id} 
              className={`step-card ${pasosCompletados[step.id] ? 'completed' : ''}`}
            >
              <div className="step-header">
                <div className="step-number">{step.id}</div>
                <h2>{step.titulo}</h2>
                <button 
                  className={`check-btn ${pasosCompletados[step.id] ? 'checked' : ''}`}
                  onClick={() => alternarPaso(step.id)}
                >
                  {pasosCompletados[step.id] ? '✓' : '○'}
                </button>
              </div>
              
              <div className="step-content">
                <ul className="instructions">
                  {step.instrucciones.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
                
                <div className="evidence">
                  <strong>Evidencia:</strong> {step.evidencia}
                </div>

                <div className="notes-section">
                  <label htmlFor={`note-${step.id}`}>Notas:</label>
                  <textarea
                    id={`note-${step.id}`}
                    value={notasPasos[step.id] || ''}
                    onChange={(e) => manejarCambioNota(step.id, e.target.value)}
                    placeholder="Agrega tus notas aquí..."
                    rows="3"
                  />
                </div>

                <div className="images-section">
                  <label>Evidencia fotográfica:</label>
                  <div className="image-upload">
                    <input
                      type="file"
                      id={`image-${step.id}`}
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => manejarSubidaImagen(step.id, e)}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor={`image-${step.id}`} className="upload-btn">
                      📸 Tomar foto
                    </label>
                  </div>
                  
                  {imagenesPasos[step.id] && imagenesPasos[step.id].length > 0 && (
                    <div className="images-grid">
                      {imagenesPasos[step.id].map((imagen, indice) => (
                        <div key={imagen.nombre} className="image-item">
                          <img src={imagen.url} alt={imagen.nombreOriginal} />
                          <button
                            className="remove-image-btn"
                            onClick={() => eliminarImagen(step.id, indice)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="footer">
        <p>Lista de verificación para evaluación práctica</p>
        <div className="footer-buttons">
          <button onClick={manejarExportarWord} className="export-word-btn">
            📄 Exportar Word
          </button>
          <button onClick={guardarEnBaseDatos} className="save-db-btn">
            💾 Guardar en Base de Datos
          </button>
          <button onClick={manejarNuevoPC} className="new-pc-btn">
            🔄 Nuevo PC
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
