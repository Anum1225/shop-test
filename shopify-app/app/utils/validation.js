/**
 * Comprehensive Input Validation and Sanitization Utilities
 * Provides security-focused validation and sanitization functions
 */

import { createValidationError } from './errorHandler.js';

// Regular expressions for validation
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s\-\(\)]{10,20}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  shopifyDomain: /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.myshopify\.com$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  shopifyId: /^gid:\/\/shopify\/[A-Za-z]+\/\d+$/,
  numericId: /^\d+$/,
  token: /^[a-zA-Z0-9_\-\.]{10,}$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  postalCode: /^[A-Za-z0-9\s\-]{3,10}$/,
  currency: /^[A-Z]{3}$/,
  orderStatus: /^(pending|confirmed|processing|shipped|delivered|cancelled|refunded)$/i
};

// Maximum lengths for different field types
const MAX_LENGTHS = {
  shortText: 100,
  mediumText: 500,
  longText: 2000,
  name: 100,
  email: 254,
  phone: 20,
  address: 200,
  city: 100,
  country: 100,
  postalCode: 20,
  token: 1000,
  description: 2000,
  title: 200,
  sku: 100,
  tag: 50
};

/**
 * Enhanced sanitization function with security focus
 */
export function sanitizeInput(input, type = 'string', options = {}) {
  if (input === null || input === undefined) {
    return options.allowNull ? null : '';
  }

  const maxLength = options.maxLength || MAX_LENGTHS[type] || MAX_LENGTHS.mediumText;

  switch (type) {
    case 'string':
    case 'text':
      return String(input)
        .trim()
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .slice(0, maxLength);

    case 'name':
      return String(input)
        .trim()
        .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .slice(0, MAX_LENGTHS.name);

    case 'email':
      return String(input)
        .trim()
        .toLowerCase()
        .slice(0, MAX_LENGTHS.email);

    case 'phone':
      return String(input)
        .replace(/[^\d\+\-\(\)\s]/g, '') // Keep only valid phone characters
        .trim()
        .slice(0, MAX_LENGTHS.phone);

    case 'number':
      const num = Number(input);
      if (isNaN(num)) return options.allowNull ? null : 0;
      if (options.min !== undefined && num < options.min) return options.min;
      if (options.max !== undefined && num > options.max) return options.max;
      return num;

    case 'integer':
      const int = parseInt(input, 10);
      if (isNaN(int)) return options.allowNull ? null : 0;
      if (options.min !== undefined && int < options.min) return options.min;
      if (options.max !== undefined && int > options.max) return options.max;
      return int;

    case 'boolean':
      if (typeof input === 'boolean') return input;
      if (typeof input === 'string') {
        const lower = input.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
      }
      return Boolean(input);

    case 'url':
      try {
        const url = new URL(input);
        return url.toString().slice(0, maxLength);
      } catch {
        return options.allowNull ? null : '';
      }

    case 'shopifyDomain':
      const domain = String(input).trim().toLowerCase();
      if (!domain.endsWith('.myshopify.com')) {
        return domain + '.myshopify.com';
      }
      return domain;

    case 'token':
      return String(input)
        .trim()
        .replace(/[^\w\-\.]/g, '') // Keep only safe token characters
        .slice(0, MAX_LENGTHS.token);

    case 'array':
      if (!Array.isArray(input)) return [];
      return input
        .map(item => sanitizeInput(item, options.itemType || 'string', options))
        .slice(0, options.maxItems || 100);

    case 'json':
      try {
        if (typeof input === 'string') {
          return JSON.parse(input);
        }
        return input;
      } catch {
        return options.allowNull ? null : {};
      }

    default:
      return String(input).trim().slice(0, maxLength);
  }
}

/**
 * Validate input against patterns and rules
 */
export function validateInput(value, type, options = {}) {
  const errors = [];

  // Check required fields
  if (options.required && (value === null || value === undefined || value === '')) {
    errors.push(`${type} is required`);
    return errors;
  }

  // Skip validation if value is empty and not required
  if (!options.required && (value === null || value === undefined || value === '')) {
    return errors;
  }

  // Type-specific validation
  switch (type) {
    case 'email':
      if (!PATTERNS.email.test(value)) {
        errors.push('Invalid email format');
      }
      break;

    case 'phone':
      if (!PATTERNS.phone.test(value)) {
        errors.push('Invalid phone number format');
      }
      break;

    case 'url':
      if (!PATTERNS.url.test(value)) {
        errors.push('Invalid URL format');
      }
      break;

    case 'shopifyDomain':
      if (!PATTERNS.shopifyDomain.test(value)) {
        errors.push('Invalid Shopify domain format');
      }
      break;

    case 'shopifyId':
      if (!PATTERNS.shopifyId.test(value) && !PATTERNS.numericId.test(value)) {
        errors.push('Invalid Shopify ID format');
      }
      break;

    case 'token':
      if (!PATTERNS.token.test(value)) {
        errors.push('Invalid token format');
      }
      if (value.length < 10) {
        errors.push('Token must be at least 10 characters long');
      }
      break;

    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        errors.push('Must be a valid number');
      } else {
        if (options.min !== undefined && num < options.min) {
          errors.push(`Must be at least ${options.min}`);
        }
        if (options.max !== undefined && num > options.max) {
          errors.push(`Must be at most ${options.max}`);
        }
      }
      break;

    case 'string':
      if (typeof value !== 'string') {
        errors.push('Must be a string');
      } else {
        if (options.minLength && value.length < options.minLength) {
          errors.push(`Must be at least ${options.minLength} characters long`);
        }
        if (options.maxLength && value.length > options.maxLength) {
          errors.push(`Must be at most ${options.maxLength} characters long`);
        }
        if (options.pattern && !options.pattern.test(value)) {
          errors.push('Invalid format');
        }
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push('Must be an array');
      } else {
        if (options.minItems && value.length < options.minItems) {
          errors.push(`Must have at least ${options.minItems} items`);
        }
        if (options.maxItems && value.length > options.maxItems) {
          errors.push(`Must have at most ${options.maxItems} items`);
        }
      }
      break;
  }

  return errors;
}

/**
 * Comprehensive validation for common Shopify app data structures
 */
export const validators = {
  orderData: (data) => {
    const errors = {};
    
    if (!data.id) errors.id = ['Order ID is required'];
    if (!data.order_number) errors.order_number = ['Order number is required'];
    if (!data.customer) errors.customer = ['Customer data is required'];
    
    return Object.keys(errors).length > 0 ? errors : null;
  },

  customerData: (data) => {
    const errors = {};
    
    if (data.email) {
      const emailErrors = validateInput(data.email, 'email', { required: false });
      if (emailErrors.length > 0) errors.email = emailErrors;
    }
    
    if (data.phone) {
      const phoneErrors = validateInput(data.phone, 'phone', { required: false });
      if (phoneErrors.length > 0) errors.phone = phoneErrors;
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  },

  tokenData: (data) => {
    const errors = {};
    
    const tokenErrors = validateInput(data.token, 'token', { required: true });
    if (tokenErrors.length > 0) errors.token = tokenErrors;
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
};

/**
 * Validate and sanitize request data
 */
export function validateAndSanitizeRequest(data, schema) {
  const sanitized = {};
  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Sanitize the input
    const sanitizedValue = sanitizeInput(value, rules.type, rules.options);
    
    // Validate the sanitized input
    const fieldErrors = validateInput(sanitizedValue, rules.type, rules.validation);
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    } else {
      sanitized[field] = sanitizedValue;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError('request_validation', 'Request validation failed', errors);
  }

  return sanitized;
}
