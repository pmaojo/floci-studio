# RFC: Importación y Exportación de Datos CSV para Tablas DynamoDB

## 1. Resumen y Propuesta de Valor
Floci Studio ya permite la visualización y manipulación de elementos individuales en DynamoDB y cuenta con importación/exportación en formato JSON. Sin embargo, para integrarse de manera óptima en flujos de trabajo de ciencia de datos, migraciones y manipulación masiva de datos (como hojas de cálculo), es altamente estratégico soportar el formato CSV.

### Análisis Competitivo
Al analizar herramientas de la competencia en el ecosistema de gestión visual y emulación local de AWS:
- **NoSQL Workbench for Amazon DynamoDB** (oficial de AWS) permite la construcción visual de modelos de datos y la exportación/importación de datasets en formato CSV, sin embargo es una herramienta de escritorio pesada y aislada de otros servicios AWS.
- **LocalStack Web UI** ofrece dashboards visuales, pero las características de exportación y migración de estado (Cloud Pods) a menudo están bloqueadas tras versiones de pago.
- **Commandeer** es una herramienta de escritorio completa que ofrece visores para DynamoDB, pero tiene curva de aprendizaje e instalación pesada.

**La Característica Diferencial:** Añadir importación y exportación de archivos CSV de forma nativa en la vista de DynamoDB (`DynamoDBView`) dentro de Floci Studio proporcionará a los desarrolladores una manera instantánea, sin costo y sin fricción de poblar (seed) y hacer copias de seguridad de sus bases de datos emuladas utilizando un formato estándar de la industria.

## 2. Arquitectura e Implementación Técnica

### Enfoque "Standard Library First" y "Zero-Dependency"
Para mantener la arquitectura del frontend lo más ligera y limpia posible, no añadiremos bibliotecas externas para el procesamiento de archivos CSV. En su lugar, construiremos utilidades nativas en JavaScript que cumplan con los requerimientos básicos del estándar para poder:
- **Generar CSV:** Deducir cabeceras (headers) unificadas a partir del estado actual (`items`) en la memoria del navegador, escapar comillas y construir el documento final separado por comas.
- **Parsear CSV:** Dividir las filas, leer los campos respetando comillas y convertirlos a un arreglo de objetos JSON (casteando números y booleanos según corresponda, y procesando cadenas).

### Modificaciones en el Frontend (`src/views/DynamoDBView.tsx`)
Se agregarán las funcionalidades bajo la pestaña de operaciones de la tabla (Items Explorer).
1. **Export CSV:**
   - Un botón "Export CSV" se ubicará junto a "Export JSON".
   - Al hacer clic en `handleExportCSV`, transformaremos el arreglo actual `items` (que ya está desenpaquetado o "unmarshalled") a formato CSV.
   - Utilizaremos la API `Blob` nativa y crearemos un enlace temporal (`URL.createObjectURL`) forzando la descarga del archivo `.csv`.

2. **Import CSV:**
   - Un input de archivo con etiqueta "Import CSV" se ubicará junto a "Import JSON".
   - Al seleccionar un archivo CSV, `handleImportCSVFile` utilizará `FileReader` o la API `file.text()` nativa para cargar el contenido en memoria.
   - El texto será analizado, y para cada fila convertida en objeto JSON, utilizaremos `marshalItem` para empaquetarlo en el formato requerido por DynamoDB y usar el `PutItemCommand` (del SDK directo de AWS).

## 3. Plan de Pruebas
- Pruebas unitarias/E2E que validen que el archivo se descarga correctamente (descarga del blob).
- Pruebas de integración visuales donde se carga un CSV y se verifica que los ítems han sido añadidos exitosamente al emulador de DynamoDB en Floci Studio.
