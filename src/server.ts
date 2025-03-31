import { createServer } from "./createServer.js";
import { logger } from "./utils/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DatabaseService, EmbeddingService } from "./services/index.js"; // Import services
// import { WebSocketServerTransport } from "@modelcontextprotocol/sdk/server/ws.js"; // Example for WebSocket

const main = async () => {
    try {
        // Initialize core services first
        logger.info("Initializing core services...");
        const databaseService = DatabaseService.getInstance();
        const embeddingService = EmbeddingService.getInstance();
        await databaseService.initialize(); // Wait for DB connection/setup
        await embeddingService.initialize(); // Wait for model loading
        logger.info("Core services initialized.");

        // Now create the server (which instantiates other services and registers tools)
        const server = createServer();
        logger.info("Starting MCP server...");

        // Choose your transport
        const transport = new StdioServerTransport();
        // const transport = new WebSocketServerTransport({ port: 8080 }); // Example

        logger.info(`Connecting transport: ${transport}`);
        await server.connect(transport);

        logger.info("MCP Server connected and listening.");

    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1); // Exit if server fails to start
    }
};

main();
