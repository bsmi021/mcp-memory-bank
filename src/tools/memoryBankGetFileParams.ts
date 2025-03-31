import { z } from 'zod';

export const TOOL_NAME_GET_FILE = "memoryBank_getFile";

export const TOOL_DESCRIPTION_GET_FILE = `Retrieves the full content associated with a given conceptual file name within a specified project. The content is reconstructed from the stored chunks in the database.`;

export const TOOL_PARAMS_GET_FILE = {
    projectId: z.string().uuid()
        .describe("The unique identifier (UUID) of the project."),
    fileName: z.string().min(1).max(100)
        .regex(/^[a-zA-Z0-9_.-]+\.md$/)
        .describe("The conceptual file name (e.g., 'activeContext.md') whose content is to be retrieved.")
};

// Define the expected success output structure (implicitly just the text content)
// No specific Zod schema needed here as the output is just the string content.
