import { env } from "../config/env";

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  service: string;
  environment: string;
}

class Logger {
  private serviceName = "ds-e-commerce-backend";
  private environment = env.NODE_ENV;

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
    };

    if (context) {
      logEntry.context = context;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: env.NODE_ENV === "development" ? error.stack : undefined,
      };
    }

    return logEntry;
  }

  private output(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry, null, env.NODE_ENV === "development" ? 2 : 1);

    switch (logEntry.level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.INFO:
        console.info(logString);
        break;
      case LogLevel.DEBUG:
        if (env.NODE_ENV === "development") {
          console.debug(logString);
        }
        break;
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const logEntry = this.formatLog(LogLevel.ERROR, message, context, error);
    this.output(logEntry);
  }

  warn(message: string, context?: LogContext): void {
    const logEntry = this.formatLog(LogLevel.WARN, message, context);
    this.output(logEntry);
  }

  info(message: string, context?: LogContext): void {
    const logEntry = this.formatLog(LogLevel.INFO, message, context);
    this.output(logEntry);
  }

  debug(message: string, context?: LogContext): void {
    const logEntry = this.formatLog(LogLevel.DEBUG, message, context);
    this.output(logEntry);
  }

  // Convenience methods for common logging scenarios
  requestStart(method: string, path: string, context: LogContext): void {
    this.info(`${method} ${path} - Request started`, context);
  }

  requestEnd(method: string, path: string, statusCode: number, duration: number, context: LogContext): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const logEntry = this.formatLog(level, `${method} ${path} - Request completed`, {
      ...context,
      statusCode,
      duration,
    });
    this.output(logEntry);
  }

  authFailure(reason: string, context: LogContext): void {
    this.warn(`Authentication failed: ${reason}`, context);
  }

  databaseError(operation: string, error: Error, context: LogContext): void {
    this.error(`Database operation failed: ${operation}`, error, context);
  }

  validationError(message: string, context: LogContext): void {
    this.warn(`Validation error: ${message}`, context);
  }

  businessRuleViolation(rule: string, context: LogContext): void {
    this.warn(`Business rule violation: ${rule}`, context);
  }

  externalServiceError(service: string, error: Error, context: LogContext): void {
    this.error(`External service error: ${service}`, error, context);
  }
}

export const logger = new Logger();
