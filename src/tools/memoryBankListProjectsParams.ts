import { z } from 'zod';
import { ProjectSchema } from '../types/index.js'; // Import the Project schema/interface if needed for output

export const TOOL_NAME_LIST_PROJECTS = "memoryBank_listProjects";

export const TOOL_DESCRIPTION_LIST_PROJECTS = `Retrieves a list of all projects currently stored in the Memory Bank database, including their names and unique IDs.`;

// No parameters needed for this tool in V1
export const TOOL_PARAMS_LIST_PROJECTS = {};

// Define the expected success output structure
// Output is an object containing a list of projects
export const ListProjectsOutputSchema = z.object({
    projects: z.array(z.object({ // Use z.object to define the shape within the array
        projectId: z.string().uuid(),
        projectName: z.string()
        // We don't include timestamps in the list view for brevity
    })).describe("A list of projects, each with its unique ID and name.")
});
