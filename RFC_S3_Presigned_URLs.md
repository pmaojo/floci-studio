# RFC: Generación de URLs prefirmadas (Presigned URLs) de S3 en Floci Studio

## 1. Resumen
Este documento detalla la implementación de la funcionalidad de generación de URLs prefirmadas para objetos de S3 directamente desde la interfaz gráfica de **Floci Studio**. Esta característica permite a los desarrolladores compartir o descargar objetos de S3 de manera temporal y segura, simulando el comportamiento real de AWS.

## 2. Propuesta de Valor y Análisis Competitivo
Tras analizar herramientas del ecosistema como *NoSQL Workbench*, *LocalStack Web UI* y la consola nativa de AWS, la generación de *Presigned URLs* es una característica esencial para probar flujos de trabajo de subida y descarga (ej. subida directa de archivos desde el navegador a S3, o descarga temporal sin credenciales directas). Actualmente Floci Studio carece de esta capacidad visual en su explorador de S3, forzando a los usuarios a escribir scripts manuales.
Incorporar esto eleva el nivel de la emulación de Floci Studio, agilizando pruebas en el ciclo de desarrollo local (DX).

## 3. Alcance Técnico
La implementación se alinea con los principios de **Standard Library First** y **Zero-Dependency** para la lógica central:

### 3.1. Frontend (React/Vite) - Arquitectura Modular
- **Componente Afectado**: `src/views/S3View.tsx`.
- **Nuevas Dependencias**: Instalación de `@aws-sdk/s3-request-presigner` (paquete estándar de la SDK v3 de AWS para generar presigned URLs).
- **Lógica de Integración**:
  - Se definirá el manejador `handleGeneratePresignedUrl` que invocará `getSignedUrl(clients.s3, new GetObjectCommand({ ... }), { expiresIn: 3600 })`.
  - La URL generada será copiada directamente al portapapeles y notificada visualmente, reutilizando las funciones nativas del componente (`handleCopyText`, `logActivity`).
- **UI**: Se añadirá un botón con el icono de enlace (`Link` de `lucide-react`) en la tabla de exploración de objetos por cada archivo, situado junto a las opciones de copiar URI y borrar.

## 4. Criterios de Aceptación
1. El usuario debe poder navegar a un bucket de S3 con objetos en él y ver el nuevo icono de "Link" por cada archivo.
2. Al pulsar en el icono, se debe invocar la API del SDK local de S3 para crear una *Presigned URL* de lectura (`GetObjectCommand`).
3. El usuario recibirá un aviso de confirmación de que la URL (apuntando al emulador local en el puerto correcto) se ha copiado al portapapeles y se debe emitir un log (Activity Log).
4. El proceso de *testing* (Vitest y Playwright E2E) no debe romperse ni reportar regresiones, demostrando que la solución se integra de manera robusta.