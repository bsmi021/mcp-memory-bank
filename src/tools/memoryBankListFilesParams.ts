import { z } from 'zod';

export const TOOL_NAME_LIST_FILES = "memoryBank_listFiles";

export const TOOL_DESCRIPTION_LIST_FILES = `Lists the unique conceptual file names (e.g., 'projectbrief.md', 'activeContext.md') that have content stored for the specified project.`;

export const TOOL_PARAMS_LIST_FILES = {
    projectId: z.string().uuid()
        .describe("The unique identifier (UUID) of the project whose files are to be listed.")
};

// Define the expected success output structure
export const ListFilesOutputSchema = z.object({
    files: z.array(z.string()).describe("A list of unique conceptual file names stored for the project.")
});
