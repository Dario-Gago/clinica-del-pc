# 🏥🖥️ Clínica del PC

> Aplicación web para guiar a estudiantes en el mantenimiento y diagnóstico de computadoras, con registro de evidencias, notas y exportación a Word/Excel.  
> Diseñada para funcionar en una **red local** 🌐, por lo que varios dispositivos pueden acceder desde el navegador una vez levantado el servidor.

---

## ✨ Características principales

- 📝 **Formulario de estudiante** para registrar nombre, apellido y nombre del PC.
- ✅ **Guía de pasos interactiva** con título, instrucciones y evidencia requerida.
- 📸 **Subida de imágenes** como evidencia de cada paso realizado.
- 💾 **Guardado en base de datos** PostgreSQL con manejo único de imágenes.
- 📄 **Exportación a Word** con fotos embebidas por paso.
- 📊 **Exportación a Excel** con resumen y hojas por estudiante.
- 🎛️ **Panel de administración** para consultar estudiantes, computadores y pasos.

---

## 🚀 Tecnologías

| Frontend | Backend | Base de datos | Otros |
|---|---|---|---|
| React ⚛️ | Node.js + Express 🟩 | PostgreSQL 🐘 | Multer 📁 |
| Vite ⚡ | CORS 🌐 | | docx.js 📄 |
| SweetAlert2 🍬 | dotenv 🔐 | | XLSX 📊 |

---

## 📁 Estructura del proyecto

```
clinica-del-pc/
├── public/
├── server/
│   └── index.js          # 🖥️ Backend Express + API
├── src/
│   ├── App.jsx           # 🏠 Aplicación principal
│   ├── AdminPanel.jsx    # 🎛️ Panel de administración
│   ├── pasos.js          # 📋 Lista de pasos del mantenimiento
│   └── main.jsx          # ⚛️ Punto de entrada React
├── .env                  # 🔐 Variables de entorno
├── .env-ejemplo          # 📝 Ejemplo de variables
├── package.json
└── README.md
```

---

## 🛠️ Instalación

1. Clona o descarga el proyecto.
2. Instala las dependencias:

```bash
npm install
```

3. Crea el archivo `.env` en la raíz (puedes copiar `.env-ejemplo`):

```bash
cp .env-ejemplo .env
```

4. Configura tu `.env` con los datos de tu base de datos PostgreSQL y la carpeta donde quieres guardar las imágenes.

```env
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinica_del_pc
DB_USER=postgres
DB_PASSWORD=tu_contraseña

UPLOAD_DIR=C:\Users\Estudio\Desktop\Imagenes de estudiantes
```

5. Asegúrate de que PostgreSQL esté corriendo y la base de datos `clinica_del_pc` exista.

---

## ▶️ Uso

### 🎨 Levantar el frontend

```bash
npm run dev
```

Se abrirá en `http://localhost:5173` por defecto.

### 🖥️ Levantar el backend

```bash
npm run server
```

El servidor se ejecutará en `http://{IP de red local}:3001` y `http://localhost:3001`.

### 🌐 Acceder desde otros dispositivos en la red local

No se necesita internet 🌐, solo que todos los dispositivos estén conectados a la misma red WiFi o cable (puede ser un punto de acceso de celular o un router sin salida a internet).

> ⚠️ **Importante con hotspots de celular:** algunos teléfonos activan **aislamiento de cliente** (client/AP isolation), lo que impide que los celulares se comuniquen con la computadora del servidor. Si al intentar guardar sale "Error de conexión", usa un router WiFi en lugar del hotspot, o verifica en el teléfono que esté desactivado el aislamiento/client isolation.

Una vez iniciado el backend, inicia Vite de forma que escuche en la red y apunte al backend con la variable `VITE_API_URL`:

```bash
VITE_API_URL=http://{IP_DE_TU_COMPUTADORA}:{PUERTO_BACKEND} npm run dev -- --host
```

**Ejemplo:**

```bash
VITE_API_URL=http://192.168.100.126:3001 npm run dev -- --host
```

> 💡 Reemplaza `192.168.100.126` por la IP de tu computadora y `3001` por el puerto que tengas configurado en el `.env` (variable `PORT`).

Después, desde cualquier computadora o celular conectado a la misma red WiFi/cable, abre el navegador en:

```
http://{IP de tu computadora}:5173
```

Por ejemplo: `http://192.168.100.126:5173`

> ⚠️ Sin `--host` Vite solo escucha en `localhost`, por lo que otros dispositivos no podrán conectarse.

### 🛠️ Construir para producción

```bash
npm run build
```

---

## 🌐 API endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/save` | 💾 Guarda estudiante, computador, pasos e imágenes |
| `GET` | `/api/student/:id` | 👤 Obtiene un estudiante con sus computadores y pasos |
| `GET` | `/api/students` | 👥 Obtiene todos los estudiantes |
| `GET` | `/api/admin/all-data` | 📦 Obtiene todos los datos para el panel admin |
| `GET` | `/api/admin/export-excel` | 📊 Exporta todo a Excel |
| `POST` | `/api/export-word` | 📄 Exporta reporte de mantenimiento a Word |
| `GET` | `/api/health` | ✅ Verifica que el servidor responde |

---

## 📸 Imágenes

Las fotos subidas se guardan en la carpeta configurada en `UPLOAD_DIR` y se sirven estáticamente desde `/uploads/`.

---

## 📝 Notas

- La base de datos y las tablas se crean automáticamente al iniciar el servidor si no existen.
- El idioma de la interfaz, variables y código de la aplicación está en español.
- Se recomienda no cambiar los nombres de las tablas SQL ni de los endpoints para mantener la compatibilidad del frontend.

---

## 👨‍💻 Autor

Proyecto desarrollado para la asignatura **Clínica del PC**.

---

## 📄 Licencia

Este proyecto es de uso educativo.
