"""MCP Tools for AWS API Gateway."""
from mcp.server.fastmcp import FastMCP
from floci_backend.infrastructure.boto_factory import make_client

def register(mcp: FastMCP) -> None:
    """Register API Gateway tools with the MCP server."""

    @mcp.tool()
    def apigateway_get_rest_apis() -> str:
        """
        List all REST APIs in the local API Gateway.
        Use this tool to explore the defined API endpoints and configurations.
        """
        try:
            client = make_client("apigateway")
            response = client.get_rest_apis()
            items = response.get("items", [])

            if not items:
                return "No REST APIs found in API Gateway."

            result = ["API Gateway REST APIs:"]
            for api in items:
                api_id = api.get("id", "Unknown ID")
                name = api.get("name", "Unnamed")
                desc = api.get("description", "No description")
                created = api.get("createdDate", "Unknown date")
                result.append(f"- {name} ({api_id}): {desc} [Created: {created}]")

            return "\n".join(result)
        except Exception as e:
            return f"Error fetching REST APIs from API Gateway: {e!s}"

    @mcp.tool()
    def apigateway_get_resources(rest_api_id: str) -> str:
        """
        List resources (paths and methods) for a specific REST API.

        Args:
            rest_api_id: The ID of the REST API to query.
        """
        try:
            client = make_client("apigateway")
            response = client.get_resources(restApiId=rest_api_id)
            items = response.get("items", [])

            if not items:
                return f"No resources found for API {rest_api_id}."

            result = [f"Resources for API {rest_api_id}:"]
            for res in items:
                path = res.get("path", "/")
                methods = res.get("resourceMethods", {})
                method_list = ", ".join(methods.keys()) if methods else "None"
                result.append(f"- {path} (Methods: {method_list})")

            return "\n".join(result)
        except Exception as e:
            return f"Error fetching resources for API {rest_api_id}: {e!s}"
