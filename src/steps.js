export const steps = [
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
