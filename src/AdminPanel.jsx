import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { pasos } from './pasos'

const AdminPanel = () => {
  const navigate = useNavigate()
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [estudianteExpandido, setEstudianteExpandido] = useState(null)
  const [computadorExpandido, setComputadorExpandido] = useState(null)

  useEffect(() => {
    obtenerDatos()
  }, [])

  const obtenerDatos = async () => {
    try {
      const urlServidor = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : `http://${window.location.hostname}:3001`

      const respuesta = await fetch(`${urlServidor}/api/admin/all-data`)
      const resultado = await respuesta.json()

      if (resultado.success) {
        setDatos(resultado.data)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al cargar datos: ' + resultado.error,
          confirmButtonColor: '#1e40af'
        })
      }
    } catch (error) {
      console.error('Error al obtener datos:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Error de conexión con el servidor',
        confirmButtonColor: '#1e40af'
      })
    } finally {
      setCargando(false)
    }
  }

  const obtenerUrlImagen = (nombreImagen) => {
    const urlServidor = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : `http://${window.location.hostname}:3001`
    return `${urlServidor}/uploads/${nombreImagen}`
  }

  const manejarExportarExcel = async () => {
    try {
      const urlServidor = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
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

      const respuesta = await fetch(`${urlServidor}/api/admin/export-excel`)
      
      if (!respuesta.ok) {
        throw new Error('Error al generar el archivo Excel')
      }

      const blob = await respuesta.blob()
      const url = window.URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = 'clinica_del_pc_export.xlsx'
      document.body.appendChild(enlace)
      enlace.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(enlace)

      Swal.fire({
        icon: 'success',
        title: '¡Excel generado!',
        text: 'El archivo se ha descargado exitosamente',
        confirmButtonColor: '#22c55e'
      })
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al generar el archivo Excel: ' + error.message,
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const alternarEstudiante = (idEstudiante) => {
    setEstudianteExpandido(estudianteExpandido === idEstudiante ? null : idEstudiante)
    setComputadorExpandido(null)
  }

  const alternarComputador = (idComputador) => {
    setComputadorExpandido(computadorExpandido === idComputador ? null : idComputador)
  }

  if (cargando) {
    return (
      <div className="admin-panel">
        <div className="admin-header">
          <h1>🔧 Panel de Administrador</h1>
          <div className="header-actions">
            <button onClick={manejarExportarExcel} className="export-btn">
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
  const totalEstudiantes = datos.length
  const totalComputadores = datos.reduce((acc, estudiante) => acc + estudiante.computers.length, 0)
  const totalPasos = datos.reduce((acc, estudiante) => 
    acc + estudiante.computers.reduce((acc2, computador) => 
      acc2 + computador.steps.length, 0), 0)
  const pasosCompletados = datos.reduce((acc, estudiante) => 
    acc + estudiante.computers.reduce((acc2, computador) => 
      acc2 + computador.steps.filter(s => s.completed).length, 0), 0)

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🔧 Panel de Administrador</h1>
        <div className="header-actions">
          <button onClick={manejarExportarExcel} className="export-btn">
            📊 Exportar Excel
          </button>
          <button onClick={() => navigate('/')} className="back-btn">← Volver</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-number">{totalEstudiantes}</div>
            <div className="stat-label">Estudiantes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🖥️</div>
          <div className="stat-info">
            <div className="stat-number">{totalComputadores}</div>
            <div className="stat-label">Computadores</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-number">{pasosCompletados}/{totalPasos}</div>
            <div className="stat-label">Pasos Completados</div>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {datos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No hay datos registrados</p>
          </div>
        ) : (
          datos.map((estudiante) => (
            <div key={estudiante.id} className="student-card">
              <div className="student-header" onClick={() => alternarEstudiante(estudiante.id)}>
                <div className="student-avatar">
                  {estudiante.nombre.charAt(0)}{estudiante.apellido.charAt(0)}
                </div>
                <div className="student-info-header">
                  <h2>{estudiante.nombre} {estudiante.apellido}</h2>
                  <span className="student-computers-count">{estudiante.computers.length} computador(es)</span>
                </div>
                <span className="toggle-icon">{estudianteExpandido === estudiante.id ? '▼' : '▶'}</span>
              </div>

              {estudianteExpandido === estudiante.id && (
                <div className="student-details">
                  <p className="student-info">📅 Registrado: {new Date(estudiante.created_at).toLocaleDateString()}</p>
                  
                  {estudiante.computers.length === 0 ? (
                    <div className="empty-state small">
                      <p>Sin computadores registrados</p>
                    </div>
                  ) : (
                    estudiante.computers.map((computador) => (
                      <div key={computador.id} className="computer-card">
                        <div className="computer-header" onClick={() => alternarComputador(computador.id)}>
                          <div className="computer-icon">🖥️</div>
                          <div className="computer-info-header">
                            <h3>{computador.nombre_pc}</h3>
                            <span className="computer-steps-count">
                              {computador.steps.filter(s => s.completed).length}/{computador.steps.length} pasos completados
                            </span>
                          </div>
                          <span className="toggle-icon">{computadorExpandido === computador.id ? '▼' : '▶'}</span>
                        </div>

                        {computadorExpandido === computador.id && (
                          <div className="computer-details">
                            <p className="computer-info">📅 Creado: {new Date(computador.created_at).toLocaleDateString()}</p>
                            
                            {computador.steps.length === 0 ? (
                              <div className="empty-state small">
                                <p>Sin pasos registrados</p>
                              </div>
                            ) : (
                              <div className="steps-list">
                                {computador.steps.map((paso) => {
                                  const datosPaso = pasos.find(s => s.id === paso.step_id)
                                  return (
                                    <div key={paso.id} className={`step-item ${paso.completed ? 'completed' : ''}`}>
                                      <div className="step-header">
                                        <div className="step-number">
                                          <span className="step-badge">{paso.step_id}</span>
                                        </div>
                                        <div className="step-title">
                                          {datosPaso ? datosPaso.titulo : `Paso ${paso.step_id}`}
                                        </div>
                                        <span className={`step-status ${paso.completed ? 'completed' : 'pending'}`}>
                                          {paso.completed ? '✓ Completado' : '○ Pendiente'}
                                        </span>
                                      </div>
                                    
                                      {paso.notes && (
                                        <div className="step-notes">
                                          <span className="notes-icon">📝</span>
                                          <span>{paso.notes}</span>
                                        </div>
                                      )}
                                      
                                      {paso.images && paso.images.length > 0 && (
                                        <div className="step-images">
                                          <div className="images-header">
                                            <span className="images-icon">📷</span>
                                            <span>{paso.images.length} imagen(es)</span>
                                          </div>
                                          <div className="images-grid">
                                            {paso.images.map((imagen) => (
                                              <div key={imagen.id} className="image-item">
                                                <img 
                                                  src={obtenerUrlImagen(imagen.image_name)} 
                                                  alt={imagen.image_name}
                                                  onClick={() => window.open(obtenerUrlImagen(imagen.image_name), '_blank')}
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
