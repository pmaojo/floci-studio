# RFC: Soporte para Consultas en Índices Secundarios Globales (GSI) en DynamoDB

## 1. Resumen y Propuesta de Valor
Floci Studio actualmente permite inspeccionar elementos, ejecutar escaneos (Scans) y consultas (Queries) utilizando la clave primaria base de las tablas en DynamoDB. Sin embargo, en la arquitectura de DynamoDB del mundo real, el modelado de datos depende fundamentalmente de los Índices Secundarios Globales (Global Secondary Indexes - GSI) para soportar múltiples patrones de acceso.

### Análisis Competitivo
- **NoSQL Workbench for Amazon DynamoDB** (oficial de AWS): Proporciona capacidades ricas para visualizar tanto la tabla base como todos los GSIs asociados, permitiendo al desarrollador modelar y consultar la base de datos a través de cualquier índice.
- **LocalStack Web UI**: Permite a los usuarios consultar índices secundarios, pero la experiencia a menudo no es tan integrada como las herramientas de escritorio.
- **Floci Studio (Actual)**: Muestra información sobre los GSIs bajo la pestaña "Table Schema", pero la pestaña "Items Explorer" restringe las consultas exclusivamente a la clave primaria (Partition Key y Sort Key) de la tabla principal.

**La Característica Diferencial:** Añadir la capacidad de seleccionar y realizar "Queries" y "Scans" a través de Índices Secundarios Globales directamente en el "Items Explorer" de Floci Studio. Esto aumenta enormemente la viabilidad de la herramienta, pues las aplicaciones de producción y flujos de AI dependen profundamente de las consultas a través de GSIs para una extracción eficiente de los datos emulados.

## 2. Arquitectura e Implementación Técnica

### Enfoque "Standard Library First" y "Zero-Dependency"
La implementación será completamente nativa, basándose en la librería oficial `@aws-sdk/client-dynamodb` existente, sin requerir componentes o paquetes de terceros.

### Modificaciones en el Frontend (`src/views/DynamoDBView.tsx`)
1. **Manejo de Estado**: Introducir una nueva variable de estado `selectedIndexName` para mantener el GSI actualmente activo en el que se basa el usuario. Por defecto estará vacío (indicando la tabla base).
2. **Re-cálculo de Claves (Key Schema)**: Se modificará el hook `useMemo` llamado `primaryKeys` para extraer el esquema de claves (Partition / Sort Key) de `tableDetails.KeySchema` si estamos consultando la tabla base, o de `tableDetails.GlobalSecondaryIndexes[x].KeySchema` si un GSI ha sido seleccionado.
3. **Integración con SDK de AWS (Fetcher)**: El método `fetchItems` incluirá condicionalmente el parámetro `IndexName` en los parámetros de los comandos `QueryCommand` y `ScanCommand` cuando se haya seleccionado un GSI.
4. **Interfaz de Usuario (UI)**:
   - Se agregará un selector desplegable (`<Select>`) en la sección de constructores de consultas (junto a los radio buttons de Scan/Query) donde el usuario pueda elegir entre "Base Table" y los GSIs descubiertos en los esquemas de la tabla (desde `tableDetails.GlobalSecondaryIndexes`).
   - Se limpiará el estado `selectedIndexName` al cambiar entre diferentes tablas para prevenir estados de error con índices no existentes.

## 3. Plan de Pruebas
- Pruebas unitarias de tipado/lint mediante `tsc` y `eslint`.
- Pruebas E2E (Playwright) que aseguren la renderización correcta del select de GSIs y validen que cambiar el índice re-renderice correctamente las columnas basándose en el esquema del nuevo índice.