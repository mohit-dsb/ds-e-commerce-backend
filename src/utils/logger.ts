import { env } from "@/config/env";

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
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
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
        // eslint-disable-next-line no-console
        console.info(logString);
        break;
      case LogLevel.DEBUG:
        if (env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
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

  databaseError(operation: string, error: Error): void {
    this.error(`Database operation failed: ${operation}`, error);
  }

  validationError(message: string, context: LogContext): void {
    this.warn(`Validation error: ${message}`, context);
  }
}

export const logger = new Logger();
