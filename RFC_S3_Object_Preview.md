# RFC: S3 Object/Media Viewer en Floci Studio

## 1. Análisis Competitivo y Propuesta de Valor
**Contexto**: Floci Studio provee una interfaz gráfica avanzada para emulación local de AWS. Actualmente, los desarrolladores pueden interactuar con S3 para crear buckets, listar objetos, subir y eliminar archivos, y obtener una URL directa ("Download / Open Direct") que descarga o abre el archivo en una nueva pestaña.
**Análisis de la Competencia**: Herramientas líderes en la gestión visual de AWS local como la interfaz web de LocalStack, AWS Toolkit y la propia consola nativa de AWS permiten, además de descargar los archivos, **previsualizar directamente** su contenido (particularmente imágenes y archivos multimedia) desde el mismo navegador, sin necesidad de salir del contexto del bucket ni descargar el archivo al disco duro local.
**Valor Estratégico**: La falta de una vista previa in-app interrumpe el flujo de trabajo (workflow) del desarrollador, especialmente al depurar cargas de assets estáticos, fotos de perfiles, o preprocesamiento de imágenes. Incorporar un **S3 Object/Media Viewer** nativo en Floci Studio aumenta la eficiencia del desarrollo (Developer Experience / DX), reteniendo al usuario dentro del "cockpit" sin incurrir en cambios de contexto constantes.

## 2. Alcance Técnico y Diseño de Arquitectura
**Principios**: Mantener el enfoque "Standard Library First" y "Zero-Dependency". No se añadirán librerías de terceros (como react-image-lightbox o visores complejos); la previsualización se construirá mediante las primitivas nativas de React y componentes de UI ya existentes en Floci Studio.

**Implementación en el Frontend (`src/views/S3View.tsx`)**:
1. **Estado**: Se agregará una variable de estado `previewObjectKey: string | null` (y su respectivo `setPreviewObjectKey`) para determinar si hay un archivo seleccionado para visualización.
2. **Reconocimiento de Tipos**: Se implementará una función auxiliar o comprobación en línea para verificar si la extensión del `Object Key` corresponde a un tipo soportado (ej. `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`).
3. **Acción de Visualización**: En la tabla de objetos, junto a las acciones de copiar y descargar, se agregará un nuevo botón con un ícono (como `Image` de lucide-react o el existente `ExternalLink`) llamado "Preview Image", exclusivo para los archivos soportados.
4. **Modal / Overlay**: Se reutilizará el componente `<Modal>` o un overlay a pantalla completa. Cuando `previewObjectKey` no sea nulo, se renderizará un elemento `<img>` donde la fuente (`src`) será el resultado de invocar `getObjectUrl(selectedBucket, previewObjectKey)`.
5. **Registro de Actividad**: Se invocará `logActivity('S3', 'PreviewObject: ...', 'success')` para mantener la consistencia con el bus de eventos del cockpit.

## 3. Criterios de Aceptación
1. El usuario debe poder ver un botón de previsualización para archivos con extensiones de imagen soportadas dentro de un bucket S3.
2. Al hacer clic en dicho botón, debe abrirse un modal o visualizador en pantalla que cargue la imagen empleando el endpoint del emulador local.
3. El usuario debe poder cerrar la vista previa y continuar explorando el bucket.
4. La implementación no debe requerir dependencias externas adicionales, respetando la arquitectura del SPA React + Vite.
