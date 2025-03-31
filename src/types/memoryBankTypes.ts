import { z } from 'zod';

// Represents a project managed by the server
export interface Project {
    projectId: string; // UUID
    projectName: string;
    createdAt: Date;
    lastModifiedAt: Date;
}

// Represents a chunk of text derived from a conceptual file
export interface MemoryBankChunk {
    chunkId: string; // UUID for the chunk itself
    projectId: string; // UUID of the parent project
    fileName: string; // Conceptual file name (e.g., "activeContext.md")
    chunkIndex: number; // Order within the conceptual file
    chunkText: string; // The actual text content of the chunk
    // Embedding vector type depends on the library/DB, often number[]
    embedding?: number[]; // Embedding might be optional if generation fails or is deferred
    createdAt: Date;
    updatedAt: Date;
}

// Configuration specific to the Memory Bank services
export interface MemoryBankConfig {
    chromaDbUrl: string; // URL for the ChromaDB instance
    embeddingModelName: string;
    // Potentially add chunk size, overlap defaults here later
}

// Type for search results returned by the search tool
export interface SearchResult {
    text: string;
    fileName: string;
    chunkIndex: number;
    score: number | null; // Null for keyword search or if distance isn't available
}

// Type returned by DatabaseService search methods, includes score/distance
export interface DatabaseSearchResult extends MemoryBankChunk {
    score: number | null;
}

// --- Zod Schemas for potential runtime validation ---

export const ProjectSchema = z.object({
    projectId: z.string().uuid(),
    projectName: z.string(),
    createdAt: z.date(),
    lastModifiedAt: z.date(),
});

export const MemoryBankChunkSchema = z.object({
    chunkId: z.string().uuid(),
    projectId: z.string().uuid(),
    fileName: z.string(),
    chunkIndex: z.number().int().nonnegative(),
    chunkText: z.string(),
    embedding: z.array(z.number()).optional(), // Basic representation
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const SearchResultSchema = z.object({
    text: z.string(),
    fileName: z.string(),
    chunkIndex: z.number().int().nonnegative(),
    score: z.number().nullable(),
});
