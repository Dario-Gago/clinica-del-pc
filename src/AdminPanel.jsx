import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { steps } from './steps'

const AdminPanel = () => {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [expandedComputer, setExpandedComputer] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : `http://${window.location.hostname}:3001`

      const response = await fetch(`${serverUrl}/api/admin/all-data`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al cargar datos: ' + result.error,
          confirmButtonColor: '#1e40af'
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Error de conexión con el servidor',
        confirmButtonColor: '#1e40af'
      })
    } finally {
      setLoading(false)
    }
  }

  const getImageUrl = (imageName) => {
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : `http://${window.location.hostname}:3001`
    return `${serverUrl}/uploads/${imageName}`
  }

  const handleExportExcel = async () => {
    try {
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : `http://${window.location.hostname}:3001`

      Swal.fire({
        title: 'Generando Excel...',
        text: 'Por favor espera mientras se genera el archivo',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      const response = await fetch(`${serverUrl}/api/admin/export-excel`)
      
      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'clinica_del_pc_export.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      Swal.fire({
        icon: 'success',
        title: '¡Excel generado!',
        text: 'El archivo se ha descargado exitosamente',
        confirmButtonColor: '#22c55e'
      })
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al generar el archivo Excel: ' + error.message,
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const toggleStudent = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId)
    setExpandedComputer(null)
  }

  const toggleComputer = (computerId) => {
    setExpandedComputer(expandedComputer === computerId ? null : computerId)
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-header">
          <h1>🔧 Panel de Administrador</h1>
          <div className="header-actions">
            <button onClick={handleExportExcel} className="export-btn">
              📊 Exportar Excel
            </button>
            <button onClick={() => navigate('/')} className="back-btn">← Volver</button>
          </div>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  // Calcular estadísticas
  const totalStudents = data.length
  const totalComputers = data.reduce((acc, student) => acc + student.computers.length, 0)
  const totalSteps = data.reduce((acc, student) => 
    acc + student.computers.reduce((acc2, computer) => 
      acc2 + computer.steps.length, 0), 0)
  const completedSteps = data.reduce((acc, student) => 
    acc + student.computers.reduce((acc2, computer) => 
      acc2 + computer.steps.filter(s => s.completed).length, 0), 0)

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🔧 Panel de Administrador</h1>
        <div className="header-actions">
          <button onClick={handleExportExcel} className="export-btn">
            📊 Exportar Excel
          </button>
          <button onClick={() => navigate('/')} className="back-btn">← Volver</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-number">{totalStudents}</div>
            <div className="stat-label">Estudiantes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🖥️</div>
          <div className="stat-info">
            <div className="stat-number">{totalComputers}</div>
            <div className="stat-label">Computadores</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-number">{completedSteps}/{totalSteps}</div>
            <div className="stat-label">Pasos Completados</div>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No hay datos registrados</p>
          </div>
        ) : (
          data.map((student) => (
            <div key={student.id} className="student-card">
              <div className="student-header" onClick={() => toggleStudent(student.id)}>
                <div className="student-avatar">
                  {student.nombre.charAt(0)}{student.apellido.charAt(0)}
                </div>
                <div className="student-info-header">
                  <h2>{student.nombre} {student.apellido}</h2>
                  <span className="student-computers-count">{student.computers.length} computador(es)</span>
                </div>
                <span className="toggle-icon">{expandedStudent === student.id ? '▼' : '▶'}</span>
              </div>

              {expandedStudent === student.id && (
                <div className="student-details">
                  <p className="student-info">📅 Registrado: {new Date(student.created_at).toLocaleDateString()}</p>
                  
                  {student.computers.length === 0 ? (
                    <div className="empty-state small">
                      <p>Sin computadores registrados</p>
                    </div>
                  ) : (
                    student.computers.map((computer) => (
                      <div key={computer.id} className="computer-card">
                        <div className="computer-header" onClick={() => toggleComputer(computer.id)}>
                          <div className="computer-icon">🖥️</div>
                          <div className="computer-info-header">
                            <h3>{computer.nombre_pc}</h3>
                            <span className="computer-steps-count">
                              {computer.steps.filter(s => s.completed).length}/{computer.steps.length} pasos completados
                            </span>
                          </div>
                          <span className="toggle-icon">{expandedComputer === computer.id ? '▼' : '▶'}</span>
                        </div>

                        {expandedComputer === computer.id && (
                          <div className="computer-details">
                            <p className="computer-info">📅 Creado: {new Date(computer.created_at).toLocaleDateString()}</p>
                            
                            {computer.steps.length === 0 ? (
                              <div className="empty-state small">
                                <p>Sin pasos registrados</p>
                              </div>
                            ) : (
                              <div className="steps-list">
                                {computer.steps.map((step) => {
                                  const stepData = steps.find(s => s.id === step.step_id)
                                  return (
                                    <div key={step.id} className={`step-item ${step.completed ? 'completed' : ''}`}>
                                      <div className="step-header">
                                        <div className="step-number">
                                          <span className="step-badge">{step.step_id}</span>
                                        </div>
                                        <div className="step-title">
                                          {stepData ? stepData.title : `Paso ${step.step_id}`}
                                        </div>
                                        <span className={`step-status ${step.completed ? 'completed' : 'pending'}`}>
                                          {step.completed ? '✓ Completado' : '○ Pendiente'}
                                        </span>
                                      </div>
                                    
                                      {step.notes && (
                                        <div className="step-notes">
                                          <span className="notes-icon">📝</span>
                                          <span>{step.notes}</span>
                                        </div>
                                      )}
                                      
                                      {step.images && step.images.length > 0 && (
                                        <div className="step-images">
                                          <div className="images-header">
                                            <span className="images-icon">📷</span>
                                            <span>{step.images.length} imagen(es)</span>
                                          </div>
                                          <div className="images-grid">
                                            {step.images.map((image) => (
                                              <div key={image.id} className="image-item">
                                                <img 
                                                  src={getImageUrl(image.image_name)} 
                                                  alt={image.image_name}
                                                  onClick={() => window.open(getImageUrl(image.image_name), '_blank')}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AdminPanel
