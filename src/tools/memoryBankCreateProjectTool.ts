import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_CREATE_PROJECT,
    TOOL_DESCRIPTION_CREATE_PROJECT,
    TOOL_PARAMS_CREATE_PROJECT
} from "./memoryBankCreateProjectParams.js";
import { ProjectService } from "../services/index.js";
import { logger } from "../utils/index.js";

// Define the type for the arguments based on the Zod schema
type CreateProjectArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_CREATE_PROJECT>>;

/**
 * Registers the memoryBank_createProject tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param projectService - An instance of the ProjectService.
 */
export const memoryBankCreateProjectTool = (
    server: McpServer,
    projectService: ProjectService // Inject ProjectService
): void => {

    const processCreateProjectRequest = async (args: CreateProjectArgs) => {
        logger.debug(`Received ${TOOL_NAME_CREATE_PROJECT} request`, { args });
        try {
            // Input validation is handled by Zod schema linked to server.tool

            // Call the service method
            const newProject = await projectService.createProject(args.projectName);

            // Format the successful output for MCP
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ projectId: newProject.projectId })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_CREATE_PROJECT}`, error, { args });

            // Map known errors (like ResourceConflict from service) or re-throw McpErrors
            if (error instanceof McpError) {
                // If the service threw a specific McpError (like ResourceConflict mapped to InvalidParams), re-throw it
                throw error;
            }

            // Generic internal error for unexpected issues
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_CREATE_PROJECT}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_CREATE_PROJECT,
        TOOL_DESCRIPTION_CREATE_PROJECT,
        TOOL_PARAMS_CREATE_PROJECT, // Pass the Zod schema object directly
        processCreateProjectRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME_CREATE_PROJECT });
};
