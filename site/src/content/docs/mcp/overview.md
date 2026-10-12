---
title: MCP Server
description: The Floci MCP server now lives in its own repository.
---

The Model Context Protocol server that used to ship inside Floci Studio is now
its own project: **[floci-mcp-unofficial](https://github.com/pmaojo/floci-mcp-unofficial)**.

It is multi-cloud (AWS, Azure, GCP and OCI), ships the same recipe catalog and
no longer depends on Studio. The repository has the install steps, the client
configuration for Claude and Cursor, and a
[searchable catalog of every tool and recipe](https://github.com/pmaojo/floci-mcp-unofficial/blob/main/docs/index.html).

Studio keeps its own backend and the Marketplace UI. If you used the MCP server
from this repository, move to the new one and keep the same `AWS_ENDPOINT_URL`.
