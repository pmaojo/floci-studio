1. **Analisis**
  * Competencia ofrece una UI completa para API Gateway, permitiendo la gestion de REST APIs localmente.
  * Floci actualmente lo maneja a traves de 'compat' (Sidecar Routed, compatibilidad local persistente) sin una interfaz de usuario especializada, solo vista tabular estandar generica de 'AwsCliServiceView'.
  * Vamos a promover API Gateway de 'compat' a 'native', implementando un CRUD basico para APIs REST usando el SDK oficial de AWS (`@aws-sdk/client-api-gateway`).

2. **Backend (MCP / Floci Backend)**
  * Quitar 'apigateway' del diccionario `GENERIC_COMPATIBILITY_CATALOG` en `mcp/floci_backend/application/compatibility_service.py`
  * Dejar `mcp/floci_backend/application/aws_resource_catalog.py` como esta, para no romper CLI / MCP AI tools, de acuerdo a la directriz.
  * Anyadi a boto_factory/hybrid/drift o solo el catalog.

3. **Frontend: Registro**
  * Cambiar `type: 'compat'` a `type: 'native'` para 'apigateway' en `src/components/CapabilityMatrix.tsx`.
  * Instanciar `APIGatewayClient` en `src/contexts/AwsContext.tsx`.

4. **Frontend: UI (ApiGatewayView.tsx)**
  * Crear `src/views/ApiGatewayView.tsx` para mostrar la lista de REST APIs, con boton para crear/borrar, siguiendo los patrones de Floci (PageHeader, Card, Table, Skeleton, logActivity).
  * Crear la ruta correspondiente en `src/App.tsx`.

5. **Pruebas (Pre-commit)**
  * Correr tests (E2E si aplica, lint) y pre commit.
