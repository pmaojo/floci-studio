# Phase 1: Análisis Competitivo

## 1. Analiza a fondo la URL proporcionada para comprender la propuesta de valor
Floci Studio se posiciona como el "Ultimate Local AWS Cockpit & Marketplace". Ofrece un emulador AWS local (vía LocalStack) integrado con una interfaz visual para 36 servicios nativos de AWS, un servidor MCP (Model Context Protocol) para agentes de IA y un Marketplace para desplegar recetas (Docker Compose) de bases de datos, brokers, etc. En esencia, provee de herramientas para que los desarrolladores puedan probar y explorar visualmente una simulación en local de su entorno AWS, a coste cero.

## 2. Investiga herramientas de la competencia
- **LocalStack Web UI:** Ofrece exploración visual de servicios simulados, pero a menudo se siente algo tosca o desconectada de un flujo de desarrollo local ágil, limitándose a exploración de recursos.
- **Commandeer:** Es una GUI de escritorio muy rica para servicios cloud (AWS, LocalStack), que incluye características avanzadas como visualización ER, modelado de bases de datos, y explorador S3 y DynamoDB avanzados, pero no está integrada con MCP / agentes AI.
- **NoSQL Workbench para Amazon DynamoDB:** Permite visualización de modelos de datos NoSQL, ejecución de consultas (Scan, Query) complejas usando GUI, y más notablemente: **Editor interactivo de consultas PartiQL**.

## 3. Identifica una (1) característica de alto valor estratégico
**Característica:** PartiQL (SQL-compatible query language) Editor and Runner para DynamoDB.
- **Valor diferencial:** Actualmente, Floci Studio tiene una vista de DynamoDB que incluye ver el esquema, las acciones (Truncate) y los ítems a través de scans/queries básicos (con editor visual de payload JSON). Sin embargo, herramientas como NoSQL Workbench permiten a los usuarios interactuar con DynamoDB utilizando sentencias SQL estándar (PartiQL), lo cual acelera enormemente la adopción, consulta y análisis de datos en local. Añadir una consola interactiva (Runner) para PartiQL proporciona a Floci Studio una característica de tipo empresarial, muy demandada y en perfecta alineación con la mentalidad de "desarrollador-primero".
- **Viabilidad Técnica:** DynamoDB y LocalStack soportan `ExecuteStatement` (PartiQL). La SDK de AWS (`@aws-sdk/client-dynamodb` en frontend o boto3 en backend) expone este método de forma estándar. Podemos implementarlo como un nuevo Tab ('partiql') dentro de la vista `DynamoDBView.tsx`, que envíe el comando PartiQL directamente usando el cliente AWS del frontend (`ExecuteStatementCommand`).

# Phase 2: Diseño e Implementación

## 1. Documento de Diseño (RFC) - PartiQL Runner para DynamoDB
- **Objetivo:** Permitir a los usuarios ejecutar consultas PartiQL (SQL) contra las tablas locales de DynamoDB desde Floci Studio.
- **Valor:** Reduce la fricción de construir queries JSON complejas de DynamoDB, proporcionando una interfaz familiar (SQL) para leer, insertar o actualizar datos.
- **Integración y Arquitectura:**
  - Se modificará `src/views/DynamoDBView.tsx` añadiendo un nuevo tab "PartiQL Editor".
  - Se utilizará la filosofía "Standard Library First" y "Zero-Dependency", por lo que no se añadirán pesados editores de código (como Monaco o CodeMirror) a menos que ya estén en uso. Se empleará un componente `textarea` estilizado con la estética "retro-premium" / de terminal de Floci.
  - La ejecución será directa desde el cliente nativo del frontend (`useAws()` -> `DynamoDBClient` -> `ExecuteStatementCommand`), manteniendo el diseño modular y sin depender del sidecar (FastAPI) innecesariamente para servicios "native".
  - La visualización de resultados utilizará un bloque JSON y/o una tabla si es posible tabularlo.

## 2. Plan de Implementación
1. **Frontend: DynamoDBView Tab**
   - Modificar `src/views/DynamoDBView.tsx` para agregar la pestaña 'partiql'.
   - Crear el componente `PartiQLEditor` (o embeberlo) con un área de texto y un botón "Run Query".
2. **Frontend: Ejecución de AWS SDK**
   - Importar `ExecuteStatementCommand` de `@aws-sdk/client-dynamodb`.
   - Capturar errores de sintaxis PartiQL de LocalStack y mostrarlos de forma estilizada en la UI.
3. **Frontend: Visualización de resultados**
   - Usar `unmarshall` (de `@aws-sdk/util-dynamodb`) para convertir los ítems devueltos al formato JSON regular de objetos y renderizarlos en un visor de resultados JSON read-only o reutilizar la representación JSON existente.
4. **Verificación / Pre-commit**
   - Ejecutar la batería de pruebas y pre-commit hooks según el `.cursorrules` / AI agents specs.
