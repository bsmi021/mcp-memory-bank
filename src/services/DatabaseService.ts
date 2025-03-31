import { ChromaClient, Collection, Where, IncludeEnum } from 'chromadb';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { Project, MemoryBankChunk, DatabaseSearchResult } from '../types/index.js';
import { logger } from '../utils/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';

// Define collection names
const PROJECTS_COLLECTION_NAME = 'projects';
const CHUNKS_COLLECTION_NAME = 'chunks';

// Helper type for metadata filtering
type ChromaWhere = Record<string, string | number | boolean>;

export class DatabaseService {
    private static instance: DatabaseService | null = null;
    private client: ChromaClient | null = null;
    private chromaUrl: string;
    private projectsCollection: Collection | null = null;
    private chunksCollection: Collection | null = null;
    private isInitialized = false;

    private constructor() {
        const configManager = ConfigurationManager.getInstance();
        const memConfig = configManager.getMemoryBankConfig();
        this.chromaUrl = memConfig.chromaDbUrl;
        logger.info(`DatabaseService configured with ChromaDB URL: ${this.chromaUrl}`);
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        logger.info(`Initializing DatabaseService connection to ChromaDB at: ${this.chromaUrl}...`);
        try {
            this.client = new ChromaClient({ path: this.chromaUrl });
            // Ping the server to ensure connectivity before proceeding
            await this.client.heartbeat();
            logger.info("ChromaDB connection successful (heartbeat received).");

            // Get or create collections
            // For projects, we don't need a specific embedding function as we don't store vectors
            this.projectsCollection = await this.client.getOrCreateCollection({ name: PROJECTS_COLLECTION_NAME });
            logger.info(`Ensured ChromaDB collection exists: ${PROJECTS_COLLECTION_NAME}`);

            // For chunks, ChromaDB defaults usually work, but embedding function can be specified if needed
            // We'll rely on adding embeddings directly during insertion for now.
            this.chunksCollection = await this.client.getOrCreateCollection({ name: CHUNKS_COLLECTION_NAME });
            logger.info(`Ensured ChromaDB collection exists: ${CHUNKS_COLLECTION_NAME}`);

            this.isInitialized = true;
            logger.info("DatabaseService initialized successfully with ChromaDB.");
        } catch (error: any) {
            logger.error(`Failed to initialize ChromaDB: ${error.message}`, error);
            this.isInitialized = false; this.client = null; this.projectsCollection = null; this.chunksCollection = null;
            // Provide a more specific error message if possible
            const errorMsg = error.message?.includes('fetch') ? `Failed to connect to ChromaDB at ${this.chromaUrl}. Is it running?` : error.message;
            throw new McpError(ErrorCode.InternalError, `ChromaDB initialization failed: ${errorMsg}`);
        }
    }

    private ensureInitialized(): void {
        if (!this.isInitialized || !this.client || !this.projectsCollection || !this.chunksCollection) {
            // Attempt re-initialization once if not initialized
            // Note: This is a simple recovery attempt. More robust logic might be needed.
            if (!this.isInitialized) {
                logger.warn("Database service was not initialized. Attempting initialization now...");
                // Make initialize public or add an internal re-init method if needed
                // For now, throw error to indicate the issue clearly.
                // await this.initialize(); // Avoid async call in sync method if possible
                // if (!this.isInitialized) { // Re-check after attempt
                throw new McpError(ErrorCode.InternalError, "Database service is not initialized. Initialization attempt failed or was not performed.");
                // }
            } else {
                throw new McpError(ErrorCode.InternalError, "Database service is not properly initialized (client or collections missing).");
            }
        }
    }

    // --- Project Methods ---
    // ChromaDB's get is primarily ID-based. Filtering metadata often uses query or requires fetching more data.
    // Let's try using `get` with a `where` filter, assuming the client supports it efficiently.
    // If not, we might need to use `peek` or `query` without embeddings.
    public async findProjectByName(projectName: string): Promise<Project | null> {
        this.ensureInitialized();
        try {
            const results = await this.projectsCollection!.get({
                where: { project_name: projectName } as Where, // Cast needed if type inference struggles
                limit: 1,
                include: [IncludeEnum.Metadatas]
            });
            if (results.ids.length > 0) {
                const meta = results.metadatas[0];
                if (!meta) return null; // Should not happen if ID exists, but safety check
                return {
                    projectId: results.ids[0],
                    projectName: meta.project_name as string,
                    createdAt: new Date(meta.created_at as string),
                    lastModifiedAt: new Date(meta.last_modified_at as string)
                };
            } return null;
        } catch (e: any) { throw new McpError(ErrorCode.InternalError, `DB error finding project by name: ${e.message}`); }
    }

    public async findProjectById(projectId: string): Promise<Project | null> {
        this.ensureInitialized();
        try {
            const results = await this.projectsCollection!.get({
                ids: [projectId],
                limit: 1,
                include: [IncludeEnum.Metadatas]
            });
            if (results.ids.length > 0) {
                const meta = results.metadatas[0];
                if (!meta) return null;
                return {
                    projectId: results.ids[0],
                    projectName: meta.project_name as string,
                    createdAt: new Date(meta.created_at as string),
                    lastModifiedAt: new Date(meta.last_modified_at as string)
                };
            } return null;
        } catch (e: any) { throw new McpError(ErrorCode.InternalError, `DB error finding project by ID: ${e.message}`); }
    }

    public async insertProject(projectId: string, projectName: string): Promise<Project> {
        this.ensureInitialized();
        const now = new Date().toISOString(); // Use ISO string format
        const metadata = {
            project_id: projectId,
            project_name: projectName,
            created_at: now,
            last_modified_at: now
        };
        try {
            // Check uniqueness at application level before inserting
            const existing = await this.findProjectByName(projectName);
            if (existing) {
                // Use InvalidParams as the conflict arises from the input name
                throw new McpError(ErrorCode.InvalidParams, `Project name '${projectName}' already exists.`);
            }
            await this.projectsCollection!.add({
                ids: [projectId],
                metadatas: [metadata],
                documents: [projectName] // Add documents property as required by chromadb
            });
            return {
                projectId: projectId,
                projectName: projectName,
                createdAt: new Date(now),
                lastModifiedAt: new Date(now)
            };
        } catch (e: any) { if (e instanceof McpError) throw e; throw new McpError(ErrorCode.InternalError, `DB error inserting project: ${e.message}`); }
    }

    public async deleteProjectRecord(projectId: string): Promise<boolean> {
        this.ensureInitialized();
        try {
            await this.projectsCollection!.delete({ ids: [projectId] });
            return true;
        } catch (e: any) { throw new McpError(ErrorCode.InternalError, `DB error deleting project record: ${e.message}`); }
    }

    public async getAllProjects(): Promise<Project[]> {
        this.ensureInitialized();
        try {
            // Use peek to get all items (up to collection limit) or implement pagination if needed
            const results = await this.projectsCollection!.get({ include: [IncludeEnum.Metadatas] }); // Get all
            return results.ids.map((id, index) => {
                const meta = results.metadatas[index];
                if (!meta) return null; // Handle potential null metadata
                return {
                    projectId: id,
                    projectName: meta.project_name as string,
                    createdAt: new Date(meta.created_at as string),
                    lastModifiedAt: new Date(meta.last_modified_at as string)
                };
            }).filter((p): p is Project => p !== null); // Filter out any nulls
        } catch (e: any) { throw new McpError(ErrorCode.InternalError, `DB error getting all projects: ${e.message}`); }
    }

    public async updateProjectLastModified(projectId: string): Promise<void> {
        this.ensureInitialized();
        try {
            const existing = await this.findProjectById(projectId);
            if (existing) {
                const now = new Date().toISOString();
                const updatedMetadata = {
                    project_id: existing.projectId,
                    project_name: existing.projectName,
                    created_at: existing.createdAt.toISOString(),
                    last_modified_at: now
                };
                // Use upsert which handles create or update
                await this.projectsCollection!.update({
                    ids: [projectId],
                    metadatas: [updatedMetadata],
                });
            } else {
                logger.warn(`Project ${projectId} not found for updateLastModified.`);
            }
        } catch (e: any) { throw new McpError(ErrorCode.InternalError, `DB error updating project timestamp: ${e.message}`); }
    }

    // --- Chunk/Embedding Methods ---
    public async deleteMemoryBankContentByProject(projectId: string): Promise<boolean> {
        this.ensureInitialized();
        try {
            await this.chunksCollection!.delete({ where: { project_id: projectId } as Where });
            return true;
        } catch (e: any) { throw new McpError(ErrorCode.InternalError, `DB error deleting project chunks: ${e.message}`); }
    }

    public async deleteMemoryBankContentByFile(projectId: string, fileName: string): Promise<boolean> {
        this.ensureInitialized();
        try {
            // Step 1: Get all chunks for the project
            logger.debug(`Getting all chunk IDs for project ${projectId} to filter for file ${fileName}`);
            const results = await this.chunksCollection!.get({
                where: { "project_id": projectId } as Where, // Filter only by project ID
                include: [IncludeEnum.Metadatas] // Need metadata to filter by filename
            });

            if (!results || results.ids.length === 0) {
                logger.debug(`No chunks found for project ${projectId}, nothing to delete for file ${fileName}.`);
                return true;
            }

            // Step 2: Filter results in application code by fileName
            const idsToDelete = results.ids.filter((id, index) => {
                const meta = results.metadatas[index];
                return meta?.file_name === fileName;
            });


            if (idsToDelete.length === 0) {
                logger.debug(`No chunks found to delete for project ${projectId}, file ${fileName}.`);
                return true; // Nothing to delete, operation is successful (idempotent)
            }

            // Step 2: Delete the chunks using their specific IDs
            logger.debug(`Deleting ${idsToDelete.length} chunk(s) by ID for project ${projectId}, file ${fileName}`);
            await this.chunksCollection!.delete({ ids: idsToDelete });
            logger.debug(`Successfully deleted chunks by ID.`);
            return true;
        } catch (e: any) {
            logger.error(`Error deleting file chunks for project ${projectId}, file ${fileName}: ${e.message}`, e);
            throw new McpError(ErrorCode.InternalError, `DB error deleting file chunks: ${e.message}`);
        }
    }

    public async insertMemoryBankChunk(projectId: string, fileName: string, chunkIndex: number, chunkText: string, embeddingVector: number[]): Promise<MemoryBankChunk> {
        this.ensureInitialized();
        const chunkId = uuidv4();
        const now = new Date().toISOString();
        const metadata = {
            chunk_id: chunkId,
            project_id: projectId,
            file_name: fileName,
            chunk_index: chunkIndex,
            created_at: now,
            updated_at: now
        };
        try {
            await this.chunksCollection!.add({
                ids: [chunkId],
                embeddings: [embeddingVector],
                metadatas: [metadata],
                documents: [chunkText]
            });
            return {
                chunkId: chunkId,
                projectId: projectId,
                fileName: fileName,
                chunkIndex: chunkIndex,
                chunkText: chunkText,
                embedding: embeddingVector,
                createdAt: new Date(now),
                updatedAt: new Date(now)
            };
        } catch (e: any) { throw new McpError(ErrorCode.InternalError, `DB error inserting chunk: ${e.message}`); }
    }

    public async getMemoryBankChunksByFile(projectId: string, fileName: string): Promise<MemoryBankChunk[]> {
        this.ensureInitialized();
        logger.debug(`Getting chunks for file: ${fileName} in project: ${projectId}`);
        try {
            // Use the $and structure for the where clause, similar to delete
            const whereFilter = {
                "$and": [
                    { "project_id": { "$eq": projectId } },
                    { "file_name": { "$eq": fileName } }
                ]
            };
            const results = await this.chunksCollection!.get({
                where: whereFilter as Where,
                include: [IncludeEnum.Metadatas, IncludeEnum.Documents, IncludeEnum.Embeddings] // Include embeddings too
            });

            if (!results || results.ids.length === 0) {
                logger.warn(`No chunks found for file '${fileName}' in project '${projectId}'`);
                return [];
            }

            const chunks: MemoryBankChunk[] = results.ids.map((id, index) => {
                const meta = results.metadatas[index];
                const doc = results.documents[index];
                const embedding = results.embeddings?.[index]; // Embeddings might be null if not included
                if (!meta || doc === null || doc === undefined) return null; // Need metadata and document
                return {
                    chunkId: id,
                    projectId: meta.project_id as string,
                    fileName: meta.file_name as string,
                    chunkIndex: meta.chunk_index as number,
                    chunkText: doc,
                    embedding: embedding as number[] | undefined, // Cast or handle potential null
                    createdAt: new Date(meta.created_at as string),
                    updatedAt: new Date(meta.updated_at as string)
                };
            }).filter((c) => c !== null); // Simpler filter, TS should infer non-null type

            chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
            return chunks;
        } catch (error: any) {
            logger.error(`Error getting chunks for file '${fileName}' in project '${projectId}': ${error.message}`, error);
            throw new McpError(ErrorCode.InternalError, `Database error getting file chunks.`);
        }
    }

    public async getDistinctFileNamesByProject(projectId: string): Promise<string[]> {
        this.ensureInitialized();
        logger.debug(`Getting distinct file names for project: ${projectId}`);
        try {
            // Fetch all metadata for the project - might be inefficient for huge projects
            const results = await this.chunksCollection!.get({
                where: { project_id: projectId } as Where,
                include: [IncludeEnum.Metadatas] // Only need metadata
            });

            const fileNames = new Set<string>();
            results.metadatas.forEach((meta) => {
                if (meta && meta.file_name) {
                    fileNames.add(meta.file_name as string);
                }
            });
            return Array.from(fileNames);
        } catch (error: any) {
            logger.error(`Error getting distinct file names for project '${projectId}': ${error.message}`, error);
            throw new McpError(ErrorCode.InternalError, `Database error getting distinct file names.`);
        }
    }

    // --- Search Methods ---
    public async semanticSearchChunks(projectId: string, queryEmbedding: number[], topK: number, fileFilter?: string[]): Promise<DatabaseSearchResult[]> {
        this.ensureInitialized();
        try {
            const whereClause: ChromaWhere = { project_id: projectId };
            if (fileFilter && fileFilter.length > 0) {
                // ChromaDB `where` often uses $in for lists
                whereClause.file_name = { "$in": fileFilter } as any; // Use $in operator if supported
            }

            const results = await this.chunksCollection!.query({
                queryEmbeddings: [queryEmbedding],
                nResults: topK,
                where: whereClause as Where, // Cast needed
                include: [IncludeEnum.Metadatas, IncludeEnum.Documents, IncludeEnum.Distances] // Get distances as scores
            });

            // Chroma returns results in nested arrays, handle potential nulls
            const ids = results.ids?.[0] ?? [];
            const distances = results.distances?.[0] ?? [];
            const metadatas = results.metadatas?.[0] ?? [];
            const documents = results.documents?.[0] ?? [];

            return ids.map((id, index) => {
                const meta = metadatas[index];
                const doc = documents[index];
                if (!meta || doc === null || doc === undefined) return null;
                return {
                    // Reconstruct MemoryBankChunk fields from metadata/doc
                    chunkId: id,
                    projectId: meta.project_id as string,
                    fileName: meta.file_name as string,
                    chunkIndex: meta.chunk_index as number,
                    chunkText: doc,
                    // embedding: null, // Don't typically need embedding in search result
                    createdAt: new Date(meta.created_at as string),
                    updatedAt: new Date(meta.updated_at as string),
                    // Return the raw distance. Lower is better (more similar).
                    score: distances[index] ?? null
                };
            }).filter((r) => r !== null); // Simpler filter, TS should infer non-null type

        } catch (e: any) {
            throw new McpError(ErrorCode.InternalError, `DB error during semantic search: ${e.message}`);
        }
    }

    public async keywordSearchChunks(projectId: string, query: string, topK: number, fileFilter?: string[]): Promise<DatabaseSearchResult[]> {
        this.ensureInitialized();
        logger.warn("Keyword search in DatabaseService is performing application-level filtering. This may be inefficient for large datasets.");
        try {
            const whereClause: ChromaWhere = { project_id: projectId };
            if (fileFilter && fileFilter.length > 0) {
                whereClause.file_name = { "$in": fileFilter } as any; // Use $in operator if supported
            }

            // 1. Get candidate chunks based on metadata filters
            // Fetch more than topK initially as filtering is done in app
            // Let's fetch a reasonable limit, e.g., 100, or consider pagination if needed.
            const candidates = await this.chunksCollection!.get({
                where: whereClause as Where,
                limit: 100, // Fetch more candidates for app-level filtering
                include: [IncludeEnum.Metadatas, IncludeEnum.Documents]
            });

            // 2. Perform keyword matching in application layer
            const lowerCaseQuery = query.toLowerCase();
            const matchedResults = candidates.ids.map((id, index) => {
                const meta = candidates.metadatas[index];
                const doc = candidates.documents[index];
                if (!meta || doc === null || doc === undefined || !doc.toLowerCase().includes(lowerCaseQuery)) {
                    return null; // Filter out non-matches
                }
                return {
                    chunkId: id,
                    projectId: meta.project_id as string,
                    fileName: meta.file_name as string,
                    chunkIndex: meta.chunk_index as number,
                    chunkText: doc,
                    createdAt: new Date(meta.created_at as string),
                    updatedAt: new Date(meta.updated_at as string),
                    score: null // No score for keyword match
                };
            }).filter((r) => r !== null); // Simpler filter, TS should infer non-null type

            // 3. Sort and limit
            // Add non-null assertions (!) as TS sometimes doesn't carry the filter result type info into the sort callback
            matchedResults.sort((a, b) => {
                if (a!.fileName !== b!.fileName) return a!.fileName.localeCompare(b!.fileName);
                return a!.chunkIndex - b!.chunkIndex;
            });

            // The filter ensures the array only contains DatabaseSearchResult objects now
            return matchedResults.slice(0, topK) as DatabaseSearchResult[];

        } catch (e: any) {
            throw new McpError(ErrorCode.InternalError, `DB error during keyword search: ${e.message}`);
        }
    }
}
