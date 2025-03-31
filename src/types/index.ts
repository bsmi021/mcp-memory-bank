// Export all types and interfaces from this barrel file
export * from './memoryBankTypes.js'; // Export our new Memory Bank types
// export * from './yourServiceTypes.js'; // Add new type exports here

// Define common types used across services/tools if any
export interface CommonContext {
    sessionId?: string;
    userId?: string;
}
