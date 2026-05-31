# Floci Studio — Explore

Survey the full state of the local Floci Studio environment using the MCP tools.

## Steps

1. Call `check_floci_health` — confirm the backend and AWS emulator are reachable. Stop and report clearly if health fails.
2. Call `list_aws_services` — get a summary of all emulated AWS services and which ones have resources.
3. For each service that has resources (count > 0), call `get_service_resources` with the service key.
4. Call `get_network_topology` — capture inter-service connections and Docker networks.
5. Optionally call `get_cost_forecast` — show estimated local resource usage.

## Output format

Present results as a single markdown report:
- **Health** status line (backend + AWS emulator)
- **Services** table: service name | resource count | key resources (names/IDs)
- **Topology** section: list connections found
- **Summary** in 2-3 sentences: what's running, what's empty, any anomalies

Keep it scannable. Use `✓` / `✗` for status indicators.
