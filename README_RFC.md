# RFC: Intelligent Data Seeder Studio (GUI)

## 1. Problem Statement
Competitors like Commandeer and NoSQL Workbench provide developers with tools to easily generate mock data (Data Seeding) to quickly test applications without manual insertion or writing scripts. Floci Studio currently has a powerful backend Data Seeder (`data_seeder.py` using `Faker`), but this feature is only exposed via the Model Context Protocol (MCP) to AI agents (`mcp/floci_mcp.py` -> `seed_mock_data` and `/api/extensions/seed-data`), leaving human developers without a native GUI for this crucial task.

## 2. Proposed Solution
Create a new visual component, **Intelligent Data Seeder Studio**, inside the Floci Studio UI. This view will provide a simple, form-based interface to invoke the existing `/api/extensions/seed-data` backend endpoint.
It enables developers to:
- Select the target datastore: PostgreSQL (Marketplace), DynamoDB, or S3.
- Specify the target name (table or bucket).
- Provide a connection string for PostgreSQL auto-schema deduction.
- Optionally override generation using a custom JSON schema mapped to Faker methods.

## 3. Architecture
- **Frontend**: A single, self-contained React component (`src/views/studio/DataSeederView.tsx`) using existing UI primitives (`PageHeader`, `Card`, `Input`, `Button`). No new dependencies.
- **Backend**: The feature re-uses the existing `POST /api/extensions/seed-data` route which delegates to the `DataSeeder` application service.
- **Integration**: The view is added to the React Router (`src/App.tsx`) and the Sidebar (`src/components/Sidebar.tsx`) under the "Studio Enterprise" category.

## 4. Value Proposition
This feature significantly improves developer experience by reducing friction when setting up local test environments, putting human developers on par with the capabilities already afforded to AI agents in Floci Studio.
