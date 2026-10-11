# RFC: Vista Nativa e Interactiva de API Gateway

## 1. Resumen
Este documento detalla la integración de una vista nativa y una herramienta MCP para el servicio AWS API Gateway dentro de Floci Studio. La característica permitirá a los desarrolladores y agentes de IA interactuar directamente con recursos de API Gateway (REST APIs, Recursos, Métodos) a través del emulador local (LocalStack), reemplazando la actual vista de compatibilidad (basada en almacenamiento JSON) por una integración completa usando el SDK nativo de AWS.

## 2. Propuesta de Valor y Análisis Competitivo
Al analizar el ecosistema de emulación local (LocalStack Web, Commandeer, etc.), las herramientas existentes a menudo presentan interfaces estáticas o requieren múltiples pasos de configuración para simplemente inspeccionar la configuración de un API Gateway local.
El valor diferencial de Floci Studio radica en ofrecer un **Cockpit Visual Unificado y Conectividad IA-Nativa**.
Añadiendo soporte nativo para API Gateway en Floci Studio:
1. **Desarrollo sin Fricción:** Los desarrolladores pueden visualizar, en tiempo real, las rutas y métodos de las APIs levantadas localmente, verificar la estructura sin ejecutar comandos de la CLI.
2. **Capacidades IA-Nativas:** Agentes MCP (como Claude o Cursor) podrán explorar la estructura del API Gateway, lo que resulta invaluable para orquestar o hacer depuración de microservicios locales mediante prompts naturales.

## 3. Arquitectura y Diseño Técnico
Alineado con los principios de Floci Studio ("Standard Library First", "Zero-Dependency" para lógica core, "Vertical Slicing"):

*   **Frontend (Vertical Slice en `src/views/APIGatewayView.tsx`):**
    *   Se instalará `@aws-sdk/client-api-gateway` para conexión directa desde el navegador (Browser-Direct).
    *   Se implementará un componente que use hooks de React para consultar `GetRestApisCommand` y, para cada API, `GetResourcesCommand`.
    *   Se integrará en la matriz de capacidades (`CapabilityMatrix.tsx`) como un servicio "Nativo", destacando el avance del nivel de soporte.

*   **Backend (Python/FastAPI & MCP):**
    *   **Compatibilidad:** Se removerá `apigateway` del `GENERIC_COMPATIBILITY_CATALOG` (`mcp/floci_backend/application/compatibility_service.py`), delegando el control directo.
    *   **Herramienta MCP:** Se creará un nuevo módulo `mcp/tools/apigateway.py`. Este módulo usará `make_client('apigateway')` de la factoría `boto_factory` para comunicarse con la instancia local de LocalStack. Expondrá una función `@mcp.tool()` (ej. `apigateway_get_rest_apis`) para consultar las APIs, registrándose en `mcp/floci_mcp.py`.

## 4. Plan de Implementación
1.  **Frontend:** Actualizar `package.json`, `CapabilityMatrix.tsx`, y `AwsContext.tsx`. Crear `APIGatewayView.tsx` e integrarlo en el enrutador (`App.tsx`).
2.  **Backend:** Ajustar `compatibility_service.py`. Crear herramienta `apigateway.py` y registrarla.
3.  **Verificación:** Pruebas visuales con Playwright e integración y validación de endpoints y herramientas MCP con el framework de test.
