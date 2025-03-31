import { pipeline, env, Pipeline, AutoTokenizer, PreTrainedTokenizer, FeatureExtractionPipeline } from '@xenova/transformers'; // Import FeatureExtractionPipeline
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { logger } from '../utils/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Define the structure for the text splitter options
interface TextSplitterOptions {
    chunkSize: number; // Target size in tokens
    chunkOverlap: number; // Overlap size in tokens
}

export class EmbeddingService {
    private static instance: EmbeddingService | null = null;
    // Use the specific pipeline type returned for feature-extraction
    private extractor: FeatureExtractionPipeline | null = null;
    private tokenizer: PreTrainedTokenizer | null = null; // Store tokenizer separately for easier access
    private modelName: string;
    private isInitialized = false;

    private constructor() {
        const configManager = ConfigurationManager.getInstance();
        const memConfig = configManager.getMemoryBankConfig();
        this.modelName = memConfig.embeddingModelName;
        logger.info(`EmbeddingService configured with model: ${this.modelName}`);
    }

    /**
     * Get the singleton instance of EmbeddingService.
     */
    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    /**
     * Initializes the embedding model pipeline and tokenizer. Must be called before use.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.debug("EmbeddingService already initialized.");
            return;
        }
        logger.info(`Initializing embedding model and tokenizer: ${this.modelName}...`);
        try {
            env.allowRemoteModels = true;
            // Consider adding env.cacheDir = './.cache';
            logger.info(`Loading pipeline for model: ${this.modelName}`);
            // Load pipeline first
            this.extractor = await pipeline('feature-extraction', this.modelName);
            if (!this.extractor) {
                throw new Error(`Pipeline creation returned null or undefined for model ${this.modelName}`);
            }
            // Load tokenizer separately using the same model name
            this.tokenizer = await AutoTokenizer.from_pretrained(this.modelName);
            if (!this.tokenizer) {
                throw new Error(`Tokenizer creation returned null or undefined for model ${this.modelName}`);
            }

            this.isInitialized = true;
            logger.info(`Embedding model '${this.modelName}' and tokenizer initialized successfully.`);
        } catch (error) {
            logger.error(`Failed to initialize embedding model/tokenizer '${this.modelName}':`, error);
            this.isInitialized = false; // Ensure it's marked as not ready
            this.extractor = null;
            this.tokenizer = null;
            throw new McpError(ErrorCode.InternalError, `Failed to load embedding model/tokenizer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generates an embedding vector for the given text.
     * @param text - The text to embed.
     * @returns A promise resolving to the embedding vector (number[]).
     * @throws McpError if the service is not initialized or embedding fails.
     */
    public async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isInitialized || !this.extractor) {
            logger.error("EmbeddingService pipeline not initialized. Call initialize() first.");
            throw new McpError(ErrorCode.InternalError, "Embedding service pipeline is not ready.");
        }
        logger.debug(`Generating embedding for text snippet (length: ${text.length})...`);
        try {
            const output = await this.extractor(text, { pooling: 'mean', normalize: true });

            // Directly attempt to convert the output data to a number array
            let embedding: number[] | null = null;
            if (output?.data) {
                // output.data could be various typed arrays, Array.from handles them
                embedding = Array.from(output.data);
            } else if (Array.isArray(output) && output[0]?.data) {
                // Handle cases where output might be an array
                embedding = Array.from(output[0].data);
            }

            if (embedding) {
                logger.debug(`Embedding generated successfully (dimension: ${embedding.length})`);
                return embedding;
            } else {
                logger.error("Embedding pipeline returned unexpected output structure or null data:", output);
                throw new Error("Embedding pipeline returned unexpected output structure or null data.");
            }
        } catch (error: any) {
            logger.error("Failed to generate embedding:", error);
            throw new McpError(ErrorCode.InternalError, `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Splits text recursively based on separators, aiming for a target token count.
     * Uses the loaded tokenizer for accurate length measurement.
     */
    private async _splitTextWithTokenizer(
        text: string,
        options: TextSplitterOptions,
        tokenizer: PreTrainedTokenizer,
        separators: string[] = ["\n\n", "\n", ". ", "? ", "! ", " ", ""] // Prioritized separators
    ): Promise<string[]> {
        const { chunkSize, chunkOverlap } = options;
        const finalChunks: string[] = [];

        // Get the first separator
        const separator = separators[0];
        const remainingSeparators = separators.slice(1);

        // Split the text by the current separator
        let splits: string[];
        if (separator === "") { // Base case: split remaining text if no other separators work
            // If even splitting by "" doesn't work (e.g., empty string input), return empty
            if (text.length === 0) return [];
            // Split into chunks respecting chunkSize (token count)
            const tokenIds = tokenizer.encode(text);
            for (let i = 0; i < tokenIds.length; i += chunkSize - chunkOverlap) {
                const chunkTokenIds = tokenIds.slice(i, i + chunkSize);
                if (chunkTokenIds.length > 0) {
                    finalChunks.push(tokenizer.decode(chunkTokenIds, { skip_special_tokens: true }));
                }
            }
            return finalChunks; // Return chunks split by character/token limit
        } else {
            splits = text.split(separator);
        }

        let currentChunk = "";
        let currentChunkTokens = 0;

        for (let i = 0; i < splits.length; i++) {
            const split = splits[i];
            // Add the separator back unless it's the first split or empty separator
            const splitWithSeparator = (i > 0 && separator !== "") ? separator + split : split;
            const splitTokens = tokenizer.encode(splitWithSeparator).length;

            if (splitTokens > chunkSize) {
                // If a single split is too large, recurse with finer separators
                logger.warn(`Split segment too large (${splitTokens} tokens > ${chunkSize}), recursing with finer separators.`);
                const subChunks = await this._splitTextWithTokenizer(split, options, tokenizer, remainingSeparators);
                finalChunks.push(...subChunks);
                currentChunk = ""; // Reset current chunk after recursion
                currentChunkTokens = 0;
                continue; // Move to the next split
            }

            if (currentChunkTokens + splitTokens <= chunkSize) {
                // Add to the current chunk
                currentChunk += splitWithSeparator;
                currentChunkTokens += splitTokens;
            } else {
                // Current chunk is full, finalize it
                if (currentChunk.trim().length > 0) {
                    finalChunks.push(currentChunk);
                }

                // Start a new chunk, considering overlap
                // Find where the overlap should start in the previous chunk
                const overlapStartIndex = Math.max(0, currentChunk.length - Math.floor(chunkOverlap * 4)); // Rough char estimate for overlap start
                const overlapText = currentChunk.substring(overlapStartIndex);
                // TODO: Refine overlap using tokens instead of characters for better accuracy

                currentChunk = overlapText + splitWithSeparator; // Start new chunk with overlap + current split
                currentChunkTokens = tokenizer.encode(currentChunk).length;

                // Handle cases where overlap + split immediately exceeds chunk size
                if (currentChunkTokens > chunkSize) {
                    logger.warn(`Overlap + new split segment too large (${currentChunkTokens} tokens > ${chunkSize}). Consider smaller chunk size or overlap.`);
                    // Option 1: Just add the split itself as a chunk (might lose overlap context)
                    // finalChunks.push(splitWithSeparator); currentChunk = ""; currentChunkTokens = 0;
                    // Option 2: Recurse on the split (like above) - safer
                    const subChunks = await this._splitTextWithTokenizer(splitWithSeparator, options, tokenizer, remainingSeparators);
                    finalChunks.push(...subChunks);
                    currentChunk = ""; currentChunkTokens = 0;
                }
            }
        }

        // Add the last remaining chunk if it's not empty
        if (currentChunk.trim().length > 0) {
            finalChunks.push(currentChunk);
        }

        return finalChunks;
    }


    /**
     * Chunks the given text based on the defined strategy using the loaded tokenizer.
     * @param content - The full text content to chunk.
     * @returns A promise resolving to an array of text chunks.
     */
    public async chunkText(content: string): Promise<string[]> {
        if (!this.isInitialized || !this.tokenizer) {
            logger.error("EmbeddingService or its tokenizer not initialized for chunking. Call initialize() first.");
            throw new McpError(ErrorCode.InternalError, "Embedding service/tokenizer is not ready for chunking.");
        }
        logger.debug(`Chunking content (length: ${content.length})...`);

        // Define chunking options based on RFC-002
        const options: TextSplitterOptions = {
            chunkSize: 450, // Target tokens
            chunkOverlap: 50  // Target tokens
        };

        const chunks = await this._splitTextWithTokenizer(content, options, this.tokenizer);

        logger.debug(`Content split into ${chunks.length} chunks.`);
        return chunks;
    }
}
