/**
 * Unit Tests for Validation Utilities
 * Tests the comprehensive input validation and sanitization system
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  sanitizeInput,
  validateInput,
  validateAndSanitizeRequest,
  validators
} from '../../app/utils/validation.js';

describe('Validation Utilities', () => {
  describe('Input Sanitization', () => {
    test('should sanitize string input correctly', () => {
      assert.strictEqual(sanitizeInput('  hello world  '), 'hello world');
      assert.strictEqual(sanitizeInput('hello\x00world'), 'helloworld'); // Remove control chars
      assert.strictEqual(sanitizeInput('a'.repeat(1000)), 'a'.repeat(500)); // Limit length
    });

    test('should sanitize name input correctly', () => {
      assert.strictEqual(sanitizeInput('John <script>', 'name'), 'John script');
      assert.strictEqual(sanitizeInput('  John   Doe  ', 'name'), 'John Doe');
      assert.strictEqual(sanitizeInput('John"Doe', 'name'), 'JohnDoe');
    });

    test('should sanitize email input correctly', () => {
      assert.strictEqual(sanitizeInput('  TEST@EXAMPLE.COM  ', 'email'), 'test@example.com');
      assert.strictEqual(sanitizeInput('User@Domain.COM', 'email'), 'user@domain.com');
    });

    test('should sanitize phone input correctly', () => {
      assert.strictEqual(sanitizeInput('+1 (555) 123-4567', 'phone'), '+1 (555) 123-4567');
      assert.strictEqual(sanitizeInput('555.123.4567abc', 'phone'), '5551234567');
    });

    test('should sanitize number input correctly', () => {
      assert.strictEqual(sanitizeInput('123', 'number'), 123);
      assert.strictEqual(sanitizeInput('123.45', 'number'), 123.45);
      assert.strictEqual(sanitizeInput('abc', 'number'), 0);
      assert.strictEqual(sanitizeInput('123', 'number', { min: 100, max: 200 }), 123);
      assert.strictEqual(sanitizeInput('50', 'number', { min: 100 }), 100);
      assert.strictEqual(sanitizeInput('300', 'number', { max: 200 }), 200);
    });

    test('should sanitize integer input correctly', () => {
      assert.strictEqual(sanitizeInput('123.45', 'integer'), 123);
      assert.strictEqual(sanitizeInput('abc', 'integer'), 0);
      assert.strictEqual(sanitizeInput('50', 'integer', { min: 100 }), 100);
    });

    test('should sanitize boolean input correctly', () => {
      assert.strictEqual(sanitizeInput('true', 'boolean'), true);
      assert.strictEqual(sanitizeInput('false', 'boolean'), false);
      assert.strictEqual(sanitizeInput('1', 'boolean'), true);
      assert.strictEqual(sanitizeInput('yes', 'boolean'), true);
      assert.strictEqual(sanitizeInput('no', 'boolean'), false);
      assert.strictEqual(sanitizeInput(1, 'boolean'), true);
      assert.strictEqual(sanitizeInput(0, 'boolean'), false);
    });

    test('should sanitize URL input correctly', () => {
      const validUrl = 'https://example.com/path';
      assert.strictEqual(sanitizeInput(validUrl, 'url'), validUrl);
      assert.strictEqual(sanitizeInput('invalid-url', 'url'), '');
    });

    test('should sanitize Shopify domain correctly', () => {
      assert.strictEqual(sanitizeInput('mystore', 'shopifyDomain'), 'mystore.myshopify.com');
      assert.strictEqual(sanitizeInput('mystore.myshopify.com', 'shopifyDomain'), 'mystore.myshopify.com');
      assert.strictEqual(sanitizeInput('  MyStore  ', 'shopifyDomain'), 'mystore.myshopify.com');
    });

    test('should sanitize token input correctly', () => {
      assert.strictEqual(sanitizeInput('abc123_-def.456', 'token'), 'abc123_-def.456');
      assert.strictEqual(sanitizeInput('abc@123#def', 'token'), 'abc123def');
    });

    test('should sanitize array input correctly', () => {
      const input = ['  item1  ', 'item2', 'item3'];
      const result = sanitizeInput(input, 'array');
      assert.deepStrictEqual(result, ['item1', 'item2', 'item3']);
      
      const limitedResult = sanitizeInput(input, 'array', { maxItems: 2 });
      assert.deepStrictEqual(limitedResult, ['item1', 'item2']);
    });

    test('should sanitize JSON input correctly', () => {
      const validJson = '{"key": "value"}';
      const result = sanitizeInput(validJson, 'json');
      assert.deepStrictEqual(result, { key: 'value' });
      
      const invalidJson = 'invalid json';
      const invalidResult = sanitizeInput(invalidJson, 'json');
      assert.deepStrictEqual(invalidResult, {});
    });

    test('should handle null and undefined inputs', () => {
      assert.strictEqual(sanitizeInput(null), '');
      assert.strictEqual(sanitizeInput(undefined), '');
      assert.strictEqual(sanitizeInput(null, 'string', { allowNull: true }), null);
      assert.strictEqual(sanitizeInput(undefined, 'string', { allowNull: true }), null);
    });
  });

  describe('Input Validation', () => {
    test('should validate email format', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org'];
      const invalidEmails = ['invalid-email', '@example.com', 'user@', 'user@.com'];
      
      validEmails.forEach(email => {
        const errors = validateInput(email, 'email');
        assert.strictEqual(errors.length, 0, `Expected ${email} to be valid`);
      });
      
      invalidEmails.forEach(email => {
        const errors = validateInput(email, 'email');
        assert.ok(errors.length > 0, `Expected ${email} to be invalid`);
      });
    });

    test('should validate phone format', () => {
      const validPhones = ['+1 555 123 4567', '(555) 123-4567', '+44 20 7946 0958'];
      const invalidPhones = ['123', 'abc-def-ghij'];

      validPhones.forEach(phone => {
        const errors = validateInput(phone, 'phone');
        assert.strictEqual(errors.length, 0, `Expected ${phone} to be valid`);
      });

      invalidPhones.forEach(phone => {
        const errors = validateInput(phone, 'phone');
        assert.ok(errors.length > 0, `Expected ${phone} to be invalid`);
      });
    });

    test('should validate URL format', () => {
      const validUrls = ['https://example.com', 'http://test.org/path', 'https://sub.domain.com/path?query=1'];
      const invalidUrls = ['not-a-url', 'ftp://example.com', 'example.com'];
      
      validUrls.forEach(url => {
        const errors = validateInput(url, 'url');
        assert.strictEqual(errors.length, 0, `Expected ${url} to be valid`);
      });
      
      invalidUrls.forEach(url => {
        const errors = validateInput(url, 'url');
        assert.ok(errors.length > 0, `Expected ${url} to be invalid`);
      });
    });

    test('should validate Shopify domain format', () => {
      const validDomains = ['mystore.myshopify.com', 'test-store.myshopify.com'];
      const invalidDomains = ['mystore', 'mystore.com', 'invalid.domain.com'];
      
      validDomains.forEach(domain => {
        const errors = validateInput(domain, 'shopifyDomain');
        assert.strictEqual(errors.length, 0, `Expected ${domain} to be valid`);
      });
      
      invalidDomains.forEach(domain => {
        const errors = validateInput(domain, 'shopifyDomain');
        assert.ok(errors.length > 0, `Expected ${domain} to be invalid`);
      });
    });

    test('should validate Shopify ID format', () => {
      const validIds = ['gid://shopify/Product/123', '123456789'];
      const invalidIds = ['invalid-id', 'gid://invalid/Product/123', 'abc123'];
      
      validIds.forEach(id => {
        const errors = validateInput(id, 'shopifyId');
        assert.strictEqual(errors.length, 0, `Expected ${id} to be valid`);
      });
      
      invalidIds.forEach(id => {
        const errors = validateInput(id, 'shopifyId');
        assert.ok(errors.length > 0, `Expected ${id} to be invalid`);
      });
    });

    test('should validate token format', () => {
      const validTokens = ['abc123def456', 'token_with-dots.and_underscores', 'a'.repeat(20)];
      const invalidTokens = ['short', 'token with spaces', 'token@with#special'];
      
      validTokens.forEach(token => {
        const errors = validateInput(token, 'token');
        assert.strictEqual(errors.length, 0, `Expected ${token} to be valid`);
      });
      
      invalidTokens.forEach(token => {
        const errors = validateInput(token, 'token');
        assert.ok(errors.length > 0, `Expected ${token} to be invalid`);
      });
    });

    test('should validate number constraints', () => {
      const errors1 = validateInput(50, 'number', { min: 100 });
      assert.ok(errors1.length > 0);
      assert.ok(errors1[0].includes('at least 100'));
      
      const errors2 = validateInput(200, 'number', { max: 100 });
      assert.ok(errors2.length > 0);
      assert.ok(errors2[0].includes('at most 100'));
      
      const errors3 = validateInput(150, 'number', { min: 100, max: 200 });
      assert.strictEqual(errors3.length, 0);
    });

    test('should validate string constraints', () => {
      const errors1 = validateInput('ab', 'string', { minLength: 5 });
      assert.ok(errors1.length > 0);
      assert.ok(errors1[0].includes('at least 5 characters'));
      
      const errors2 = validateInput('a'.repeat(20), 'string', { maxLength: 10 });
      assert.ok(errors2.length > 0);
      assert.ok(errors2[0].includes('at most 10 characters'));
      
      const errors3 = validateInput('hello', 'string', { minLength: 3, maxLength: 10 });
      assert.strictEqual(errors3.length, 0);
    });

    test('should validate array constraints', () => {
      const errors1 = validateInput([1], 'array', { minItems: 3 });
      assert.ok(errors1.length > 0);
      assert.ok(errors1[0].includes('at least 3 items'));
      
      const errors2 = validateInput([1, 2, 3, 4, 5], 'array', { maxItems: 3 });
      assert.ok(errors2.length > 0);
      assert.ok(errors2[0].includes('at most 3 items'));
      
      const errors3 = validateInput([1, 2, 3], 'array', { minItems: 2, maxItems: 5 });
      assert.strictEqual(errors3.length, 0);
    });

    test('should handle required field validation', () => {
      const errors1 = validateInput('', 'string', { required: true });
      assert.ok(errors1.length > 0);
      assert.ok(errors1[0].includes('required'));
      
      const errors2 = validateInput(null, 'string', { required: true });
      assert.ok(errors2.length > 0);
      assert.ok(errors2[0].includes('required'));
      
      const errors3 = validateInput('', 'string', { required: false });
      assert.strictEqual(errors3.length, 0);
      
      const errors4 = validateInput('value', 'string', { required: true });
      assert.strictEqual(errors4.length, 0);
    });
  });

  describe('Predefined Validators', () => {
    test('should validate order data', () => {
      const validOrder = {
        id: '123',
        order_number: 'ORD-001',
        customer: { name: 'John Doe' }
      };
      
      const invalidOrder = {
        order_number: 'ORD-001'
        // missing id and customer
      };
      
      assert.strictEqual(validators.orderData(validOrder), null);
      
      const errors = validators.orderData(invalidOrder);
      assert.ok(errors);
      assert.ok(errors.id);
      assert.ok(errors.customer);
    });

    test('should validate customer data', () => {
      const validCustomer = {
        email: 'john@example.com',
        phone: '+1 555 123 4567'
      };
      
      const invalidCustomer = {
        email: 'invalid-email',
        phone: '123'
      };
      
      assert.strictEqual(validators.customerData(validCustomer), null);
      
      const errors = validators.customerData(invalidCustomer);
      assert.ok(errors);
      assert.ok(errors.email);
      assert.ok(errors.phone);
    });

    test('should validate token data', () => {
      const validToken = {
        token: 'valid_token_123456789'
      };
      
      const invalidToken = {
        token: 'short'
      };
      
      assert.strictEqual(validators.tokenData(validToken), null);
      
      const errors = validators.tokenData(invalidToken);
      assert.ok(errors);
      assert.ok(errors.token);
    });
  });

  describe('Request Validation and Sanitization', () => {
    test('should validate and sanitize valid request', () => {
      const requestData = {
        name: '  John Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        age: '25'
      };
      
      const schema = {
        name: {
          type: 'name',
          validation: { required: true }
        },
        email: {
          type: 'email',
          validation: { required: true }
        },
        age: {
          type: 'number',
          validation: { required: true, min: 18 }
        }
      };
      
      const result = validateAndSanitizeRequest(requestData, schema);
      
      assert.strictEqual(result.name, 'John Doe');
      assert.strictEqual(result.email, 'john@example.com');
      assert.strictEqual(result.age, 25);
    });

    test('should throw validation error for invalid request', () => {
      const requestData = {
        name: '',
        email: 'invalid-email',
        age: '15'
      };
      
      const schema = {
        name: {
          type: 'name',
          validation: { required: true }
        },
        email: {
          type: 'email',
          validation: { required: true }
        },
        age: {
          type: 'number',
          validation: { required: true, min: 18 }
        }
      };
      
      assert.throws(() => {
        validateAndSanitizeRequest(requestData, schema);
      }, (error) => {
        assert.strictEqual(error.type, 'VALIDATION_ERROR');
        // The error context contains the validation errors object
        const validationErrors = error.context.value;
        assert.ok(validationErrors.name);
        assert.ok(validationErrors.email);
        assert.ok(validationErrors.age);
        return true;
      });
    });
  });
});
