import { ConfigurationManager } from '../config/ConfigurationManager.js';
// Import DatabaseSearchResult along with others
import { SearchResult, MemoryBankChunk, DatabaseSearchResult } from '../types/index.js';
import { logger } from '../utils/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ProjectService } from './ProjectService.js';
import { DatabaseService } from './DatabaseService.js';
import { EmbeddingService } from './EmbeddingService.js';
// DatabaseSearchResult and SearchResult are imported via '../types/index.js'

// Placeholder interfaces removed

export class SearchService {
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
        logger.info("SearchService initialized");
    }

    /**
     * Performs a search (semantic or keyword) within a project's memory bank.
     * @param projectId - UUID of the project.
     * @param query - The search query string.
     * @param searchType - 'semantic' or 'keyword'.
     * @param topK - Max number of results to return.
     * @param fileFilter - Optional list of file names to filter by.
     * @returns An array of SearchResult objects.
     * @throws McpError on failure.
     */
    public async search(
        projectId: string,
        query: string,
        searchType: 'semantic' | 'keyword',
        topK: number,
        fileFilter?: string[]
    ): Promise<SearchResult[]> {
        logger.debug(`Performing ${searchType} search in project '${projectId}' for query: "${query}" (topK: ${topK}, filter: ${fileFilter})`);

        // 1. Validate project exists
        if (!await this.projectService.projectExists(projectId)) {
            throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
        }

        // Basic validation (Tool layer handles Zod)
        if (!query || !searchType || !topK) {
            throw new McpError(ErrorCode.InvalidParams, "Missing required search parameters.");
        }

        try {
            // Use the correct type that includes the score
            let chunks: DatabaseSearchResult[] = [];

            if (searchType === 'semantic') {
                const queryEmbedding = await this.embeddingService.generateEmbedding(query);
                chunks = await this.dbService.semanticSearchChunks(projectId, queryEmbedding, topK, fileFilter);
                logger.debug(`Semantic search returned ${chunks.length} chunks.`);

            } else if (searchType === 'keyword') {
                chunks = await this.dbService.keywordSearchChunks(projectId, query, topK, fileFilter);
                logger.debug(`Keyword search returned ${chunks.length} chunks.`);

            } else {
                // Should be caught by Zod enum validation in tool layer, but handle defensively
                throw new McpError(ErrorCode.InvalidParams, `Invalid search type: ${searchType}`);
            }

            // 3. Format results
            const results: SearchResult[] = chunks.map(chunk => ({
                text: chunk.chunkText,
                fileName: chunk.fileName,
                chunkIndex: chunk.chunkIndex,
                score: chunk.score // Use score from DB result (distance for semantic, null for keyword)
            }));

            // Sort semantic results by score ascending (lower distance = more similar)
            if (searchType === 'semantic') {
                results.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
            }
            // Keyword results are already sorted by DB/logic in keywordSearchChunks (filename, chunkIndex)

            logger.info(`Search completed. Returning ${results.length} results.`);
            return results;

        } catch (error) {
            logger.error(`Error during search in project '${projectId}':`, error);
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Placeholder methods removed ---
}
