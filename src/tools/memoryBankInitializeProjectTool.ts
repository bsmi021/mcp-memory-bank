import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {
    TOOL_NAME_INITIALIZE_PROJECT,
    TOOL_DESCRIPTION_INITIALIZE_PROJECT,
    TOOL_PARAMS_INITIALIZE_PROJECT, // Import the params object
    InitializeProjectSchema, // Use the exported Zod schema object
    InitializeProjectParams // Use the inferred type
} from "./memoryBankInitializeProjectParams.js";
import { MemoryBankService } from "../services/index.js";
import { logger } from "../utils/index.js";

// --- Standard Memory Bank Files and Placeholders ---

const STANDARD_FILES: { [key: string]: string } = {
    'projectbrief.md': `# Project Brief

**(Auto-generated by initializeProject)**

**Purpose:** Define the high-level goals, core problem, proposed solution, and scope of this project. This is the foundational document. Refer to the Memory Bank methodology documentation for details.

---
*(Start adding your project brief content below)*
`,
    'productContext.md': `# Product Context

**(Auto-generated by initializeProject)**

**Purpose:** Explain *why* this project exists, the specific problems it solves for users, how it *should* work from a user perspective, and the desired user experience goals. Refer to the Memory Bank methodology documentation for details.

---
*(Start adding your product context below)*
`,
    'activeContext.md': `# Active Context

**(Auto-generated by initializeProject)**

**Purpose:** Track the *current* state of the project. What is the immediate focus? What changed recently? What are the next steps? What decisions are being actively considered? What important patterns or preferences have emerged? What have we learned? This file should be updated frequently. Refer to the Memory Bank methodology documentation for details.

---
*(Start adding your active context below)*
`,
    'systemPatterns.md': `# System Patterns

**(Auto-generated by initializeProject)**

**Purpose:** Document the technical architecture, key technical decisions, design patterns used, component relationships, and critical implementation paths. This focuses on the *how* from a technical standpoint. Refer to the Memory Bank methodology documentation for details.

---
*(Start adding your system patterns below)*
`,
    'techContext.md': `# Tech Context

**(Auto-generated by initializeProject)**

**Purpose:** List the specific technologies, libraries, frameworks, and tools used in the project. Include details about the development setup, technical constraints, dependencies, and common tool usage patterns. Refer to the Memory Bank methodology documentation for details.

---
*(Start adding your tech context below)*
`,
    'progress.md': `# Progress

**(Auto-generated by initializeProject)**

**Purpose:** Track the overall progress and evolution of the project. What features are working? What major components are left to build? What is the current status relative to the goals? Are there any known issues or bugs? How have key decisions evolved over time? Refer to the Memory Bank methodology documentation for details.

---
*(Start adding your progress tracking below)*
`
};

const STANDARD_FILENAMES = Object.keys(STANDARD_FILES);

// --- Tool Registration ---

/**
 * Registers the memoryBank_initializeProject tool with the MCP server.
 *
 * @param server - The McpServer instance.
 * @param memoryBankService - An instance of the MemoryBankService.
 */
export const memoryBankInitializeProjectTool = (
    server: McpServer,
    memoryBankService: MemoryBankService // Inject MemoryBankService
): void => {

    /**
     * Processes the request to initialize standard files for a project.
     * Iterates through the standard filenames and uses the MemoryBankService
     * to create each file with its descriptive placeholder content.
     */
    const processInitializeProjectRequest = async (args: InitializeProjectParams) => {
        logger.debug(`Received ${TOOL_NAME_INITIALIZE_PROJECT} request`, { args });
        try {
            // Input validation is handled by Zod schema linked to server.tool

            // Loop through standard files and create them
            for (const fileName of STANDARD_FILENAMES) {
                const content = STANDARD_FILES[fileName];
                logger.debug("Initializing standard file for project", { fileName, projectId: args.projectId });
                // Use the same service method as the updateFile tool
                await memoryBankService.updateFileContent(args.projectId, fileName, content);
                logger.debug("Standard file initialized successfully", { fileName, projectId: args.projectId });
            }

            // Format the successful output for MCP
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ success: true, message: `Standard Memory Bank files initialized successfully for project ${args.projectId}.` })
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME_INITIALIZE_PROJECT}`, error, { args });

            // Re-throw known McpErrors (like InvalidParams if project doesn't exist, handled by updateFileContent)
            if (error instanceof McpError) {
                throw error;
            }

            // Generic internal error for unexpected issues
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME_INITIALIZE_PROJECT}.`
            );
        }
    };

    server.tool(
        TOOL_NAME_INITIALIZE_PROJECT,
        TOOL_DESCRIPTION_INITIALIZE_PROJECT,
        TOOL_PARAMS_INITIALIZE_PROJECT, // Pass the raw Zod shape object
        processInitializeProjectRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME_INITIALIZE_PROJECT });
};
