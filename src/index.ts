#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { client, v2 } from "@datadog/datadog-api-client";
import { getDatadogConfig } from "./config.js";
import { debugLog } from "./logger.js";


// Initialize Datadog client with credentials
const datadogConfig = getDatadogConfig();
const configuration = client.createConfiguration({
  authMethods: {
    apiKeyAuth: datadogConfig.apiKey,
    appKeyAuth: datadogConfig.appKey
  }
});

const server = new Server(
  {
    name: "ProdSync MCP Server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// handler that lists available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_logs",
        description: "Gets logs filtered by service name, severity level, and environment within a specified time range.",
        inputSchema: {
          type: "object",
          properties: {
            service: {
              type: "string",
              description: "Name of the service to get logs for"
            },
            severity: {
              type: "string",
              description: "Severity of the logs to get (Error, Warn, Info). Default: Error",
              enum: ["Error", "Warn", "Info"]
            },
            env: {
              type: "string",
              description: "Environment to get logs from (int, personal-dev, dev, prod)",
              enum: ["int", "personal-dev", "dev", "prod"]
            },
            lookback_minutes: {
              type: "integer",
              description: "Number of minutes to look back from now. Default: 60. Examples: 60, 30, 15"
            },
            start_time_iso: {
              type: "string",
              description: "Start time in ISO format (YYYY-MM-DD HH:MM:SS). Leave empty to use lookback_minutes"
            },
            end_time_iso: {
              type: "string",
              description: "End time in ISO format (YYYY-MM-DD HH:MM:SS). Leave empty to default to current time"
            },
            limit: {
              type: "integer",
              description: "Maximum number of logs to return. Default: 20"
            }
          },
          required: ["service", "severity", "env"]
        }
      }
    ]
  };
});

// handler that calls a tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_logs": {
      const service = String(request.params.arguments?.service);
      const severity = String(request.params.arguments?.severity);
      const env = String(request.params.arguments?.env);
      const lookbackMinutes = request.params.arguments?.lookback_minutes ? Number(request.params.arguments.lookback_minutes) : 60;
      const startTimeIso = request.params.arguments?.start_time_iso ? String(request.params.arguments.start_time_iso) : undefined;
      const endTimeIso = request.params.arguments?.end_time_iso ? String(request.params.arguments.end_time_iso) : undefined;
      const limit = request.params.arguments?.limit ? Number(request.params.arguments.limit) : 20;

      if (!service || !env) {
        throw new Error("Service and Env are required. \n Name of the service to get logs for \n Environment to get logs from (int, personal-dev, dev, prod)");
      }

      // Calculate time range
      const endTime = endTimeIso ? new Date(endTimeIso) : new Date();
      const startTime = startTimeIso 
        ? new Date(startTimeIso)
        : new Date(endTime.getTime() - lookbackMinutes * 60 * 1000);

      debugLog(`Querying Datadog with client config: ${JSON.stringify(configuration, null, 2)}`);
      const apiInstance = new v2.LogsApi(configuration);

      // Map severity to Datadog status (lowercase)
      const severityMap: Record<string, string> = { Error: "error", Warn: "warn", Info: "info" };
      const ddSeverity = severityMap[severity] || "error";

      // Prepare query
      const query = `service:${service} AND status:${ddSeverity} AND env:${env}`;

      try {
        debugLog(`Querying Datadog: ${query} | from: ${startTime.toISOString()} | to: ${endTime.toISOString()}`);
        const response = await apiInstance.listLogs({
          body: {
            filter: {
              query,
              from: startTime.toISOString(),
              to: endTime.toISOString(),
            },
            page: {
              limit,
            },
          }
        });
        debugLog(`Datadog response: ${JSON.stringify(response.data, null, 2)}`);

        const simplifiedLogs = (response.data ?? []).map((log: any) => ({
          // Error Information
          status: log.attributes?.status,
          message: log.attributes?.msg || log.attributes?.message,
          error: log.attributes?.attributes?.error || "No error details available",

          // Service Components and Cadence
          activityType: log.attributes?.attributes?.ActivityType,
          workflowId: log.attributes?.attributes?.WorkflowID,
          taskList: log.attributes?.attributes?.TaskList,
          workerId: log.attributes?.attributes?.WorkerID,
          timestamp: log.attributes?.timestamp,
          domain: log.attributes?.attributes?.Domain,
          runId: log.attributes?.attributes?.RunID,

          // Infrastructure
          host: log.attributes?.host,
          hostname: log.attributes?.attributes?.hostname,

          // Additional Debugging Information
          caller: log.attributes?.attributes?.caller,
          stacktrace: log.attributes?.attributes?.stacktrace
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(simplifiedLogs, null, 2)
          }]
        };
      } catch (error: unknown) {
        debugLog(`Datadog error: ${error instanceof Error ? error.message : String(error)}`);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(`Failed to fetch logs: ${errorMessage}`);
      }
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
