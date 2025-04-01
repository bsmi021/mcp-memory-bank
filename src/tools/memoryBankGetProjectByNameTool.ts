import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    TOOL_NAME_GET_PROJECT_BY_NAME,
    TOOL_DESCRIPTION_GET_PROJECT_BY_NAME,
    TOOL_PARAMS_GET_PROJECT_BY_NAME,
    GetProjectByNameArgs
} from "./memoryBankGetProjectByNameParams.js";
import { ProjectService } from "../services/ProjectService.js";
import { logger } from "../utils/index.js";

/**
 * Registers the memoryBank_getProjectByName tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param projectService - An instance of the ProjectService.
 */
export const memoryBankGetProjectByNameTool = (
    server: McpServer,
    projectService: ProjectService
): void => {
    const processGetProjectByNameRequest = async (args: GetProjectByNameArgs) => {
        logger.debug(`Received ${TOOL_NAME_GET_PROJECT_BY_NAME} request`, { args });

        try {
            const project = await projectService.getProjectByName(args.projectName);

            if (!project) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Project with name '${args.projectName}' not found.`
                );
            }

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({
                        projectId: project.projectId,
                        projectName: project.projectName,
                        createdAt: project.createdAt,
                        lastModifiedAt: project.lastModifiedAt
                    })
                }]
            };
        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_GET_PROJECT_BY_NAME}`, error, { args });

            if (error instanceof McpError) {
                throw error;
            }

            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message :
                    `An unexpected error occurred in ${TOOL_NAME_GET_PROJECT_BY_NAME}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_GET_PROJECT_BY_NAME,
        TOOL_DESCRIPTION_GET_PROJECT_BY_NAME,
        TOOL_PARAMS_GET_PROJECT_BY_NAME,
        processGetProjectByNameRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME_GET_PROJECT_BY_NAME });
};
