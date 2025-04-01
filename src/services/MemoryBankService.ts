import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { MemoryBankChunk, SearchResult } from '../types/index.js';
import { logger } from '../utils/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ProjectService } from './ProjectService.js';
import { DatabaseService } from './DatabaseService.js';
import { EmbeddingService } from './EmbeddingService.js';
// MemoryBankChunk is already imported via '../types/index.js' on line 2

// Placeholder interfaces removed

export class MemoryBankService {
    private readonly configManager: ConfigurationManager;
    private readonly projectService: ProjectService;
    private readonly dbService: DatabaseService;
    private readonly embeddingService: EmbeddingService;

    constructor(
        projectService: ProjectService,
        dbService: DatabaseService, // Accept DatabaseService
        embeddingService: EmbeddingService // Accept EmbeddingService
    ) {
        this.configManager = ConfigurationManager.getInstance();
        this.projectService = projectService;
        this.dbService = dbService; // Assign injected service
        this.embeddingService = embeddingService; // Assign injected service
        logger.info("MemoryBankService initialized"); // Already good
    }

    /**
     * Updates or creates the content for a conceptual file.
     * Handles chunking, embedding, and database storage.
     * @param projectId - UUID of the project.
     * @param fileName - Conceptual file name.
     * @param content - The full Markdown content.
     * @throws McpError on failure (e.g., project not found, DB error, embedding error).
     */
    public async updateFileContent(projectId: string, fileName: string, content: string): Promise<void> {
        logger.debug("Updating file content", { fileName, projectId });

        // 1. Validate project exists (delegated to ProjectService)
        if (!await this.projectService.projectExists(projectId)) {
            throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
        }

        // Basic validation for fileName and content (Tool layer handles Zod validation)
        if (!fileName || !content) {
            throw new McpError(ErrorCode.InvalidParams, "File name and content cannot be empty.");
        }

        try {
            // 2. Chunk the content using EmbeddingService
            const chunks = await this.embeddingService.chunkText(content);
            logger.debug("Content chunked", { chunkCount: chunks.length, fileName, projectId });

            if (chunks.length === 0) {
                // Handle case where content results in zero usable chunks (e.g., only whitespace)
                // Decide if this should clear the file or be an error. Let's clear it for now.
                logger.warn("Content resulted in 0 chunks after processing. Clearing existing content.", { fileName, projectId });
                await this.dbService.deleteMemoryBankContentByFile(projectId, fileName);
                await this.projectService.updateLastModified(projectId);
                return; // Exit early
            }

            // 3. Generate embeddings for each chunk (handle potential errors atomically)
            // Use Promise.all for potentially faster embedding generation (if library supports concurrency)
            // Add robust error handling for the entire batch
            let embeddings: number[][];
            try {
                embeddings = await Promise.all(
                    chunks.map(chunk => this.embeddingService.generateEmbedding(chunk))
                );
                logger.debug("Embeddings generated", { chunkCount: chunks.length, fileName, projectId });
            } catch (embeddingError) {
                logger.error("Failed to generate embeddings", embeddingError, { fileName, projectId });
                // Propagate as InternalError as per RFC-002 error handling strategy
                throw new McpError(ErrorCode.InternalError, `Embedding generation failed: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`);
            }


            // 4. Database Update (should ideally be atomic/transactional if DB supports it)
            //    a. Delete existing chunks for this file
            await this.dbService.deleteMemoryBankContentByFile(projectId, fileName);
            logger.debug("Deleted existing chunks for file", { fileName, projectId });

            //    b. Insert new chunks
            // Use Promise.all for potentially faster insertion
            await Promise.all(
                chunks.map((chunkText, i) =>
                    this.dbService.insertMemoryBankChunk(projectId, fileName, i, chunkText, embeddings[i])
                )
            );
            logger.debug("Inserted new chunks for file", { chunkCount: chunks.length, fileName, projectId });

            // 5. Update project's last modified timestamp
            await this.projectService.updateLastModified(projectId);

            logger.info("Successfully updated file content", { fileName, projectId });

        } catch (error) {
            logger.error("Error updating file content", error, { fileName, projectId });
            if (error instanceof McpError) throw error; // Re-throw known MCP errors
            // Wrap unexpected errors
            throw new McpError(ErrorCode.InternalError, `Failed to update file content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieves the full reconstructed content of a conceptual file.
     * @param projectId - UUID of the project.
     * @param fileName - Conceptual file name.
     * @returns The full Markdown content string.
     * @throws McpError if project or file not found, or DB error.
     */
    public async getFileContent(projectId: string, fileName: string): Promise<string> {
        logger.debug("Getting file content", { fileName, projectId });

        if (!await this.projectService.projectExists(projectId)) {
            throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
        }

        try {
            const chunks = await this.dbService.getMemoryBankChunksByFile(projectId, fileName);

            if (chunks.length === 0) {
                logger.warn("No content found for file in project", { fileName, projectId });
                // Use InvalidParams as the fileName doesn't correspond to existing content for this project
                throw new McpError(ErrorCode.InvalidParams, `No content found for file '${fileName}' in project '${projectId}'.`);
            }

            // Reconstruction (V1 - Simple Concatenation)
            const fullContent = chunks
                // .sort((a, b) => a.chunkIndex - b.chunkIndex) // Ensure order if DB doesn't guarantee it
                .map(chunk => chunk.chunkText)
                .join('');

            logger.info("Successfully retrieved file content", { fileName, projectId });
            return fullContent;

        } catch (error) {
            logger.error("Error getting file content", error, { fileName, projectId });
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `Failed to get file content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Lists the names of all conceptual files within a project.
     * @param projectId - UUID of the project.
     * @returns An array of file names.
     * @throws McpError if project not found or DB error.
     */
    public async listFiles(projectId: string): Promise<string[]> {
        logger.debug("Listing files for project", { projectId });

        if (!await this.projectService.projectExists(projectId)) {
            throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
        }

        try {
            const fileNames = await this.dbService.getDistinctFileNamesByProject(projectId);
            logger.info("Found files for project", { fileCount: fileNames.length, projectId });
            return fileNames;
        } catch (error) {
            logger.error("Error listing files for project", error, { projectId });
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Deletes all content associated with a conceptual file.
     * @param projectId - UUID of the project.
     * @param fileName - Conceptual file name.
     * @returns True if deletion was successful (idempotent).
     * @throws McpError if project not found or DB error.
     */
    public async deleteFileContent(projectId: string, fileName: string): Promise<boolean> {
        logger.debug("Deleting file content", { fileName, projectId });

        if (!await this.projectService.projectExists(projectId)) {
            throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
        }

        try {
            await this.dbService.deleteMemoryBankContentByFile(projectId, fileName);

            // Update project's last modified timestamp
            await this.projectService.updateLastModified(projectId);

            logger.info("Successfully deleted file content (if any)", { fileName, projectId });
            return true; // Idempotent
        } catch (error) {
            logger.error("Error deleting file content", error, { fileName, projectId });
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `Failed to delete file content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Placeholder methods removed ---
}
