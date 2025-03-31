import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_DELETE_PROJECT,
    TOOL_DESCRIPTION_DELETE_PROJECT,
    TOOL_PARAMS_DELETE_PROJECT
} from "./memoryBankDeleteProjectParams.js";
import { ProjectService } from "../services/index.js";
import { logger } from "../utils/index.js";

// Define the type for the arguments based on the Zod schema
type DeleteProjectArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_DELETE_PROJECT>>;

/**
 * Registers the memoryBank_deleteProject tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param projectService - An instance of the ProjectService.
 */
export const memoryBankDeleteProjectTool = (
    server: McpServer,
    projectService: ProjectService // Inject ProjectService
): void => {

    const processDeleteProjectRequest = async (args: DeleteProjectArgs) => {
        logger.debug(`Received ${TOOL_NAME_DELETE_PROJECT} request with args:`, args);
        try {
            // Input validation is handled by Zod schema linked to server.tool

            // Call the service method
            const success = await projectService.deleteProject(args.projectId);

            // Format the successful output for MCP
            // The service returns boolean, but we always return the same message on success
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ success: true, message: "Project deleted." })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_DELETE_PROJECT}:`, error);

            // Re-throw known McpErrors (like InvalidParams for not found)
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_DELETE_PROJECT}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_DELETE_PROJECT,
        TOOL_DESCRIPTION_DELETE_PROJECT,
        TOOL_PARAMS_DELETE_PROJECT, // Pass the Zod schema object directly
        processDeleteProjectRequest
    );

    logger.info(`Tool registered: ${TOOL_NAME_DELETE_PROJECT}`);
};
