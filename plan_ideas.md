# Phase 1: Competitive Analysis

## Analysis of Floci Studio
Floci Studio is a local AWS emulator and development environment designed to provide a rich visual GUI for working with simulated AWS services locally (via LocalStack). It also integrates strongly with MCP (Model Context Protocol), allowing AI agents to perform actions on these simulated resources. It offers "Marketplace" recipes via Docker Compose to spin up adjacent popular infrastructure (PostgreSQL, Redis, Minio, Ollama, etc.) pre-wired to the local mock environment. The overarching value proposition is testing, visually inspecting, and AI-assisted creation of AWS setups at zero cost and without rate limits.

## Competitive Research
Competitors include:
- **LocalStack Web UI**: Offers visual dashboards, resource browsers, API access, and Cloud Pods (state persistence/sharing).
- **Commandeer**: Desktop application that links to both real AWS and LocalStack. It features a wide range of service integrations, an ERD viewer for DynamoDB, and robust file management for S3.
- **NoSQL Workbench for Amazon DynamoDB**: Official AWS tool that provides visual data modeling, sample dataset generation, data querying, and schema building. Allows exporting/importing JSON/CSV datasets.
- **AWS Toolkit**: IDE integration allowing direct navigation of AWS services, direct Lambda invocations, and S3 file tree views.

## Selected Feature: DynamoDB Data Import/Export (CSV/JSON)
Currently, Floci Studio's DynamoDBView has a robust "Items Explorer" allowing users to scan/query and manage single items manually. However, populating a table with realistic data or backing up state for an AI agent's tests requires scripting.

**Proposed Feature:** Add an **Import/Export Data** function to the `DynamoDBView` UI. This allows developers to seamlessly download table contents as a JSON or CSV file, and bulk-upload JSON/CSV files into a table.
- **Why it adds value:** Emulation often requires "seed data" to be useful for testing or AI interactions. The official NoSQL Workbench has this, and LocalStack users frequently ask for ways to persist or migrate test data. With a JSON/CSV Import/Export tool directly in Floci's DynamoDB UI, developers can instantly share mock data scenarios, back up specific emulator states, and easily prepopulate tests.

# Phase 2: Design and Implementation

## 1. RFC: DynamoDB Import/Export

**Title:** Bulk Import & Export of Data for DynamoDB Tables

**Objective:** Enable developers to export all scanned items from a DynamoDB table into a standard JSON file (and optionally CSV), and to import items from a JSON file into the selected table.

**Architecture & Integration:**
1. **Frontend Integration:** Add "Import Data" and "Export Data" buttons in the `DynamoDBView` under the `Table Operations` tab (or within the `Items Explorer` header).
2. **Standard Library / Zero-Dependency Approach:** We will utilize standard web APIs for file download (Blob, URL.createObjectURL, anchor tag download) and upload (FileReader). The parsing of JSON will be done natively.
3. **AWS SDK Usage:** For import, we'll parse the file into a JSON array, convert each object to DynamoDB `AttributeValue` format using the existing `marshalItem` utility, and use the `@aws-sdk/client-dynamodb` `BatchWriteItemCommand` (or sequential `PutItemCommand`s depending on size/complexity, but `PutItem` is safer for simple zero-dependency loops if batch write limits complicate it). For export, we take the result of the `Scan` command and unmarshal it using `unmarshalItem`, then save to a file.

## 2. Implementation Steps

1. **Modify `src/views/DynamoDBView.tsx`:**
   - In the `Items Explorer` header (or a dedicated action bar), add an "Export to JSON" button.
   - Add an "Import from JSON" button that triggers a hidden file input.
2. **Implement Export Logic:**
   - Reuse existing items or execute a full table scan.
   - Convert `items` (which are already unmarshalled or can be re-scanned) to a JSON string.
   - Trigger download using DOM element.
3. **Implement Import Logic:**
   - Handle file selection.
   - Use `FileReader` to read the JSON file content.
   - Parse JSON.
   - For each item, `marshalItem` and call `PutItemCommand` (or use batch writing).
   - Display success/failure messages and refresh the table items.
