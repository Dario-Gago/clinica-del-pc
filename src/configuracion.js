export const obtenerUrlServidor = () => {
  const urlManual = import.meta.env?.VITE_API_URL?.trim()
  if (urlManual) return urlManual

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001'
  }

  return `http://${window.location.hostname}:3001`
}
