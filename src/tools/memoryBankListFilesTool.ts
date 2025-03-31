import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_LIST_FILES,
    TOOL_DESCRIPTION_LIST_FILES,
    TOOL_PARAMS_LIST_FILES
} from "./memoryBankListFilesParams.js";
import { MemoryBankService } from "../services/index.js"; // Use MemoryBankService
import { logger } from "../utils/index.js";

// Define the type for the arguments based on the Zod schema
type ListFilesArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_LIST_FILES>>;

/**
 * Registers the memoryBank_listFiles tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param memoryBankService - An instance of the MemoryBankService.
 */
export const memoryBankListFilesTool = (
    server: McpServer,
    memoryBankService: MemoryBankService // Inject MemoryBankService
): void => {

    const processListFilesRequest = async (args: ListFilesArgs) => {
        logger.debug(`Received ${TOOL_NAME_LIST_FILES} request for project '${args.projectId}'`);
        try {
            // Input validation is handled by Zod schema linked to server.tool

            // Call the service method
            const fileNames = await memoryBankService.listFiles(args.projectId);

            // Format the successful output for MCP
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ files: fileNames })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_LIST_FILES} for project '${args.projectId}':`, error);

            // Re-throw known McpErrors (like InvalidParams for not found project)
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues (e.g., DB read failure)
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_LIST_FILES}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_LIST_FILES,
        TOOL_DESCRIPTION_LIST_FILES,
        TOOL_PARAMS_LIST_FILES, // Pass the Zod schema object directly
        processListFilesRequest
    );

    logger.info(`Tool registered: ${TOOL_NAME_LIST_FILES}`);
};
