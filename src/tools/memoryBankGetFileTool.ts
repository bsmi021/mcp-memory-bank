import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_GET_FILE,
    TOOL_DESCRIPTION_GET_FILE,
    TOOL_PARAMS_GET_FILE
} from "./memoryBankGetFileParams.js";
import { MemoryBankService } from "../services/index.js"; // Use MemoryBankService
import { logger } from "../utils/index.js";

// Define the type for the arguments based on the Zod schema
type GetFileArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_GET_FILE>>;

/**
 * Registers the memoryBank_getFile tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param memoryBankService - An instance of the MemoryBankService.
 */
export const memoryBankGetFileTool = (
    server: McpServer,
    memoryBankService: MemoryBankService // Inject MemoryBankService
): void => {

    const processGetFileRequest = async (args: GetFileArgs) => {
        logger.debug(`Received ${TOOL_NAME_GET_FILE} request`, { args });
        try {
            // Input validation is handled by Zod schema linked to server.tool

            // Call the service method
            const fileContent = await memoryBankService.getFileContent(args.projectId, args.fileName);

            // Format the successful output for MCP - just the raw text content
            return {
                content: [{
                    type: "text" as const,
                    text: fileContent
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_GET_FILE}`, error, { args });

            // Re-throw known McpErrors (like InvalidParams for not found project/file)
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues (e.g., DB read failure, reconstruction error)
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_GET_FILE}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_GET_FILE,
        TOOL_DESCRIPTION_GET_FILE,
        TOOL_PARAMS_GET_FILE, // Pass the Zod schema object directly
        processGetFileRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME_GET_FILE });
};
