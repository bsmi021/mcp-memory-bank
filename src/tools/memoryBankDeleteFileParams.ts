import { z } from 'zod';

export const TOOL_NAME_DELETE_FILE = "memoryBank_deleteFile";

export const TOOL_DESCRIPTION_DELETE_FILE = `Permanently deletes all stored content, chunks, and embeddings associated with the given conceptual file name for the specified project. Use with caution.`;

export const TOOL_PARAMS_DELETE_FILE = {
    projectId: z.string().uuid()
        .describe("The unique identifier (UUID) of the project."),
    fileName: z.string().min(1).max(100)
        .regex(/^[a-zA-Z0-9_.-]+\.md$/)
        .describe("The conceptual file name (e.g., 'activeContext.md') whose content is to be deleted.")
};

// Define the expected success output structure
export const DeleteFileOutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});
