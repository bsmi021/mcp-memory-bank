import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_DELETE_FILE,
    TOOL_DESCRIPTION_DELETE_FILE,
    TOOL_PARAMS_DELETE_FILE
} from "./memoryBankDeleteFileParams.js";
import { MemoryBankService } from "../services/index.js"; // Use MemoryBankService
import { logger } from "../utils/index.js";

// Define the type for the arguments based on the Zod schema
type DeleteFileArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_DELETE_FILE>>;

/**
 * Registers the memoryBank_deleteFile tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param memoryBankService - An instance of the MemoryBankService.
 */
export const memoryBankDeleteFileTool = (
    server: McpServer,
    memoryBankService: MemoryBankService // Inject MemoryBankService
): void => {

    const processDeleteFileRequest = async (args: DeleteFileArgs) => {
        logger.debug(`Received ${TOOL_NAME_DELETE_FILE} request for file '${args.fileName}' in project '${args.projectId}'`);
        try {
            // Input validation is handled by Zod schema linked to server.tool

            // Call the service method
            const success = await memoryBankService.deleteFileContent(args.projectId, args.fileName);

            // Format the successful output for MCP (service returns boolean, but tool is idempotent)
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ success: true, message: "File content deleted." })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_DELETE_FILE} for file '${args.fileName}':`, error);

            // Re-throw known McpErrors (like InvalidParams for not found project)
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues (e.g., DB write failure)
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_DELETE_FILE}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_DELETE_FILE,
        TOOL_DESCRIPTION_DELETE_FILE,
        TOOL_PARAMS_DELETE_FILE, // Pass the Zod schema object directly
        processDeleteFileRequest
    );

    logger.info(`Tool registered: ${TOOL_NAME_DELETE_FILE}`);
};
