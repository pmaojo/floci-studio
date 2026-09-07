# RFC: truncate_dynamodb_table

## 1. Contexto

Floci Studio permite a los desarrolladores administrar visualmente bases de datos DynamoDB. Un flujo de trabajo común al depurar y probar integraciones de microservicios localmente es vaciar una tabla y volver a comenzar con un estado limpio, por ejemplo antes de ejecutar pruebas end-to-end o scripts de poblamiento de datos (`seeding`).

## 2. Propuesta de Valor

En el AWS real, DynamoDB no dispone de un comando nativo `TRUNCATE TABLE`. Los usuarios deben borrar y recrear la tabla (lo que toma tiempo e interrumpe flujos y configuraciones) o hacer un `Scan` de la tabla y eliminar los elementos individualmente.

Proveer esta característica "Truncate" en Floci Studio:
- **Acelera la iteración:** Un clic en la UI vacía la tabla rápidamente.
- **Mejora el flujo de trabajo de MCP:** Los agentes de IA ahora pueden llamar al tool `truncate_dynamodb_table` sin tener que escribir su propio bucle de scan-and-delete para reiniciar el estado de la base de datos de manera automatizada.

## 3. Arquitectura e Implementación Técnica

De acuerdo a la filosofía "Zero-Dependency", se ha extendido la herramienta MCP existente sin usar dependencias de terceros y utilizando solo la API estándar de Boto3:

1. **Frontend (Visual Cockpit):**
   - El componente `DynamoDBView.tsx` ya contiene una pestaña "Danger Zone" que ofrece un botón de "Truncate".
   - Al presionarlo, el SDK de JS hace un `Scan` para recolectar las claves primarias (Partition y Sort keys).
   - Realiza un bucle llamando a `DeleteItemCommand` sobre cada elemento, mostrando confirmaciones y logs usando el contexto de observabilidad.

2. **Backend (Integración MCP y Motor Local):**
   - En `mcp/tools/dynamodb.py`, se agrega un nuevo tool `@mcp.tool()` llamado `truncate_dynamodb_table(table: str)`.
   - El método resuelve dinámicamente el `KeySchema` de la tabla (usando `describe_table`), lo cual permite saber exactamente cuáles atributos forman la clave.
   - Aplica paginación iterativa (`LastEvaluatedKey`) durante el `scan` y aplica una `ProjectionExpression` para descargar solo la información de claves, minimizando la transferencia de datos.
   - Luego, los elementos obtenidos se borran llamando a `delete_item`.

Este método está completamente integrado con la spec de FastMCP y se probó mediante `mcp/verify_mcp.py`.
