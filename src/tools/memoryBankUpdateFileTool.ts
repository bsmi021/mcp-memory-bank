import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_UPDATE_FILE,
    TOOL_DESCRIPTION_UPDATE_FILE,
    TOOL_PARAMS_UPDATE_FILE
} from "./memoryBankUpdateFileParams.js";
import { MemoryBankService } from "../services/index.js"; // Use MemoryBankService
import { logger } from "../utils/index.js";

// Define the type for the arguments based on the Zod schema
type UpdateFileArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_UPDATE_FILE>>;

/**
 * Registers the memoryBank_updateFile tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param memoryBankService - An instance of the MemoryBankService.
 */
export const memoryBankUpdateFileTool = (
    server: McpServer,
    memoryBankService: MemoryBankService // Inject MemoryBankService
): void => {

    const processUpdateFileRequest = async (args: UpdateFileArgs) => {
        logger.debug(`Received ${TOOL_NAME_UPDATE_FILE} request`, { args });
        try {
            // Input validation is handled by Zod schema linked to server.tool

            // Call the service method
            // Note: The service method doesn't return anything on success, it throws on error.
            await memoryBankService.updateFileContent(args.projectId, args.fileName, args.content);

            // Format the successful output for MCP
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ success: true, message: "File content updated." })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_UPDATE_FILE}`, error, { args });

            // Re-throw known McpErrors (like InvalidParams for not found project or content issues)
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues (e.g., embedding failure, DB write failure)
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_UPDATE_FILE}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_UPDATE_FILE,
        TOOL_DESCRIPTION_UPDATE_FILE,
        TOOL_PARAMS_UPDATE_FILE, // Pass the Zod schema object directly
        processUpdateFileRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME_UPDATE_FILE });
};
