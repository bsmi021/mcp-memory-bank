import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConfigurationManager } from "./config/ConfigurationManager.js";
import { registerTools } from "./tools/index.js";
import { logger } from "./utils/index.js";

/**
 * Creates and configures an MCP server instance.
 * This is the central function for server creation and tool registration.
 * @returns {McpServer} The configured MCP server instance
 */
export function createServer(): McpServer {
    logger.info("Creating MCP server instance"); // Removed trailing ...

    // Initialize the server
    const server = new McpServer({
        name: "mcp-memory-bank-server",
        version: "0.1.0", // Start at 0.1.0 as per docs
        description: "MCP Server for managing persistent Memory Banks with semantic search capabilities."
    });

    // Get configuration
    const configManager = ConfigurationManager.getInstance();

    // Register all tools
    registerTools(server);

    logger.info("MCP server instance created successfully"); // Removed trailing .
    return server;
}
