/**
 * Base custom error class for application-specific errors.
 */
export class BaseError extends Error {
    public readonly code: string;
    public readonly status: number; // HTTP status code equivalent
    public readonly details?: unknown; // Additional details

    constructor(message: string, code: string, status: number, details?: unknown) {
        super(message);
        this.name = this.constructor.name; // Set the error name to the class name
        this.code = code;
        this.status = status;
        this.details = details;
        // Capture stack trace (excluding constructor)
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error for validation failures (e.g., invalid input).
 * Maps typically to a 400 Bad Request or MCP InvalidParams.
 */
export class ValidationError extends BaseError {
    constructor(message: string, details?: unknown) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}

/**
 * Error when an expected entity or resource is not found.
 * Maps typically to a 404 Not Found.
 */
export class NotFoundError extends BaseError {
    constructor(message: string = "Resource not found") {
        super(message, 'NOT_FOUND', 404);
    }
}

/**
 * Error for configuration problems.
 */
export class ConfigurationError extends BaseError {
    constructor(message: string) {
        super(message, 'CONFIG_ERROR', 500);
    }
}

/**
 * Error for issues during service processing unrelated to input validation.
 * Maps typically to a 500 Internal Server Error or MCP InternalError.
 */
export class ServiceError extends BaseError {
    constructor(message: string, details?: unknown) {
        super(message, 'SERVICE_ERROR', 500, details);
    }
}

// Add other specific error types as needed (e.g., DatabaseError, AuthenticationError)
