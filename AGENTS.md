# Floci Studio - AI Agent Directives & Instructions

Welcome, AI Agent. When working on this repository, you must strictly adhere to the following rules, architecture guidelines, and commands.

## 1. Terminology Directive
- **ALWAYS** refer to the project as **'Floci Studio'** (never 'Floci.io' or 'Floci').
- Refer to its MCP server specifically as **'Floci Studio MCP'**.
- Ensure all documentation, commit messages, and outputs adhere to this exact naming convention.

## 2. Project Architecture
- **Frontend**: A Vite React Single Page Application (SPA) that proxies `/api` requests to the backend.
- **Backend**: A unified Python FastAPI backend located in `mcp/floci_backend/` (running on port 8000). It completely replaces any legacy Node.js/TypeScript sidecar.
- **MCP Server**: The Python backend also functions as an MCP (Model Context Protocol) server (`mcp/floci_mcp.py`). The MCP server uses `httpx.ASGITransport(app=app)` to communicate directly with the FastAPI application in-memory, avoiding local network round-trips.
- **Floci Studio Engine**: Acts as a local, cost-free AWS emulator and development environment leveraging Localstack, Docker Compose recipes (Marketplace), and a native Python compatibility layer.

## 3. Tooling and Commands
- **Package Manager**: You MUST use **pnpm version 11** for frontend/Node package management.
- **Python Manager**: The project relies on **uv** for Python dependency management and environment isolation. Configuration is located at `mcp/pyproject.toml`.

### Setup Commands
- `pnpm install` (Node dependencies)
- `pnpm exec playwright install` (Playwright browsers for E2E tests)
- `uv sync --project mcp` (Python dependencies)

### Execution Commands (Run from repo root)
- **Frontend**: `pnpm run dev`
- **Backend**: `pnpm run sidecar:dev` (runs FastAPI via uvicorn)
- **E2E Tests**: `pnpm run test:e2e`
- **Linting**: `pnpm run lint` (TypeScript type checking)
- **MCP Test Harness**: `uv run --project mcp python mcp/verify_mcp.py`

## 4. Testing Guidelines
- Playwright E2E tests are located in the `.playwright-mcp/` directory.
- They are configured to run locally without Docker by concurrently starting the frontend and backend via `pnpm run sidecar:dev & pnpm run dev`.

## 5. Marketplace Recipes (Docker Compose)
- Recipes are located in the `recipes/` directory. Each recipe subdirectory typically contains a `docker-compose.yml`, a `recipe.json` for metadata/variables, and a `README.md`.
- **Variable Matching**: The variable keys defined in a `recipe.json` file MUST exactly match the environment variable names used in the corresponding `docker-compose.yml`. Any mismatch will cause user-provided values to be ignored.
- **Interpolation**: Configuration values (like ports and credentials) must use `{{VARIABLE}}` interpolation syntax for dynamic frontend injection.
- **Volumes**: Docker volumes must be configured as local folders relative to the recipe directory (e.g., `./data`) to ensure state isolation and portability.
- **Verification Cleanup**: When verifying Docker Compose recipes locally, ALWAYS run `docker compose down` after a successful `docker compose up -d` to clean up containers and prevent background resource consumption.

## 6. MCP Capabilities
- Floci Studio's MCP capabilities include: local AWS IaC generation (Terraform via boto3), intelligent data seeding (Postgres/LocalStack via asyncpg and Faker), Docker network topology mapping, AWS CLI proxying, and Playwright UI test inspection.

## 7. Documentation Directive
- All project documentation (such as `README.md` files) must be written accurately, comprehensively, and entirely in **English**. Ensure that all architectural features and capabilities are explicitly detailed.

## 8. Workflow Directive
- Enter deep planning mode before making changes. Clarify all requirements by asking questions if anything is ambiguous.
- Once assumptions are fully verified, outline the approach.
- After plan approval, execute autonomously without asking further confirmation.
