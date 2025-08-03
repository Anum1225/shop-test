/**
 * API Client Utilities
 * Provides robust API clients with comprehensive error handling, retries, and monitoring
 */

import { 
  createExternalApiError, 
  createShopifyApiError, 
  logger 
} from './errorHandler.js';
import { shopifyRateLimiter } from './rateLimiter.js';

/**
 * Enhanced fetch wrapper with error handling and retries
 */
export class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.defaultHeaders = options.headers || {};
  }

  /**
   * Make HTTP request with comprehensive error handling
   */
  async request(url, options = {}) {
    const fullUrl = this.baseURL ? `${this.baseURL}${url}` : url;
    const requestId = Math.random().toString(36).substring(7);
    
    const requestOptions = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Shopify-App/1.0',
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    logger.info('API request started', {
      requestId,
      method: requestOptions.method || 'GET',
      url: fullUrl,
      headers: this.sanitizeHeaders(requestOptions.headers)
    });

    let lastError;
    
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      try {
        const startTime = Date.now();
        
        const response = await fetch(fullUrl, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        logger.performance('API request', duration, {
          requestId,
          attempt,
          status: response.status,
          success: response.ok,
          url: fullUrl
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error = createExternalApiError(
            this.getApiName(fullUrl),
            response.status,
            `HTTP ${response.status}: ${response.statusText}`,
            errorText
          );
          
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          lastError = error;
          
          if (attempt < this.retries) {
            logger.warn('API request failed, retrying', {
              requestId,
              attempt,
              status: response.status,
              nextAttemptIn: this.retryDelay * attempt
            });
            
            await this.delay(this.retryDelay * attempt);
            continue;
          }
          
          throw error;
        }

        const data = await response.json();
        
        logger.info('API request successful', {
          requestId,
          attempt,
          status: response.status,
          duration,
          url: fullUrl
        });

        return {
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          requestId
        };

      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          lastError = createExternalApiError(
            this.getApiName(fullUrl),
            408,
            'Request timeout'
          );
        } else if (error.type === 'EXTERNAL_API_ERROR') {
          lastError = error;
        } else {
          lastError = createExternalApiError(
            this.getApiName(fullUrl),
            500,
            `Network error: ${error.message}`
          );
        }

        if (attempt < this.retries && this.shouldRetry(error)) {
          logger.warn('API request failed, retrying', {
            requestId,
            attempt,
            error: error.message,
            nextAttemptIn: this.retryDelay * attempt
          });
          
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        logger.error('API request failed after all retries', lastError, {
          requestId,
          attempts: attempt,
          url: fullUrl
        });

        throw lastError;
      }
    }

    throw lastError;
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Helper methods
   */
  getApiName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'Unknown API';
    }
  }

  shouldRetry(error) {
    // Retry on network errors and 5xx server errors
    return error.name === 'AbortError' || 
           (error.statusCode >= 500 && error.statusCode < 600) ||
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    // Remove sensitive headers from logs
    if (sanitized.Authorization) {
      sanitized.Authorization = '[REDACTED]';
    }
    if (sanitized['X-Shopify-Access-Token']) {
      sanitized['X-Shopify-Access-Token'] = '[REDACTED]';
    }
    return sanitized;
  }
}

/**
 * Shopify API Client with rate limiting
 */
export class ShopifyApiClient extends ApiClient {
  constructor(shop, accessToken, options = {}) {
    super({
      baseURL: `https://${shop}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
      ...options
    });
    
    this.shop = shop;
    this.accessToken = accessToken;
  }

  /**
   * Make Shopify API request with rate limiting
   */
  async request(url, options = {}) {
    try {
      // Wait for rate limit availability
      await shopifyRateLimiter.waitForAvailability(this.shop, 1);
      
      const result = await super.request(url, options);
      return result;
      
    } catch (error) {
      // Convert to Shopify-specific error
      if (error.type === 'EXTERNAL_API_ERROR') {
        throw createShopifyApiError(
          `${options.method || 'GET'} ${url}`,
          error,
          error.statusCode
        );
      }
      throw error;
    }
  }

  /**
   * Get products
   */
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/products.json${queryString ? `?${queryString}` : ''}`;
    return this.get(url);
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    return this.get(`/products/${productId}.json`);
  }

  /**
   * Get orders
   */
  async getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/orders.json${queryString ? `?${queryString}` : ''}`;
    return this.get(url);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    return this.get(`/orders/${orderId}.json`);
  }

  /**
   * Create webhook
   */
  async createWebhook(webhookData) {
    return this.post('/webhooks.json', { webhook: webhookData });
  }

  /**
   * Get webhooks
   */
  async getWebhooks() {
    return this.get('/webhooks.json');
  }
}

/**
 * External API Client for Rushr API
 */
export class RushrApiClient extends ApiClient {
  constructor(token, options = {}) {
    super({
      baseURL: 'https://backend.rushr-admin.com/api',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      ...options
    });
    
    this.token = token;
  }

  /**
   * Get orders from Rushr API
   */
  async getOrders() {
    return this.get('/orders');
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId) {
    return this.get(`/orders/${orderId}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    return this.put(`/orders/${orderId}/status`, { status });
  }
}

/**
 * Factory function to create API clients
 */
export const createApiClient = {
  shopify: (shop, accessToken, options = {}) => new ShopifyApiClient(shop, accessToken, options),
  rushr: (token, options = {}) => new RushrApiClient(token, options),
  generic: (options = {}) => new ApiClient(options)
};

export default createApiClient;
