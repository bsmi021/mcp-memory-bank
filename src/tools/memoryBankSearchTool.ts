import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_SEARCH,
    TOOL_DESCRIPTION_SEARCH,
    TOOL_PARAMS_SEARCH
} from "./memoryBankSearchParams.js";
import { SearchService } from "../services/index.js"; // Use SearchService
import { logger } from "../utils/index.js";

// Define the type for the arguments based on the Zod schema
type SearchArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_SEARCH>>;

/**
 * Registers the memoryBank_search tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param searchService - An instance of the SearchService.
 */
export const memoryBankSearchTool = (
    server: McpServer,
    searchService: SearchService // Inject SearchService
): void => {

    const processSearchRequest = async (args: SearchArgs) => {
        logger.debug(`Received ${TOOL_NAME_SEARCH} request`, { args });
        try {
            // Input validation is handled by Zod schema linked to server.tool
            // Default values for searchType and topK are also handled by Zod

            // Call the service method
            const searchResults = await searchService.search(
                args.projectId,
                args.query,
                args.searchType, // Pass validated/defaulted value
                args.topK,       // Pass validated/defaulted value
                args.fileFilter  // Pass optional value
            );

            // Format the successful output for MCP
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ results: searchResults })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_SEARCH}`, error, { args });

            // Re-throw known McpErrors (like InvalidParams for not found project)
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues (e.g., embedding failure, DB query failure)
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_SEARCH}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_SEARCH,
        TOOL_DESCRIPTION_SEARCH,
        TOOL_PARAMS_SEARCH, // Pass the Zod schema object directly
        processSearchRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME_SEARCH });
};
