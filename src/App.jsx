import { useState, useEffect } from 'react'

const steps = [
  {
    id: 1,
    title: "Obtener información del equipo",
    instructions: [
      "Presiona Windows + R",
      "Escribe cmd y presiona Enter",
      "Ejecuta: systeminfo > %USERPROFILE%\\Desktop\\sys.txt",
      "Esto generará un archivo llamado sys.txt en el Escritorio con toda la información del computador"
    ],
    evidence: "archivo sys.txt"
  },
  {
    id: 2,
    title: "Revisar el Setup (BIOS)",
    instructions: [
      "Reinicia el computador",
      "Presiona F2, DEL, F10 o ESC (depende del fabricante)",
      "Revisa que aparezcan correctamente: Disco duro o SSD, Memoria RAM, Procesador, Fecha y hora",
      "No modifiques configuraciones si no es necesario"
    ],
    evidence: "fotografía de la BIOS (si la solicitan)"
  },
  {
    id: 3,
    title: "Desfragmentar el disco (solo HDD)",
    instructions: [
      "Si el equipo tiene SSD, este paso no se realiza",
      "Buscar: Desfragmentar y optimizar unidades",
      "Seleccionar el disco",
      "Presionar Optimizar",
      "Esperar hasta que termine"
    ],
    evidence: "captura del proceso"
  },
  {
    id: 4,
    title: "Eliminar archivos temporales",
    instructions: [
      "Método 1: Presiona Windows + R, escribe %temp%, selecciona todo (Ctrl + A), Eliminar. Si algún archivo no se puede eliminar: Omitir",
      "Método 2: Ir a Configuración → Sistema → Almacenamiento → Activar Sensor de almacenamiento"
    ],
    evidence: "captura de limpieza"
  },
  {
    id: 5,
    title: "Analizar malware",
    instructions: [
      "Abrir Seguridad de Windows",
      "Protección contra virus y amenazas",
      "Opciones de examen",
      "Examen completo",
      "Esperar a que finalice"
    ],
    evidence: "captura del análisis"
  },
  {
    id: 6,
    title: "Limpiar Descargas",
    instructions: [
      "Abrir Descargas",
      "Eliminar: instaladores antiguos, archivos repetidos, documentos innecesarios, videos que no se utilicen"
    ],
    evidence: "captura de carpeta limpia"
  },
  {
    id: 7,
    title: "Liberador de espacio",
    instructions: [
      "Abrir Este equipo",
      "Clic derecho en Disco Local (C:)",
      "Propiedades",
      "Liberador de espacio",
      "Marcar: Archivos temporales, Papelera, Caché, Miniaturas",
      "Aceptar"
    ],
    evidence: "captura del proceso"
  },
  {
    id: 8,
    title: "Revisar Windows Update",
    instructions: [
      "Ir a Configuración",
      "Windows Update",
      "Buscar actualizaciones",
      "Si existen errores, anotarlos"
    ],
    evidence: "captura de actualizaciones"
  },
  {
    id: 9,
    title: "Desinstalar programas innecesarios",
    instructions: [
      "Ir a Configuración",
      "Aplicaciones",
      "Eliminar programas que no se utilizan",
      "No eliminar: Drivers, Microsoft Visual C++, Componentes de Windows"
    ],
    evidence: "lista de programas eliminados"
  },
  {
    id: 10,
    title: "Limpiar Visor de Eventos",
    instructions: [
      "Buscar Visor de eventos",
      "Registros de Windows",
      "Aplicación",
      "Borrar registro",
      "(Hacer lo mismo en Sistema si el profesor lo solicita)"
    ],
    evidence: "captura del visor limpio"
  },
  {
    id: 11,
    title: "Configurar Memoria Virtual (opcional)",
    instructions: [
      "Buscar Ajustar la apariencia y rendimiento de Windows",
      "Opciones avanzadas",
      "Memoria virtual",
      "Cambiar",
      "Si el equipo tiene poca RAM: Tamaño inicial = RAM × 1,5, Tamaño máximo = RAM × 2",
      "Ejemplo: RAM = 8 GB, Inicial: 12000 MB, Máximo: 16000 MB"
    ],
    evidence: "captura de configuración"
  },
  {
    id: 12,
    title: "Desactivar efectos visuales",
    instructions: [
      "Buscar Ajustar la apariencia y rendimiento de Windows",
      "Elegir Ajustar para obtener el mejor rendimiento",
      "Aceptar"
    ],
    evidence: "captura de configuración"
  }
]

function App() {
  const [completedSteps, setCompletedSteps] = useState({})
  const [currentStep, setCurrentStep] = useState(1)
  const [userInfo, setUserInfo] = useState({
    nombre: '',
    apellido: '',
    nombrePC: ''
  })
  const [showForm, setShowForm] = useState(true)
  const [stepNotes, setStepNotes] = useState({})
  const [stepImages, setStepImages] = useState({})
  const [imageFiles, setImageFiles] = useState({})

  // Cargar datos desde localStorage al montar
  useEffect(() => {
    const savedData = localStorage.getItem('clinicaDelPC')
    console.log('Datos en localStorage:', savedData)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        console.log('Datos parseados:', parsed)
        if (parsed.userInfo) {
          console.log('Setting userInfo:', parsed.userInfo)
          setUserInfo(parsed.userInfo)
          // No ocultamos el formulario, solo autocompletamos los campos
        }
        if (parsed.showForm !== undefined) setShowForm(parsed.showForm)
        if (parsed.completedSteps) setCompletedSteps(parsed.completedSteps)
        if (parsed.stepNotes) setStepNotes(parsed.stepNotes)
        // No cargamos imágenes desde localStorage ya que ahora se guardan en el servidor
      } catch (error) {
        console.error('Error al cargar datos:', error)
      }
    }
  }, [])

  // Guardar datos en localStorage cuando cambien (sin imágenes)
  useEffect(() => {
    // No guardar si userInfo está vacío (estado inicial)
    if (!userInfo.nombre && !userInfo.apellido && !userInfo.nombrePC) {
      return
    }
    
    const dataToSave = {
      userInfo,
      showForm,
      completedSteps,
      stepNotes
      // No guardamos imágenes en localStorage
    }
    try {
      localStorage.setItem('clinicaDelPC', JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Error al guardar datos:', error)
    }
  }, [userInfo, showForm, completedSteps, stepNotes])

  const toggleStep = (stepId) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }))
  }

  const handleNoteChange = (stepId, note) => {
    setStepNotes(prev => ({
      ...prev,
      [stepId]: note
    }))
  }

  const handleImageUpload = (stepId, e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const imageArray = Array.from(files).map(file => ({
        name: file.name,
        originalName: file.name,
        file: file,
        url: URL.createObjectURL(file)
      }))
      
      setStepImages(prev => ({
        ...prev,
        [stepId]: [...(prev[stepId] || []), ...imageArray]
      }))
      
      setImageFiles(prev => ({
        ...prev,
        [stepId]: [...(prev[stepId] || []), ...files]
      }))
    }
  }

  const removeImage = (stepId, index) => {
    setStepImages(prev => ({
      ...prev,
      [stepId]: prev[stepId].filter((_, i) => i !== index)
    }))
    setImageFiles(prev => ({
      ...prev,
      [stepId]: prev[stepId].filter((_, i) => i !== index)
    }))
  }

  const completedCount = Object.values(completedSteps).filter(Boolean).length
  const progress = (completedCount / steps.length) * 100

  const saveToDatabase = async () => {
    try {
      // Usar la URL del servidor actual o localhost para desarrollo
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : `http://${window.location.hostname}:3001`
      
      // Crear FormData para enviar archivos
      const formData = new FormData()
      
      // Agregar datos JSON
      formData.append('userInfo', JSON.stringify(userInfo))
      formData.append('completedSteps', JSON.stringify(completedSteps))
      formData.append('stepNotes', JSON.stringify(stepNotes))
      
      // Preparar información de imágenes
      const imagesInfo = {}
      Object.keys(stepImages).forEach(stepId => {
        imagesInfo[stepId] = stepImages[stepId].map(img => ({
          name: img.name,
          originalName: img.originalName
        }))
      })
      formData.append('imagesInfo', JSON.stringify(imagesInfo))
      
      // Agregar archivos de imagen
      Object.keys(imageFiles).forEach(stepId => {
        imageFiles[stepId].forEach(file => {
          formData.append('images', file)
        })
      })
      
      const response = await fetch(`${serverUrl}/api/save`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        alert('¡Datos guardados exitosamente en la base de datos!')
      } else {
        alert('Error al guardar: ' + data.error)
      }
    } catch (error) {
      console.error('Error al guardar en base de datos:', error)
      alert('Error de conexión con el servidor. Asegúrate de que el backend esté corriendo.')
    }
  }

  const handleUserInfoSubmit = (e) => {
    e.preventDefault()
    setShowForm(false)
  }

  const handleUserInfoChange = (e) => {
    setUserInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleNewPC = () => {
    if (confirm('¿Estás seguro de que quieres empezar con un nuevo PC? Se mantendrán tus datos personales.')) {
      // Reiniciar todo excepto nombre y apellido del estudiante
      setUserInfo(prev => ({
        nombre: prev.nombre,
        apellido: prev.apellido,
        nombrePC: ''
      }))
      setCompletedSteps({})
      setStepNotes({})
      setStepImages({})
      setImageFiles({})
      setShowForm(true)
      // Actualizar localStorage con los datos del estudiante
      const currentData = JSON.parse(localStorage.getItem('clinicaDelPC') || '{}')
      localStorage.setItem('clinicaDelPC', JSON.stringify({
        ...currentData,
        userInfo: {
          nombre: userInfo.nombre,
          apellido: userInfo.apellido,
          nombrePC: ''
        },
        showForm: true,
        completedSteps: {},
        stepNotes: {}
      }))
    }
  }

  if (showForm) {
    return (
      <div className="app">
        <header className="header">
          <h1>🏥 Clínica del PC</h1>
          <p className="subtitle">Guía de mantenimiento de hardware y software</p>
        </header>

        <main className="main-content">
          <div className="form-container">
            <h2>Información del Estudiante</h2>
            <form onSubmit={handleUserInfoSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={userInfo.nombre}
                  onChange={handleUserInfoChange}
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
                  value={userInfo.apellido}
                  onChange={handleUserInfoChange}
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
                  value={userInfo.nombrePC}
                  onChange={handleUserInfoChange}
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
      <header className="header">
        <h1>🏥 Clínica del PC</h1>
        <p className="subtitle">Guía de mantenimiento de hardware y software</p>
        
        <div className="user-info-display">
          <p><strong>Estudiante:</strong> {userInfo.nombre} {userInfo.apellido}</p>
          <p><strong>PC:</strong> {userInfo.nombrePC}</p>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{completedCount} de {steps.length} pasos completados ({Math.round(progress)}%)</p>
        </div>

        <button onClick={saveToDatabase} className="save-db-btn">
          💾 Guardar en Base de Datos
        </button>
      </header>

      <main className="main-content">
        <div className="steps-container">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`step-card ${completedSteps[step.id] ? 'completed' : ''}`}
            >
              <div className="step-header">
                <div className="step-number">{step.id}</div>
                <h2>{step.title}</h2>
                <button 
                  className={`check-btn ${completedSteps[step.id] ? 'checked' : ''}`}
                  onClick={() => toggleStep(step.id)}
                >
                  {completedSteps[step.id] ? '✓' : '○'}
                </button>
              </div>
              
              <div className="step-content">
                <ul className="instructions">
                  {step.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
                
                <div className="evidence">
                  <strong>Evidencia:</strong> {step.evidence}
                </div>

                <div className="notes-section">
                  <label htmlFor={`note-${step.id}`}>Notas:</label>
                  <textarea
                    id={`note-${step.id}`}
                    value={stepNotes[step.id] || ''}
                    onChange={(e) => handleNoteChange(step.id, e.target.value)}
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
                      onChange={(e) => handleImageUpload(step.id, e)}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor={`image-${step.id}`} className="upload-btn">
                      📸 Tomar foto
                    </label>
                  </div>
                  
                  {stepImages[step.id] && stepImages[step.id].length > 0 && (
                    <div className="images-grid">
                      {stepImages[step.id].map((image, index) => (
                        <div key={index} className="image-item">
                          <img src={image.url} alt={image.name} />
                          <button
                            className="remove-image-btn"
                            onClick={() => removeImage(step.id, index)}
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
        <button onClick={handleNewPC} className="new-pc-btn">
          🔄 Nuevo PC
        </button>
      </footer>
    </div>
  )
}

export default App
