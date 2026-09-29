# RFC: Gestión Nativa de Amazon Cognito (User Pools y Usuarios) en Floci Studio

## 1. Análisis Competitivo
* **Floci Studio Actual**: Proporciona un emulador AWS local muy completo, pero el servicio de Cognito se gestiona a través de una vista genérica de compatibilidad CLI (`AwsCliServiceView`). Esto obliga a los desarrolladores a utilizar la terminal o scripts externos para interactuar de forma granular con usuarios y grupos.
* **Competencia (LocalStack Web, Commandeer)**: Estas herramientas ofrecen interfaces visuales ricas para gestionar Cognito. Permiten explorar User Pools, crear App Clients, añadir y confirmar usuarios de prueba visualmente.
* **Oportunidad Estratégica**: Desarrollar una interfaz nativa de Cognito en Floci Studio aporta un gran valor diferencial. La autenticación es uno de los primeros componentes que los desarrolladores integran; tener un "Visual User Management" que funcione directamente contra el emulador LocalStack reduce la fricción y el cambio de contexto (zero context switches).

## 2. Propuesta de Valor y Viabilidad Técnica
Implementar una vista nativa (React + AWS SDK) para **Cognito Identity Provider**.
* **Valor**: Permite a los desarrolladores crear Pools, gestionar clientes OAuth/App Clients y administrar el ciclo de vida de los usuarios (crear, confirmar, eliminar) desde la interfaz gráfica sin coste.
* **Viabilidad**: El SDK oficial `@aws-sdk/client-cognito-identity-provider` se integrará en el SPA y se comunicará directamente con LocalStack en el puerto `4566`.

## 3. Arquitectura y Diseño (Vertical Slicing / Zero-Dependency)
* **Frontend (React SPA)**:
  * Instalación del cliente `@aws-sdk/client-cognito-identity-provider` (Standard Library approach para interactuar con AWS).
  * Nuevo contexto en `AwsContext.tsx` que instancie el cliente apuntando al endpoint local.
  * Nuevo componente `CognitoView.tsx` (Vertical Slice) que centralice el estado de los User Pools, Clients y Usuarios.
* **Backend (FastAPI)**:
  * Eliminar la definición `compat` genérica de Cognito en `compatibility_service.py` y `aws_resource_catalog.py`.
* **MCP Server**:
  * (Opcional) Proveer herramienta básica en `mcp/tools/cognito.py` para permitir al agente listar y crear pools de Cognito.

## 4. Plan de Ejecución
1. Actualizar `package.json` instalando el SDK de Cognito.
2. Limpiar `compatibility_service.py` eliminando referencias a Cognito.
3. Actualizar `CapabilityMatrix.tsx` marcando Cognito como `native`.
4. Instanciar el cliente en `AwsContext.tsx`.
5. Implementar `src/views/CognitoView.tsx` con operaciones CRUD.
6. Registrar la ruta en `src/App.tsx`.
7. Crear prueba E2E en Playwright.
