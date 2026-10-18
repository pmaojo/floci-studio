# RFC: Generación de URLs Prefirmadas (Presigned URLs) en Floci Studio S3

## 1. Resumen
Este documento propone la implementación de una funcionalidad para generar **URLs Prefirmadas (Presigned URLs)** directamente desde el cockpit de **Amazon S3** en **Floci Studio**. Las URLs prefirmadas permiten otorgar acceso temporal de descarga a objetos privados almacenados en un bucket sin necesidad de cambiar los permisos del bucket o exponer credenciales a los usuarios.

## 2. Propuesta de Valor y Análisis Competitivo
Al analizar el ecosistema de herramientas de gestión de AWS y emulación (como *LocalStack Web UI*, *Commandeer* o la propia consola de AWS), se identifica la generación de *presigned URLs* como una capacidad clave para el flujo de desarrollo. Los desarrolladores a menudo necesitan probar de manera rápida que un archivo es accesible por una URL con tiempo de expiración o necesitan compartir ese recurso estático (en su entorno local) con otras herramientas que aceptan URLs. Añadir esta funcionalidad en Floci Studio elimina la necesidad de escribir scripts de CLI ad-hoc o depender de implementaciones externas, mejorando drásticamente la productividad.

## 3. Alcance Técnico
La implementación se basará en los principios arquitectónicos de Floci Studio: **Standard Library First** y **Zero-Dependency** en la medida de lo posible para el core, aprovechando el SDK oficial.

### 3.1. Frontend (React/Vite) - Arquitectura Modular
- **Dependencia Oficial**: Se integrará `@aws-sdk/s3-request-presigner` (que es parte del ecosistema oficial de AWS SDK v3 ya en uso) para generar criptográficamente la firma con las credenciales locales de Floci.
- **Componente (`src/views/S3View.tsx`)**:
  - En la vista de detalles/explorador de objetos de un bucket, se añadirá un nuevo botón de acción rápida (icono de *Link* o *Share*) para cada objeto.
  - Al interactuar con el botón, la función `handleGeneratePresignedUrl` llamará a `getSignedUrl(clients.s3, new GetObjectCommand({ Bucket, Key }), { expiresIn: 3600 })`.
  - La URL generada apuntará de forma transparente al endpoint local (`http://localhost:4566/...`) que emula a AWS.
  - El resultado se copiará inmediatamente en el portapapeles y se informará al usuario (vía `alert` o toast), integrando correctamente los logs de actividad a través de la función `logActivity('S3', ...)` del sistema base de Floci.

## 4. Criterios de Aceptación
1. Un usuario debe poder navegar por los objetos de un bucket en la pestaña de S3.
2. Cada objeto debe tener un botón o enlace de acción explícito para generar una *Presigned URL*.
3. Al hacer clic, la URL debe generarse de manera síncrona/asíncrona y copiarse al portapapeles exitosamente.
4. Las pruebas de E2E o unitarias existentes para la vista S3 deben seguir pasando sin regresiones.
5. El diseño se debe alinear a la estética e iconografía actual de Floci Studio utilizando `lucide-react`.
