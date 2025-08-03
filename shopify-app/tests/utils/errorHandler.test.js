/**
 * Unit Tests for Error Handler Utilities
 * Tests the comprehensive error handling system
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  AppError, 
  ErrorTypes, 
  ErrorSeverity,
  createValidationError,
  createExternalApiError,
  createDatabaseError,
  createShopifyApiError,
  createRateLimitError,
  sanitizeInput,
  validateRequiredFields
} from '../../app/utils/errorHandler.js';

describe('Error Handler Utilities', () => {
  describe('AppError Class', () => {
    test('should create AppError with default values', () => {
      const error = new AppError('Test error');
      
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.type, ErrorTypes.INTERNAL);
      assert.strictEqual(error.statusCode, 500);
      assert.strictEqual(error.severity, ErrorSeverity.MEDIUM);
      assert.ok(error.timestamp);
      assert.deepStrictEqual(error.context, {});
    });

    test('should create AppError with custom values', () => {
      const context = { userId: '123' };
      const error = new AppError(
        'Validation failed',
        ErrorTypes.VALIDATION,
        400,
        ErrorSeverity.LOW,
        context
      );
      
      assert.strictEqual(error.message, 'Validation failed');
      assert.strictEqual(error.type, ErrorTypes.VALIDATION);
      assert.strictEqual(error.statusCode, 400);
      assert.strictEqual(error.severity, ErrorSeverity.LOW);
      assert.deepStrictEqual(error.context, context);
    });
  });

  describe('Error Factory Functions', () => {
    test('createValidationError should create proper validation error', () => {
      const error = createValidationError('email', 'Invalid format', 'test@');
      
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.type, ErrorTypes.VALIDATION);
      assert.strictEqual(error.statusCode, 400);
      assert.strictEqual(error.severity, ErrorSeverity.LOW);
      assert.ok(error.message.includes('email'));
      assert.ok(error.message.includes('Invalid format'));
      assert.strictEqual(error.context.field, 'email');
      assert.strictEqual(error.context.value, 'test@');
    });

    test('createExternalApiError should create proper external API error', () => {
      const error = createExternalApiError('TestAPI', 404, 'Not found', { id: '123' });
      
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.type, ErrorTypes.EXTERNAL_API);
      assert.strictEqual(error.statusCode, 404);
      assert.strictEqual(error.severity, ErrorSeverity.MEDIUM);
      assert.ok(error.message.includes('TestAPI'));
      assert.ok(error.message.includes('Not found'));
      assert.strictEqual(error.context.apiName, 'TestAPI');
      assert.strictEqual(error.context.originalStatusCode, 404);
    });

    test('createDatabaseError should create proper database error', () => {
      const originalError = new Error('Connection failed');
      const error = createDatabaseError('findUser', originalError);
      
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.type, ErrorTypes.DATABASE);
      assert.strictEqual(error.statusCode, 500);
      assert.strictEqual(error.severity, ErrorSeverity.HIGH);
      assert.ok(error.message.includes('findUser'));
      assert.strictEqual(error.context.operation, 'findUser');
      assert.strictEqual(error.context.originalError, 'Connection failed');
    });

    test('createShopifyApiError should create proper Shopify API error', () => {
      const originalError = new Error('Rate limit exceeded');
      const error = createShopifyApiError('getProducts', originalError, 429);
      
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.type, ErrorTypes.SHOPIFY_API);
      assert.strictEqual(error.statusCode, 429);
      assert.strictEqual(error.severity, ErrorSeverity.MEDIUM);
      assert.ok(error.message.includes('getProducts'));
      assert.strictEqual(error.context.operation, 'getProducts');
    });

    test('createRateLimitError should create proper rate limit error', () => {
      const error = createRateLimitError(60);
      
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.type, ErrorTypes.RATE_LIMIT);
      assert.strictEqual(error.statusCode, 429);
      assert.strictEqual(error.severity, ErrorSeverity.MEDIUM);
      assert.strictEqual(error.context.retryAfter, 60);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize string input', () => {
      assert.strictEqual(sanitizeInput('  hello world  '), 'hello world');
      assert.strictEqual(sanitizeInput(null), null);
      assert.strictEqual(sanitizeInput(undefined), null);
      assert.strictEqual(sanitizeInput(123), '123');
    });

    test('should sanitize number input', () => {
      assert.strictEqual(sanitizeInput('123', 'number'), 123);
      assert.strictEqual(sanitizeInput('abc', 'number'), null);
      assert.strictEqual(sanitizeInput(null, 'number'), null);
    });

    test('should sanitize boolean input', () => {
      assert.strictEqual(sanitizeInput('true', 'boolean'), true);
      assert.strictEqual(sanitizeInput('false', 'boolean'), true); // Boolean('false') is true
      assert.strictEqual(sanitizeInput('1', 'boolean'), true);
      assert.strictEqual(sanitizeInput('0', 'boolean'), true); // Boolean('0') is true
      assert.strictEqual(sanitizeInput(1, 'boolean'), true);
      assert.strictEqual(sanitizeInput(0, 'boolean'), false);
      assert.strictEqual(sanitizeInput('', 'boolean'), false);
    });

    test('should sanitize email input', () => {
      assert.strictEqual(sanitizeInput('  TEST@EXAMPLE.COM  ', 'email'), 'test@example.com');
      assert.strictEqual(sanitizeInput('invalid-email', 'email'), null);
    });

    test('should handle URL sanitization', () => {
      const validUrl = 'https://example.com/path';
      assert.strictEqual(sanitizeInput(validUrl, 'url'), validUrl);
      assert.strictEqual(sanitizeInput('invalid-url', 'url'), null);
    });
  });

  describe('Required Fields Validation', () => {
    test('should pass validation when all required fields are present', () => {
      const data = { name: 'John', email: 'john@example.com', age: 30 };
      const requiredFields = ['name', 'email'];
      
      assert.doesNotThrow(() => {
        validateRequiredFields(data, requiredFields);
      });
    });

    test('should throw validation error when required fields are missing', () => {
      const data = { name: 'John' };
      const requiredFields = ['name', 'email', 'age'];
      
      assert.throws(() => {
        validateRequiredFields(data, requiredFields);
      }, (error) => {
        assert.ok(error instanceof AppError);
        assert.strictEqual(error.type, ErrorTypes.VALIDATION);
        assert.ok(error.message.includes('email'));
        assert.ok(error.message.includes('age'));
        return true;
      });
    });

    test('should throw validation error when fields are empty strings', () => {
      const data = { name: '', email: 'john@example.com' };
      const requiredFields = ['name', 'email'];
      
      assert.throws(() => {
        validateRequiredFields(data, requiredFields);
      }, (error) => {
        assert.ok(error instanceof AppError);
        assert.strictEqual(error.type, ErrorTypes.VALIDATION);
        assert.ok(error.message.includes('name'));
        return true;
      });
    });

    test('should throw validation error when fields are null or undefined', () => {
      const data = { name: null, email: undefined, age: 30 };
      const requiredFields = ['name', 'email'];
      
      assert.throws(() => {
        validateRequiredFields(data, requiredFields);
      }, (error) => {
        assert.ok(error instanceof AppError);
        assert.strictEqual(error.type, ErrorTypes.VALIDATION);
        assert.ok(error.message.includes('name'));
        assert.ok(error.message.includes('email'));
        return true;
      });
    });
  });

  describe('Error Types and Severity', () => {
    test('should have all required error types', () => {
      const expectedTypes = [
        'VALIDATION_ERROR',
        'AUTHENTICATION_ERROR',
        'AUTHORIZATION_ERROR',
        'NOT_FOUND_ERROR',
        'EXTERNAL_API_ERROR',
        'DATABASE_ERROR',
        'NETWORK_ERROR',
        'INTERNAL_SERVER_ERROR',
        'RATE_LIMIT_ERROR',
        'SHOPIFY_API_ERROR'
      ];
      
      expectedTypes.forEach(type => {
        assert.ok(Object.values(ErrorTypes).includes(type));
      });
    });

    test('should have all required severity levels', () => {
      const expectedSeverities = ['low', 'medium', 'high', 'critical'];
      
      expectedSeverities.forEach(severity => {
        assert.ok(Object.values(ErrorSeverity).includes(severity));
      });
    });
  });
});
