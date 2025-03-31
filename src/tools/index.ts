import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConfigurationManager } from "../config/ConfigurationManager.js";
import { logger } from "../utils/index.js";
import {
    ProjectService,
    MemoryBankService,
    SearchService,
    EmbeddingService, // Import new services
    DatabaseService   // Import new services
} from "../services/index.js"; // Import required services

// Import tool registration functions
// import { exampleTool } from "./exampleTool.js"; // Remove example
import { memoryBankCreateProjectTool } from "./memoryBankCreateProjectTool.js";
import { memoryBankDeleteProjectTool } from "./memoryBankDeleteProjectTool.js";
import { memoryBankListProjectsTool } from "./memoryBankListProjectsTool.js";
import { memoryBankUpdateFileTool } from "./memoryBankUpdateFileTool.js";
import { memoryBankGetFileTool } from "./memoryBankGetFileTool.js";
import { memoryBankListFilesTool } from "./memoryBankListFilesTool.js";
import { memoryBankDeleteFileTool } from "./memoryBankDeleteFileTool.js";
import { memoryBankSearchTool } from "./memoryBankSearchTool.js";
import { memoryBankGetProjectByNameTool } from "./memoryBankGetProjectByNameTool.js";
import { memoryBankInitializeProjectTool } from "./memoryBankInitializeProjectTool.js"; // Import the new tool
// import { yourTool } from "./yourTool.js"; // Add new tool imports here

/**
 * Register all defined tools with the MCP server instance.
 * This function centralizes tool registration logic.
 */
export function registerTools(server: McpServer): void {
    logger.info("Registering tools...");
    const configManager = ConfigurationManager.getInstance();

    // Instantiate services needed by tools
    // NOTE: Initialization (async) for DB/Embedding services happens at server start,
    // but we get the singleton instances here.
    const databaseService = DatabaseService.getInstance();
    const embeddingService = EmbeddingService.getInstance();
    const projectService = new ProjectService(databaseService); // Inject DatabaseService
    const memoryBankService = new MemoryBankService(projectService, databaseService, embeddingService); // Inject dependencies
    const searchService = new SearchService(projectService, databaseService, embeddingService); // Inject dependencies


    // Register each tool, passing necessary config or services
    // exampleTool(server, configManager.getExampleServiceConfig()); // Remove example
    memoryBankCreateProjectTool(server, projectService);
    memoryBankDeleteProjectTool(server, projectService);
    memoryBankListProjectsTool(server, projectService);
    memoryBankGetProjectByNameTool(server, projectService);
    memoryBankUpdateFileTool(server, memoryBankService); // Needs MemoryBankService
    memoryBankGetFileTool(server, memoryBankService);    // Needs MemoryBankService
    memoryBankListFilesTool(server, memoryBankService);  // Needs MemoryBankService
    memoryBankDeleteFileTool(server, memoryBankService); // Needs MemoryBankService
    memoryBankSearchTool(server, searchService);       // Needs SearchService
    memoryBankInitializeProjectTool(server, memoryBankService); // Register the new tool, needs MemoryBankService

    // yourTool(server, configManager.getYourServiceConfig()); // Add new tool registrations

    logger.info("All tools registered.");
}
