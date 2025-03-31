import { z } from 'zod';

export const TOOL_NAME_UPDATE_FILE = "memoryBank_updateFile";

export const TOOL_DESCRIPTION_UPDATE_FILE = `Updates or creates the content associated with a given conceptual file name within a specified project. This process involves chunking the content, generating embeddings, and storing/updating the data in the Vector DB.`;

export const TOOL_PARAMS_UPDATE_FILE = {
    projectId: z.string().uuid()
        .describe("The unique identifier (UUID) of the project."),
    fileName: z.string().min(1).max(100)
        .regex(/^[a-zA-Z0-9_.-]+\.md$/)
        .describe("The conceptual file name (e.g., 'activeContext.md'). Must end in .md and contain safe characters."),
    content: z.string()
        .trim() // Trim whitespace first
        .min(1) // THEN check if the trimmed result has length >= 1
        .describe("The full Markdown content to associate with the file name. Must contain at least one non-whitespace character. To remove content, use the 'memoryBank_deleteFile' tool.")
};

// Define the expected success output structure
export const UpdateFileOutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});
