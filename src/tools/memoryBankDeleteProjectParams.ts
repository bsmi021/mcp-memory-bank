import { z } from 'zod';

export const TOOL_NAME_DELETE_PROJECT = "memoryBank_deleteProject";

export const TOOL_DESCRIPTION_DELETE_PROJECT = `Permanently deletes a project and all associated conceptual file content and embeddings from the Memory Bank database. Use with extreme caution.`;

export const TOOL_PARAMS_DELETE_PROJECT = {
    projectId: z.string().uuid()
        .describe("The unique identifier (UUID) of the project to delete.")
};

// Define the expected success output structure
export const DeleteProjectOutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});
