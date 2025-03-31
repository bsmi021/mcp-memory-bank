import chalk from 'chalk'; // Using chalk for colored output

// Simple console logger with levels and colors

// Define log levels (optional, for potential filtering later)
enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR
}

// Basic configuration (could be enhanced)
const currentLogLevel = LogLevel.DEBUG; // Show all logs by default

export const logger = {
    debug: (message: string, ...args: unknown[]) => {
        if (currentLogLevel <= LogLevel.DEBUG) {
            console.error(chalk.gray(`[DEBUG] ${message}`), ...args); // Include message
        }
    },
    info: (message: string, ...args: unknown[]) => {
        if (currentLogLevel <= LogLevel.INFO) {
            console.error(chalk.blue(`[INFO] ${message}`), ...args); // Include message
        }
    },
    warn: (message: string, ...args: unknown[]) => {
        if (currentLogLevel <= LogLevel.WARN) {
            console.error(chalk.yellow(`[WARN] ${message}`), ...args); // Include message
        }
    },
    error: (message: string, ...args: unknown[]) => {
        if (currentLogLevel <= LogLevel.ERROR) {
            // Log error message and stack trace if available
            console.error(chalk.red(`[ERROR] ${message}`), ...args); // Include message
            const errorArg = args.find(arg => arg instanceof Error);
            if (errorArg instanceof Error && errorArg.stack) {
                console.error(chalk.red(errorArg.stack));
            }
        }
    }
};
