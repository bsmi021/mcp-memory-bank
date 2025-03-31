import { z } from 'zod';

/**
 * The unique name identifier for the memoryBank_initializeProject tool.
 */
export const TOOL_NAME_INITIALIZE_PROJECT = "memoryBank_initializeProject";

/**
 * Describes the function of the memoryBank_initializeProject tool.
 * It creates the standard set of Memory Bank files within a specified project,
 * populating them with descriptive placeholder content to guide usage.
 */
export const TOOL_DESCRIPTION_INITIALIZE_PROJECT = `Initializes a Memory Bank project by creating the standard set of core files (${[
    'projectbrief.md',
    'productContext.md',
    'activeContext.md',
    'systemPatterns.md',
    'techContext.md',
    'progress.md'
].join(', ')}) with descriptive placeholder content. This ensures the project starts with the correct structure and provides guidance on the intended purpose of each file.`;

/**
 * Zod schema defining the parameters required by the memoryBank_initializeProject tool.
 */
export const TOOL_PARAMS_INITIALIZE_PROJECT = {
    projectId: z.string().uuid().describe("The unique identifier (UUID) of the project to initialize with standard Memory Bank files.")
};

// Ensure the schema is exported as an object for the server.tool method
export const InitializeProjectSchema = z.object(TOOL_PARAMS_INITIALIZE_PROJECT);

// Define the TypeScript type inferred from the Zod schema
export type InitializeProjectParams = z.infer<typeof InitializeProjectSchema>;
