# RFC: Integración de Editor PartiQL para DynamoDB en Floci Studio

## 1. Resumen
Este documento propone la implementación de un **Editor PartiQL** interactivo dentro del cockpit de **DynamoDB** en **Floci Studio**. PartiQL es un lenguaje de consultas compatible con SQL, soportado nativamente por AWS y LocalStack. Su incorporación elimina la fricción de escribir filtros JSON complejos para `Query` y `Scan`, permitiendo al desarrollador consultar datos de DynamoDB directamente usando sintaxis SQL familiar.

## 2. Propuesta de Valor y Análisis Competitivo
Al analizar herramientas del ecosistema como *NoSQL Workbench de AWS* y la consola nativa web de AWS, PartiQL es una de las características de mayor valor para los desarrolladores. Floci Studio actualmente ofrece un robusto explorador de ítems y esquema, pero depende enteramente de la interfaz gráfica para consultas. Incorporar PartiQL mejora dramáticamente la experiencia de usuario (DX), acelerando el diagnóstico local y validación de datos.

## 3. Alcance Técnico
La implementación respetará rigurosamente los principios de arquitectura de Floci Studio: **Standard Library First** y **Zero-Dependency**.

### 3.1. Frontend (React/Vite) - Arquitectura Modular
- **Componente**: Se ampliará `src/views/DynamoDBView.tsx` añadiendo un nuevo tab de estado `partiql` para la navegación a nivel de tabla.
- **SDK Nativo**: En lugar de depender de nuevas librerías o backends complejos, se utilizará directamente el comando `ExecuteStatementCommand` ya presente en el `@aws-sdk/client-dynamodb`. Esto mantiene la conexión directa con el emulador local.
- **UI**: Un editor simple basado en un `textarea` monospaced para la query, con soporte para mostrar los resultados a través del motor existente de `unmarshalItem` de `dynamodbUtils.ts`.

### 3.2. MCP Server (Python Backend) - Integración IA
Para mantener el alineamiento con el espíritu *AI-native* de Floci, la característica también se expondrá como una herramienta MCP.
- **Archivo**: `floci-mcp-unofficial: tools/dynamodb.py`.
- **Tool**: `@mcp.tool() async def execute_partiql_dynamodb(statement: str) -> dict`.
- **Integración Boto3**: Utilizará el proxy estandarizado `make_client("dynamodb").execute_statement(Statement=statement)`.

## 4. Criterios de Aceptación
1. El usuario debe poder navegar a una tabla DynamoDB y ver la pestaña "PartiQL".
2. Debe poder introducir una sentencia como `SELECT * FROM "mi_tabla" WHERE "pk" = '123'`.
3. Al ejecutar, los ítems retornados deben mostrarse correctamente parseados en la interfaz.
4. Los agentes de IA conectados vía MCP (como Claude o Cursor) deben poder ejecutar sentencias PartiQL utilizando la nueva tool de Python.
5. El servidor MCP y los test de UI/E2E locales deben pasar sin regresiones.
