import { z } from 'zod';

export const TOOL_NAME_CREATE_PROJECT = "memoryBank_createProject";

export const TOOL_DESCRIPTION_CREATE_PROJECT = `Creates a new project entry in the Memory Bank database. Projects provide isolation for Memory Bank documents. Returns the unique ID assigned to the new project.`;

export const TOOL_PARAMS_CREATE_PROJECT = {
    projectName: z.string().min(1).max(100)
        .describe("A human-readable name for the project (1-100 characters). Must be unique across all projects.")
};

// Optional: Define a Zod schema for the entire input object if needed later
// export const CreateProjectInputSchema = z.object(TOOL_PARAMS_CREATE_PROJECT);

// Define the expected success output structure (for documentation/testing)
export const CreateProjectOutputSchema = z.object({
    projectId: z.string().uuid().describe("The unique identifier (UUID) assigned to the newly created project.")
});
