# ProdSync MCP Server

A custom Model Context Protocol (MCP) server that enables real-time access to Datadog logs filtered by service, severity, and environment. This server is designed to integrate with Claude Desktop and Cursor IDE, providing developers with production context directly in their workflow.

## Features
- Query Datadog logs by service, severity (Error, Warn, Info), and environment (int, personal-dev, dev, prod)
- Securely uses Datadog API and APP keys from environment variables
- Debug logging to file for troubleshooting

## Development

### 1. Install dependencies
```bash
npm install
```

### 2. Build the server
```bash
npm run build
```

### 3. Run in development mode (auto-rebuild)
```bash
npm run watch
```

### 4. Debugging
Debug logs are written to `logs/debug.log`.

### 5. MCP Inspector
To inspect and debug the MCP protocol:
```bash
npm run inspector
```

## Configuration to run locally

### Environment Variables
Create a `.env` file or export these variables in your shell:
```env
DATADOG_API_KEY=<your_datadog_api_key>
DATADOG_APP_KEY=<your_datadog_app_key>
```

## Integration with IDEs and AI chat applications

Add or update the MCP server section like below in respective json file location based on your setup:

### For local development (after executing "npm run build" atleast once on the project workspace):
```json
{
  "mcpServers": {
    "prodsync-mcp": {
      "command": "node",
      "args": [
        "/path/to/workspace/prodsync-mcp-server/build/index.js"
      ],
      "env": {
        "DATADOG_API_KEY": "<your_datadog_api_key>",
        "DATADOG_APP_KEY": "<your_datadog_app_key>"
      }
    }
  }
}
```

#### Claude Desktop
For MacOS, edit the config file at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

#### Cursor IDE
For MacOS, edit the config file at:
```
~/.cursor/mcp.json
```

---

For any issues, check `logs/debug.log` for troubleshooting information.
