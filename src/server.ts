import { createServer } from "./createServer.js";
import { logger } from "./utils/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DatabaseService, EmbeddingService } from "./services/index.js"; // Import services
// import { WebSocketServerTransport } from "@modelcontextprotocol/sdk/server/ws.js"; // Example for WebSocket

const main = async () => {
    try {
        // Initialize core services first
        logger.info("Initializing core services..."); // Keep as is, simple message
        const databaseService = DatabaseService.getInstance();
        const embeddingService = EmbeddingService.getInstance();
        await databaseService.initialize(); // Wait for DB connection/setup
        await embeddingService.initialize(); // Wait for model loading
        logger.info("Core services initialized"); // Keep as is, simple message

        // Now create the server (which instantiates other services and registers tools)
        const server = createServer();
        logger.info("Starting MCP server..."); // Keep as is, simple message

        // Choose your transport
        const transport = new StdioServerTransport();
        // const transport = new WebSocketServerTransport({ port: 8080 }); // Example

        // Update this log call
        logger.info("Connecting transport", { transportType: transport.constructor.name });
        await server.connect(transport);

        // Update this log call (remove period)
        logger.info("MCP Server connected and listening");

    } catch (error) {
        // Update this log call (remove colon, pass error correctly)
        logger.error("Failed to start server", error);
        process.exit(1); // Exit if server fails to start
    }
};

main();
