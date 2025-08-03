/**
 * Comprehensive Error Handling Utilities
 * Provides standardized error handling, logging, and response formatting
 */

import { json } from "@remix-run/node";

// Error types for better categorization
export const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  DATABASE: 'DATABASE_ERROR',
  NETWORK: 'NETWORK_ERROR',
  INTERNAL: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  SHOPIFY_API: 'SHOPIFY_API_ERROR'
};

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Custom error class with additional context
 */
export class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL, statusCode = 500, severity = ErrorSeverity.MEDIUM, context = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Enhanced logging utility with structured logging
 */
export const logger = {
  error: (message, error, context = {}) => {
    const logEntry = {
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      error: {
        name: error?.name,
        message: error?.message,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        type: error?.type,
        statusCode: error?.statusCode,
        severity: error?.severity
      },
      context,
      environment: process.env.NODE_ENV,
      pid: process.pid
    };
    console.error('🚨 ERROR:', JSON.stringify(logEntry, null, 2));

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToLoggingService(logEntry);
    }
  },

  warn: (message, context = {}) => {
    const logEntry = {
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV,
      pid: process.pid
    };
    console.warn('⚠️ WARNING:', JSON.stringify(logEntry, null, 2));
  },

  info: (message, context = {}) => {
    const logEntry = {
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV,
      pid: process.pid
    };
    console.log('ℹ️ INFO:', JSON.stringify(logEntry, null, 2));
  },

  debug: (message, context = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = {
        level: 'DEBUG',
        message,
        timestamp: new Date().toISOString(),
        context,
        environment: process.env.NODE_ENV,
        pid: process.pid
      };
      console.debug('🐛 DEBUG:', JSON.stringify(logEntry, null, 2));
    }
  },

  performance: (operation, duration, context = {}) => {
    const logEntry = {
      level: 'PERFORMANCE',
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV,
      pid: process.pid
    };

    // Log slow operations as warnings
    if (duration > 5000) { // 5 seconds
      console.warn('🐌 SLOW OPERATION:', JSON.stringify(logEntry, null, 2));
    } else if (duration > 1000) { // 1 second
      console.log('⏱️ PERFORMANCE:', JSON.stringify(logEntry, null, 2));
    } else if (process.env.NODE_ENV === 'development') {
      console.debug('⚡ PERFORMANCE:', JSON.stringify(logEntry, null, 2));
    }
  },

  audit: (action, user, context = {}) => {
    const logEntry = {
      level: 'AUDIT',
      action,
      user,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV,
      pid: process.pid
    };
    console.log('📋 AUDIT:', JSON.stringify(logEntry, null, 2));
  }
};

/**
 * Standardized error response formatter
 */
export function createErrorResponse(error, request = null) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default error properties
  let statusCode = 500;
  let type = ErrorTypes.INTERNAL;
  let message = 'An unexpected error occurred';
  let context = {};

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    type = error.type;
    message = error.message;
    context = error.context;
  } else if (error instanceof Error) {
    message = error.message;
    if (error.message.includes('fetch')) {
      type = ErrorTypes.NETWORK;
      statusCode = 503;
    } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      type = ErrorTypes.AUTHENTICATION;
      statusCode = 401;
    } else if (error.message.includes('forbidden') || error.message.includes('permission')) {
      type = ErrorTypes.AUTHORIZATION;
      statusCode = 403;
    } else if (error.message.includes('not found')) {
      type = ErrorTypes.NOT_FOUND;
      statusCode = 404;
    }
  }

  // Log the error
  logger.error(message, error, {
    url: request?.url,
    method: request?.method,
    userAgent: request?.headers?.get('user-agent'),
    ...context
  });

  // Create response payload
  const responsePayload = {
    success: false,
    error: {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && {
        stack: error?.stack,
        details: context
      })
    }
  };

  return json(responsePayload, { 
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': type,
      'X-Error-Timestamp': new Date().toISOString()
    }
  });
}

/**
 * Async error wrapper for route handlers with performance monitoring
 */
export function asyncErrorHandler(handler, operationName = 'unknown') {
  return async (args) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    try {
      logger.info(`Starting ${operationName}`, {
        requestId,
        url: args.request?.url,
        method: args.request?.method,
        userAgent: args.request?.headers?.get('user-agent')
      });

      const result = await handler(args);

      const duration = Date.now() - startTime;
      logger.performance(operationName, duration, {
        requestId,
        success: true,
        url: args.request?.url
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.performance(operationName, duration, {
        requestId,
        success: false,
        error: error.message,
        url: args.request?.url
      });

      return createErrorResponse(error, args.request);
    }
  };
}

/**
 * Validation error helper
 */
export function createValidationError(field, message, value = null) {
  return new AppError(
    `Validation failed for ${field}: ${message}`,
    ErrorTypes.VALIDATION,
    400,
    ErrorSeverity.LOW,
    { field, value, validationMessage: message }
  );
}

/**
 * External API error helper
 */
export function createExternalApiError(apiName, statusCode, message, responseData = null) {
  return new AppError(
    `External API error from ${apiName}: ${message}`,
    ErrorTypes.EXTERNAL_API,
    statusCode >= 400 && statusCode < 600 ? statusCode : 502,
    statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    { apiName, originalStatusCode: statusCode, responseData }
  );
}

/**
 * Database error helper
 */
export function createDatabaseError(operation, originalError) {
  return new AppError(
    `Database operation failed: ${operation}`,
    ErrorTypes.DATABASE,
    500,
    ErrorSeverity.HIGH,
    { operation, originalError: originalError?.message }
  );
}

/**
 * Shopify API error helper
 */
export function createShopifyApiError(operation, originalError, statusCode = 500) {
  return new AppError(
    `Shopify API error during ${operation}: ${originalError?.message || 'Unknown error'}`,
    ErrorTypes.SHOPIFY_API,
    statusCode,
    statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    { operation, originalError: originalError?.message }
  );
}

/**
 * Rate limiting error helper
 */
export function createRateLimitError(retryAfter = null) {
  return new AppError(
    'Rate limit exceeded. Please try again later.',
    ErrorTypes.RATE_LIMIT,
    429,
    ErrorSeverity.MEDIUM,
    { retryAfter }
  );
}

/**
 * Input sanitization helper
 */
export function sanitizeInput(input, type = 'string') {
  if (input === null || input === undefined) {
    return null;
  }

  switch (type) {
    case 'string':
      return String(input).trim().slice(0, 1000); // Limit string length
    case 'number':
      const num = Number(input);
      return isNaN(num) ? null : num;
    case 'boolean':
      return Boolean(input);
    case 'email':
      const email = String(input).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email) ? email : null;
    case 'url':
      try {
        return new URL(input).toString();
      } catch {
        return null;
      }
    default:
      return input;
  }
}

/**
 * Validate required fields
 */
export function validateRequiredFields(data, requiredFields) {
  const missing = [];

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined || data[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw createValidationError('required_fields', `Missing required fields: ${missing.join(', ')}`, missing);
  }

  return true;
}
