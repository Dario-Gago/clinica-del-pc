export const pasos = [
  {
    id: 1,
    titulo: "Obtener información del equipo",
    instrucciones: [
      "Presiona Windows + R",
      "Escribe cmd y presiona Enter",
      "Ejecuta: systeminfo > %USERPROFILE%\\Desktop\\sys.txt",
      "Se generará un archivo llamado sys.txt en el Escritorio con toda la información del computador."
    ],
    evidencia: "Archivo sys.txt"
  },
  {
    id: 2,
    titulo: "Revisar el Setup (BIOS)",
    instrucciones: [
      "Reinicia el computador.",
      "Presiona F2, DEL, F10 o ESC (depende del fabricante).",
      "Verifica que se detecten correctamente el disco duro o SSD, la memoria RAM, el procesador y la fecha y hora.",
      "No modifiques la configuración si no es necesario."
    ],
    evidencia: "Fotografía de la BIOS (si se solicita)."
  },
  {
    id: 3,
    titulo: "Desfragmentar el disco (solo HDD)",
    instrucciones: [
      "Si el equipo tiene SSD, este paso no se realiza.",
      "Busca 'Desfragmentar y optimizar unidades'.",
      "Selecciona el disco.",
      "Haz clic en 'Optimizar'.",
      "Espera a que finalice el proceso."
    ],
    evidencia: "Captura del proceso."
  },
  {
    id: 4,
    titulo: "Eliminar archivos temporales",
    instrucciones: [
      "Método 1: Presiona Windows + R, escribe %temp%, selecciona todo (Ctrl + A) y elimina los archivos. Si alguno no se puede eliminar, selecciona 'Omitir'.",
      "Método 2: Ve a Configuración → Sistema → Almacenamiento y activa el Sensor de almacenamiento."
    ],
    evidencia: "Captura de la limpieza."
  },
  {
    id: 5,
    titulo: "Analizar malware",
    instrucciones: [
      "Abre Seguridad de Windows.",
      "Ingresa a 'Protección contra virus y amenazas'.",
      "Selecciona 'Opciones de examen'.",
      "Ejecuta un 'Examen completo'.",
      "Espera a que finalice."
    ],
    evidencia: "Captura del análisis."
  },
  {
    id: 6,
    titulo: "Limpiar la carpeta Descargas",
    instrucciones: [
      "Abre la carpeta Descargas.",
      "Elimina instaladores antiguos, archivos repetidos, documentos innecesarios y videos que ya no utilices."
    ],
    evidencia: "Captura de la carpeta limpia."
  },
  {
    id: 7,
    titulo: "Liberar espacio en disco",
    instrucciones: [
      "Abre 'Este equipo'.",
      "Haz clic derecho sobre Disco Local (C:) y selecciona 'Propiedades'.",
      "Haz clic en 'Liberador de espacio'.",
      "Marca Archivos temporales, Papelera de reciclaje, Caché y Miniaturas.",
      "Haz clic en 'Aceptar'."
    ],
    evidencia: "Captura del proceso."
  },
  {
    id: 8,
    titulo: "Revisar Windows Update",
    instrucciones: [
      "Ve a Configuración.",
      "Abre Windows Update.",
      "Haz clic en 'Buscar actualizaciones'.",
      "Si existen errores, regístralos."
    ],
    evidencia: "Captura de Windows Update."
  },
  {
    id: 9,
    titulo: "Desinstalar programas innecesarios",
    instrucciones: [
      "Ve a Configuración → Aplicaciones.",
      "Desinstala los programas que ya no utilizas.",
      "No elimines controladores, Microsoft Visual C++ ni componentes de Windows."
    ],
    evidencia: "Lista de programas desinstalados."
  },
  {
    id: 10,
    titulo: "Limpiar el Visor de eventos",
    instrucciones: [
      "Abre el Visor de eventos.",
      "Ingresa a 'Registros de Windows'.",
      "Selecciona 'Aplicación'.",
      "Haz clic en 'Borrar registro'.",
      "Si se solicita, repite el procedimiento en 'Sistema'."
    ],
    evidencia: "Captura del visor limpio."
  },
  {
    id: 11,
    titulo: "Configurar la memoria virtual (opcional)",
    instrucciones: [
      "Busca 'Ajustar la apariencia y rendimiento de Windows'.",
      "Abre la pestaña 'Opciones avanzadas'.",
      "En Memoria virtual, selecciona 'Cambiar'.",
      "Si el equipo tiene poca RAM, configura: Tamaño inicial = RAM × 1,5 y Tamaño máximo = RAM × 2.",
      "Ejemplo: RAM de 8 GB → Inicial: 12000 MB | Máximo: 16000 MB."
    ],
    evidencia: "Captura de la configuración."
  },
  {
    id: 12,
    titulo: "Desactivar efectos visuales",
    instrucciones: [
      "Busca 'Ajustar la apariencia y rendimiento de Windows'.",
      "Selecciona 'Ajustar para obtener el mejor rendimiento'.",
      "Haz clic en 'Aceptar'."
    ],
    evidencia: "Captura de la configuración."
  }
];