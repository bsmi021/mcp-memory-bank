import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { Project } from '../types/index.js';
import { logger } from '../utils/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseService } from './DatabaseService.js'; // Import the actual service
// Project type is imported via '../types/index.js' on line 2


export class ProjectService {
    private readonly configManager: ConfigurationManager;
    private readonly dbService: DatabaseService; // Will be injected

    constructor(dbService: DatabaseService) { // Accept DatabaseService
        this.configManager = ConfigurationManager.getInstance();
        this.dbService = dbService; // Assign injected service
        logger.info("ProjectService initialized"); // Already good
    }

    /**
     * Creates a new project.
     * @param projectName - The desired name for the project.
     * @returns The newly created Project object.
     * @throws McpError if project name already exists or DB error occurs.
     */
    public async createProject(projectName: string): Promise<Project> {
        logger.debug("Attempting to create project", { projectName });

        // Basic validation (more specific validation in tool layer)
        if (!projectName || typeof projectName !== 'string' || projectName.length === 0 || projectName.length > 100) {
            throw new McpError(ErrorCode.InvalidParams, "Invalid project name provided.");
        }

        // Check if project name already exists
        const existingProject = await this.dbService.findProjectByName(projectName);
        if (existingProject) {
            logger.warn("Project name conflict", { projectName });
            // Use InvalidParams as the provided name conflicts with existing resources
            throw new McpError(ErrorCode.InvalidParams, `Project name '${projectName}' already exists.`);
        }

        const projectId = crypto.randomUUID(); // Generate UUID

        try {
            // Insert the new project
            const newProject = await this.dbService.insertProject(projectId, projectName);
            logger.info("Project created successfully", { projectName, projectId });
            return newProject;
        } catch (error) {
            logger.error("Database error creating project", error, { projectName });
            throw new McpError(ErrorCode.InternalError, "Failed to create project due to database error.");
        }
    }

    /**
     * Deletes a project and all its associated content.
     * @param projectId - The UUID of the project to delete.
     * @returns True if deletion was successful.
     * @throws McpError if project not found or DB error occurs.
     */
    public async deleteProject(projectId: string): Promise<boolean> {
        logger.debug("Attempting to delete project", { projectId });

        if (!projectId || typeof projectId !== 'string') { // Basic UUID check can be added
            throw new McpError(ErrorCode.InvalidParams, "Invalid project ID provided.");
        }

        // Check if project exists before attempting delete
        const projectExists = await this.dbService.findProjectById(projectId);
        if (!projectExists) {
            logger.warn("Project not found for deletion", { projectId });
            // Use InvalidParams as the provided ID does not match an existing resource
            throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
        }

        try {
            // Note: Atomicity depends on DB implementation. For now, sequential delete.
            // 1. Delete associated content first
            await this.dbService.deleteMemoryBankContentByProject(projectId);
            logger.debug("Deleted content for project", { projectId });

            // 2. Delete the project record
            const deleted = await this.dbService.deleteProjectRecord(projectId);
            if (deleted) { // Assuming deleteProjectRecord returns boolean or doesn't error if successful
                logger.info("Project deleted successfully", { projectId });
                return true;
            } else {
                // Should ideally not happen if findProjectById succeeded, but handle defensively
                logger.error("Failed to delete project record after deleting content", undefined, { projectId });
                throw new McpError(ErrorCode.InternalError, "Failed to delete project record.");
            }
        } catch (error) {
            logger.error("Database error deleting project", error, { projectId });
            throw new McpError(ErrorCode.InternalError, "Failed to delete project due to database error.");
        }
    }

    /**
     * Lists all projects.
     * @returns An array of Project objects.
     * @throws McpError if DB error occurs.
     */
    public async listProjects(): Promise<Project[]> {
        logger.debug("Listing all projects"); // Keep as is
        try {
            const projects = await this.dbService.getAllProjects();
            return projects;
        } catch (error) {
            logger.error("Database error listing projects", error);
            throw new McpError(ErrorCode.InternalError, "Failed to list projects due to database error.");
        }
    }

    /**
    * Checks if a project exists.
    * @param projectId - The UUID of the project to check.
    * @returns True if the project exists, false otherwise.
     * @throws McpError if DB error occurs.
     */
    public async projectExists(projectId: string): Promise<boolean> {
        logger.debug("Checking existence of project", { projectId });
        if (!projectId || typeof projectId !== 'string') {
            return false; // Invalid ID cannot exist
        }
        try {
            const project = await this.dbService.findProjectById(projectId);
            return !!project; // Convert result to boolean
        } catch (error) {
            logger.error("Database error checking project existence", error, { projectId });
            // Decide if DB errors should throw or return false. Throwing is safer.
            throw new McpError(ErrorCode.InternalError, "Database error checking project existence.");
        }
    }

    /**
     * Updates the last modified timestamp for a project.
     * @param projectId - The UUID of the project to update.
     * @throws McpError if project not found or DB error occurs.
     */
    public async updateLastModified(projectId: string): Promise<void> {
        logger.debug("Updating last modified time for project", { projectId });
        if (!projectId || typeof projectId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, "Invalid project ID provided for timestamp update.");
        }
        try {
            // Check existence first to provide a clearer error if needed, though update might handle it
            // const exists = await this.dbService.findProjectById(projectId);
            // if (!exists) {
            //     throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found for timestamp update.`);
            // }
            await this.dbService.updateProjectLastModified(projectId);
            logger.info("Updated last modified time for project", { projectId });
        } catch (error) {
            logger.error("Database error updating last modified time for project", error, { projectId });
            // Don't necessarily throw InvalidParams here if the goal is just to update,
            // maybe the project was *just* deleted. Logging might be sufficient.
            // However, if the DB call itself fails for other reasons, it's an internal error.
            // Let's check if the error IS specifically the InvalidParams we'd expect from findProjectById
            // For now, let's simplify and just throw InternalError if the DB update fails for any reason other than finding the project initially.
            // The check for existence should happen *before* attempting the update if strictness is needed.
            // Re-throwing the original error might expose too much, let's stick to InternalError for DB issues during update.
            logger.error("Database error during updateLastModified", error, { projectId });
            throw new McpError(ErrorCode.InternalError, "Failed to update project last modified time due to database error.");
            // Original logic preserved below in case needed later:
            // if (!(error instanceof McpError && error.code === ErrorCode.InvalidParams)) { // Check if it was the specific 'not found' case
            //     throw new McpError(ErrorCode.InternalError, "Failed to update project last modified time.");
            // }
            // // If it was InvalidParams (NotFound), maybe just log a warning? Or re-throw? Re-throwing is safer.
            throw error;
        }
    }

    /**
     * Gets a project by its name.
     * @param projectName - The name of the project to find.
     * @returns The Project object if found, null otherwise.
     * @throws McpError if DB error occurs.
     */
    public async getProjectByName(projectName: string): Promise<Project | null> {
        logger.debug("Attempting to get project by name", { projectName });

        if (!projectName || typeof projectName !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, "Invalid project name provided.");
        }

        try {
            return await this.dbService.findProjectByName(projectName);
        } catch (error) {
            logger.error("Database error getting project by name", error, { projectName });
            throw new McpError(ErrorCode.InternalError, "Failed to get project due to database error.");
        }
    }

    // --- Placeholder DB methods removed ---
}
