/**
 * Rate Limiting Utilities
 * Implements rate limiting to prevent API abuse and ensure compliance with Shopify limits
 */

import { createRateLimitError, logger } from './errorHandler.js';

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map();

// Rate limit configurations
const RATE_LIMITS = {
  // General API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Shopify API calls (more restrictive)
  shopify: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 40, // 40 requests per minute (Shopify REST API limit is 40/minute)
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't count failed requests against limit
  },
  
  // External API calls
  external: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful auth against limit
    skipFailedRequests: false,
  },
  
  // Token operations
  token: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // 5 token operations per 5 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  }
};

/**
 * Generate a unique key for rate limiting
 */
function generateKey(identifier, endpoint, type = 'api') {
  return `${type}:${identifier}:${endpoint}`;
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(request) {
  // Try to get shop from session first
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  if (shop) return shop;
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return ip;
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(request, endpoint, type = 'api') {
  const config = RATE_LIMITS[type] || RATE_LIMITS.api;
  const identifier = getClientIdentifier(request);
  const key = generateKey(identifier, endpoint, type);
  const now = Date.now();
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupExpiredEntries();
  }
  
  // Get or create rate limit data
  let limitData = rateLimitStore.get(key);
  
  if (!limitData || now > limitData.resetTime) {
    // Create new window
    limitData = {
      count: 0,
      resetTime: now + config.windowMs,
      firstRequest: now,
    };
    rateLimitStore.set(key, limitData);
  }
  
  // Check if limit exceeded
  if (limitData.count >= config.maxRequests) {
    const retryAfter = Math.ceil((limitData.resetTime - now) / 1000);
    
    logger.warn('Rate limit exceeded', {
      identifier,
      endpoint,
      type,
      count: limitData.count,
      limit: config.maxRequests,
      retryAfter,
      windowMs: config.windowMs
    });
    
    throw createRateLimitError(retryAfter);
  }
  
  // Increment counter
  limitData.count++;
  rateLimitStore.set(key, limitData);
  
  // Return rate limit info
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - limitData.count),
    reset: limitData.resetTime,
    retryAfter: limitData.count >= config.maxRequests ? 
                Math.ceil((limitData.resetTime - now) / 1000) : null
  };
}

/**
 * Record successful request (for configs that skip successful requests)
 */
export function recordSuccess(request, endpoint, type = 'api') {
  const config = RATE_LIMITS[type] || RATE_LIMITS.api;
  
  if (config.skipSuccessfulRequests) {
    const identifier = getClientIdentifier(request);
    const key = generateKey(identifier, endpoint, type);
    const limitData = rateLimitStore.get(key);
    
    if (limitData && limitData.count > 0) {
      limitData.count--;
      rateLimitStore.set(key, limitData);
      
      logger.info('Rate limit count decremented for successful request', {
        identifier,
        endpoint,
        type,
        newCount: limitData.count
      });
    }
  }
}

/**
 * Record failed request (for configs that skip failed requests)
 */
export function recordFailure(request, endpoint, type = 'api') {
  const config = RATE_LIMITS[type] || RATE_LIMITS.api;
  
  if (config.skipFailedRequests) {
    const identifier = getClientIdentifier(request);
    const key = generateKey(identifier, endpoint, type);
    const limitData = rateLimitStore.get(key);
    
    if (limitData && limitData.count > 0) {
      limitData.count--;
      rateLimitStore.set(key, limitData);
      
      logger.info('Rate limit count decremented for failed request', {
        identifier,
        endpoint,
        type,
        newCount: limitData.count
      });
    }
  }
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(handler, endpoint, type = 'api') {
  return async (args) => {
    const { request } = args;
    
    try {
      // Check rate limit
      const rateLimitInfo = checkRateLimit(request, endpoint, type);
      
      // Execute the handler
      const response = await handler(args);
      
      // Record success if needed
      recordSuccess(request, endpoint, type);
      
      // Add rate limit headers to response
      if (response instanceof Response) {
        response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());
        
        if (rateLimitInfo.retryAfter) {
          response.headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
        }
      }
      
      return response;
      
    } catch (error) {
      // Record failure if needed
      recordFailure(request, endpoint, type);
      throw error;
    }
  };
}

/**
 * Shopify API rate limiting with burst handling
 */
export class ShopifyRateLimiter {
  constructor() {
    this.buckets = new Map(); // Per-shop rate limiting
  }
  
  async waitForAvailability(shop, requestCost = 1) {
    const key = `shopify:${shop}`;
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: 40, // Shopify REST API limit
        lastRefill: Date.now(),
        maxTokens: 40,
        refillRate: 2, // 2 tokens per second (40 per 20 seconds)
      };
      this.buckets.set(key, bucket);
    }
    
    // Refill tokens based on time passed
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * bucket.refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
    
    // Check if we have enough tokens
    if (bucket.tokens < requestCost) {
      const waitTime = Math.ceil((requestCost - bucket.tokens) / bucket.refillRate * 1000);
      
      logger.warn('Shopify rate limit hit, waiting', {
        shop,
        requestCost,
        availableTokens: bucket.tokens,
        waitTimeMs: waitTime
      });
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Refill tokens after waiting
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + requestCost);
    } else {
      // Consume tokens
      bucket.tokens -= requestCost;
    }
    
    this.buckets.set(key, bucket);
    
    return {
      remainingTokens: bucket.tokens,
      maxTokens: bucket.maxTokens
    };
  }
}

// Global Shopify rate limiter instance
export const shopifyRateLimiter = new ShopifyRateLimiter();

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(request, endpoint, type = 'api') {
  const identifier = getClientIdentifier(request);
  const key = generateKey(identifier, endpoint, type);
  const limitData = rateLimitStore.get(key);
  const config = RATE_LIMITS[type] || RATE_LIMITS.api;
  
  if (!limitData) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: null,
      windowMs: config.windowMs
    };
  }
  
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - limitData.count),
    reset: limitData.resetTime,
    windowMs: config.windowMs,
    count: limitData.count
  };
}
