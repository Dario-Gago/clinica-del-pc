import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { steps } from './steps'

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
          text: 'Error al guardar: ' + data.error,
          confirmButtonColor: '#1e40af'
        })
      }
    } catch (error) {
      console.error('Error al guardar en base de datos:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Error de conexión con el servidor. Asegúrate de que el backend esté corriendo.',
        confirmButtonColor: '#1e40af'
      })
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
        
        Swal.fire({
          icon: 'success',
          title: 'Reiniciado',
          text: 'Puedes empezar con un nuevo PC',
          confirmButtonColor: '#22c55e'
        })
      }
    })
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
