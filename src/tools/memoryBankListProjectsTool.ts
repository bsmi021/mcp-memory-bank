import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    TOOL_NAME_LIST_PROJECTS,
    TOOL_DESCRIPTION_LIST_PROJECTS,
    TOOL_PARAMS_LIST_PROJECTS
} from "./memoryBankListProjectsParams.js";
import { ProjectService } from "../services/index.js";
import { logger } from "../utils/index.js";

// No arguments for this tool
type ListProjectsArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_LIST_PROJECTS>>;

/**
 * Registers the memoryBank_listProjects tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param projectService - An instance of the ProjectService.
 */
export const memoryBankListProjectsTool = (
    server: McpServer,
    projectService: ProjectService // Inject ProjectService
): void => {

    const processListProjectsRequest = async (args: ListProjectsArgs) => {
        logger.debug(`Received ${TOOL_NAME_LIST_PROJECTS} request`, { args }); // Add args context
        try {
            // No input args to validate beyond the empty schema

            // Call the service method
            const projects = await projectService.listProjects();

            // Format the successful output for MCP
            // Map the full Project objects from the service to the simpler output structure
            const outputProjects = projects.map(p => ({
                projectId: p.projectId,
                projectName: p.projectName
            }));

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ projects: outputProjects })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_LIST_PROJECTS}`, error, { args }); // Add args context

            // Re-throw known McpErrors
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_LIST_PROJECTS}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_LIST_PROJECTS,
        TOOL_DESCRIPTION_LIST_PROJECTS,
        TOOL_PARAMS_LIST_PROJECTS, // Pass the Zod schema object directly
        processListProjectsRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME_LIST_PROJECTS });
};
