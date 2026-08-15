# RFC: Native Cognito User Pools View

## Context
Floci Studio aims to be a comprehensive local AWS emulating cockpit. Currently, Cognito is only supported as a 'compat' view using the dynamic CLI generator. However, given its central role in user authentication and identity, bringing Cognito into a 'native' SDK-powered, real-time GUI view adds huge value. It removes developer friction by enabling direct CRUD operations on User Pools instead of relying on generic JSON views.

## Proposal
Implement a native UI for Cognito User Pools (`@aws-sdk/client-cognito-identity-provider`) within Floci Studio.

## Architecture & Integration (Standard Library First, Zero-Dependency Core)
- **Frontend Integration**:
  - Install `@aws-sdk/client-cognito-identity-provider`.
  - Add the `CognitoIdentityProviderClient` directly to `AwsContext.tsx` following the existing factory pattern.
  - Create a new lazy-loaded React component: `src/views/CognitoView.tsx`.
  - Route `/cognito` to the native view in `src/App.tsx`, replacing the previous `AwsCliServiceView` generic fallback.
  - Update `src/components/CapabilityMatrix.tsx` and `mcp/floci_backend/application/compatibility_service.py` to upgrade the view type from `compat` to `native`, leaving `aws_resource_catalog.py` untouched to preserve MCP capabilities.
- **Backend Compatibility**:
  - The Python backend will continue handling generic local API emulation and MCP capabilities, relying on the LocalStack endpoints. The new frontend component will securely utilize `AwsContext` avoiding heavy third-party React libraries, adhering to the "Zero-Dependency" principle for the core domain.
- **Features**: List User Pools, Create User Pool, Delete User Pool.

## Execution Plan
1. Add `@aws-sdk/client-cognito-identity-provider` dependency.
2. Update backend compatibility metadata (`mcp/floci_backend/application/compatibility_service.py`) to remove cognito from generic views.
3. Update `src/components/CapabilityMatrix.tsx` to set cognito to `native`.
4. Update `src/contexts/AwsContext.tsx` to instantiate and expose the Cognito client.
5. Create `src/views/CognitoView.tsx` with List/Create/Delete capabilities for User Pools.
6. Update `src/App.tsx` routing.
7. Run all tests to ensure zero regressions.
