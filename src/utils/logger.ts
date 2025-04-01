// Configurable logging utility
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Default to 'info' if LOG_LEVEL is not set or invalid
const configuredLevelName = (process.env.LOG_LEVEL?.toLowerCase() ?? 'info') as LogLevel;
const configuredLevel = LOG_LEVELS[configuredLevelName] ?? LOG_LEVELS.info;

const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVELS[level] >= configuredLevel;
};

export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (shouldLog('debug')) {
            console.error(`[DEBUG] ${message}`, ...args);
        }
    },
    info: (message: string, ...args: any[]) => {
        if (shouldLog('info')) {
            console.error(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        // Warnings should probably always be shown, but let's respect the level for now
        if (shouldLog('warn')) {
            console.error(`[WARN] ${message}`, ...args);
        }
    },
    error: (message: string, ...args: any[]) => {
        // Errors should definitely always be shown
        if (shouldLog('error')) { // This will always be true if configuredLevel <= error
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
};
