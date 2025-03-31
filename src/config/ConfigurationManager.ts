// Import config types for services as they are added
import { MemoryBankConfig } from '../types/index.js'; // Import our config type
import path from 'path';
import { fileURLToPath } from 'url';

// Define the structure for all configurations managed
interface ManagedConfigs {
    memoryBank: Required<MemoryBankConfig>;
    // Add other service config types here:
    // yourService: Required<YourServiceConfig>;
}

/**
 * Centralized configuration management for all services.
 * Implements singleton pattern to ensure consistent configuration.
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager | null = null;
    private static instanceLock = false;

    private config: ManagedConfigs;

    private constructor() {
        // Get the runtime directory path (dist folder)
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const distDir = path.dirname(__dirname); // Since compiled code is in dist/config, go up one level to dist/

        // Initialize with default configurations
        this.config = {
            memoryBank: {
                // Define defaults for MemoryBank service
                chromaDbUrl: "http://localhost:8000", // Default ChromaDB URL
                embeddingModelName: "Xenova/all-MiniLM-L6-v2", // Default model
            },
            // Initialize other service configs with defaults:
            // yourService: {
            //   someSetting: 'default value',
            //   retryCount: 3,
            // },
        };

        // Load overrides from environment variables
        this.loadEnvironmentOverrides();
    }

    /**
     * Get the singleton instance of ConfigurationManager.
     * Basic lock to prevent race conditions during initial creation.
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            if (!ConfigurationManager.instanceLock) {
                ConfigurationManager.instanceLock = true; // Lock
                try {
                    ConfigurationManager.instance = new ConfigurationManager();
                } finally {
                    ConfigurationManager.instanceLock = false; // Unlock
                }
            } else {
                // Basic busy wait if locked (consider a more robust async lock if high contention is expected)
                while (ConfigurationManager.instanceLock) { }
                // Re-check instance after wait
                if (!ConfigurationManager.instance) {
                    // This path is less likely but handles edge cases if lock logic needs refinement
                    return ConfigurationManager.getInstance();
                }
            }
        }
        return ConfigurationManager.instance;
    }

    // --- Getters for specific configurations ---

    public getMemoryBankConfig(): Required<MemoryBankConfig> {
        // Return a copy to prevent accidental modification of the internal state
        return { ...this.config.memoryBank };
    }

    // Add getters for other service configs:
    // public getYourServiceConfig(): Required<YourServiceConfig> {
    //   return { ...this.config.yourService };
    // }

    // --- Updaters for specific configurations (if runtime updates are needed) ---
    // Add updaters if needed, similar pattern to getters but merging updates

    /**
     * Loads configuration overrides from environment variables.
     * Call this in the constructor.
     */
    private loadEnvironmentOverrides(): void {
        // Load MemoryBank config from environment variables
        if (process.env.CHROMADB_URL && process.env.CHROMADB_URL.trim() !== '') {
            // TODO: Add URL validation?
            this.config.memoryBank.chromaDbUrl = process.env.CHROMADB_URL.trim();
        }
        if (process.env.MCP_MEMBANK_EMBEDDING_MODEL && process.env.MCP_MEMBANK_EMBEDDING_MODEL.trim() !== '') {
            this.config.memoryBank.embeddingModelName = process.env.MCP_MEMBANK_EMBEDDING_MODEL.trim();
        }

        // Add logic for other services based on their environment variables
        // if (process.env.YOUR_SERVICE_RETRY_COUNT) {
        //   const retryCount = parseInt(process.env.YOUR_SERVICE_RETRY_COUNT, 10);
        //   if (!isNaN(retryCount)) {
        //     this.config.yourService.retryCount = retryCount;
        //   }
        // }
    }
}
