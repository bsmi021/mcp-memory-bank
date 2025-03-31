import { z } from 'zod';

export const TOOL_NAME_GET_PROJECT_BY_NAME = "memoryBank_getProjectByName";

export const TOOL_DESCRIPTION_GET_PROJECT_BY_NAME =
    "Retrieves a project's details by its name. Returns the project ID and other metadata if found.";

export const TOOL_PARAMS_GET_PROJECT_BY_NAME = {
    projectName: z.string().min(1).max(100)
        .describe("The name of the project to retrieve.")
};

// Optional: Define a Zod schema for the entire input object if needed later
// export const GetProjectByNameInputSchema = z.object(TOOL_PARAMS_GET_PROJECT_BY_NAME);

// Define the type for the arguments based on the Zod schema
export type GetProjectByNameArgs = z.infer<z.ZodObject<typeof TOOL_PARAMS_GET_PROJECT_BY_NAME>>;

// Define the expected success output structure (for documentation/testing)
export const GetProjectByNameOutputSchema = z.object({
    projectId: z.string().uuid(),
    projectName: z.string(),
    createdAt: z.date(),
    lastModifiedAt: z.date()
}).describe("The project's details if found."); 