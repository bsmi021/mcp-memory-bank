import { z } from 'zod';
import { SearchResultSchema } from '../types/index.js'; // Import if needed for output schema

export const TOOL_NAME_SEARCH = "memoryBank_search";

export const TOOL_DESCRIPTION_SEARCH = `Searches the content chunks stored for a specific project. Can perform either keyword-based text matching or semantic similarity search based on the meaning of the query. Returns a list of the most relevant text chunks found.`;

export const TOOL_PARAMS_SEARCH = {
    projectId: z.string().uuid()
        .describe("The unique identifier (UUID) of the project to search within."),
    query: z.string().trim().min(1)
        .describe("The search query string. For semantic search, this will be embedded. For keyword search, this text will be matched."),
    searchType: z.enum(['semantic', 'keyword']).default('semantic')
        .describe("The type of search to perform. 'semantic' uses vector similarity based on meaning (default). 'keyword' performs text matching."),
    topK: z.number().int().min(1).max(20).default(5)
        .describe("The maximum number of relevant chunks to return (1-20)."),
    fileFilter: z.array(z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+\.md$/)).optional()
        .describe("Optional. A list of conceptual file names to restrict the search to. If provided, only chunks from these files will be considered.")
};

// Define the expected success output structure
export const SearchOutputSchema = z.object({
    results: z.array(SearchResultSchema).describe("A list of search results. For 'semantic' search, results are ordered by relevance (lowest score/distance is best). For 'keyword' search, score is null and order is based on file name and chunk index.")
});
