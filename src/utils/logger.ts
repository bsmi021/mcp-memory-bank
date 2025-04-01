/**
 * Simple structured logger utility that writes JSON to stderr.
 */

// Define log levels
enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

// Interface for the structured log entry
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>; // For additional structured data
    error?: {
        message: string;
        stack?: string;
        details?: any; // Include details from custom errors if available
    };
}

/**
 * Writes a structured log entry as JSON to stderr.
 * @param level - The log level.
 * @param message - The main log message.
 * @param context - Optional structured context object.
 * @param error - Optional error object for ERROR level logs.
 */
function writeLog(level: LogLevel, message: string, context?: Record<string, any>, error?: unknown) {
    const logEntry: Partial<LogEntry> = { // Use Partial initially
        timestamp: new Date().toISOString(),
        level,
        message,
    };

    if (context && Object.keys(context).length > 0) {
        logEntry.context = context;
    }

    if (level === LogLevel.ERROR && error) {
        if (error instanceof Error) {
            logEntry.error = {
                message: error.message,
                stack: error.stack,
                // Attempt to include details from custom BaseError or similar
                details: (error as any).details,
            };
        } else {
            logEntry.error = {
                message: 'Non-error object thrown',
                details: error,
            };
        }
    }

    // Use console.error to write JSON string to stderr
    console.error(JSON.stringify(logEntry));
}

// Logger object with methods for different levels
export const logger = {
    debug: (message: string, context?: Record<string, any>): void => {
        // Optional: Add check for LOG_LEVEL env var here
        // if (process.env.LOG_LEVEL?.toUpperCase() === 'DEBUG') { ... }
        writeLog(LogLevel.DEBUG, message, context);
    },
    info: (message: string, context?: Record<string, any>): void => {
        writeLog(LogLevel.INFO, message, context);
    },
    warn: (message: string, context?: Record<string, any>): void => {
        writeLog(LogLevel.WARN, message, context);
    },
    error: (message: string, error?: unknown, context?: Record<string, any>): void => {
        // Pass error object to writeLog for structured error logging
        writeLog(LogLevel.ERROR, message, context, error);
    },
};
