/**
 * Middleware utilities for handling CORS, headers, and Shopify embedding
 */

/**
 * Add CORS headers for Shopify embedding
 */
export function addCorsHeaders(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Shopify-Access-Token");
  headers.set("Access-Control-Allow-Credentials", "true");
  return headers;
}

/**
 * Add Shopify embedding headers
 */
export function addEmbeddingHeaders(headers) {
  headers.set("X-Frame-Options", "ALLOWALL");
  headers.set("Content-Security-Policy", "frame-ancestors https://*.myshopify.com https://admin.shopify.com;");
  return headers;
}

/**
 * Add security headers
 */
export function addSecurityHeaders(headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return headers;
}

/**
 * Comprehensive header setup for Shopify apps
 */
export function setupShopifyHeaders(headers) {
  addCorsHeaders(headers);
  addEmbeddingHeaders(headers);
  addSecurityHeaders(headers);
  return headers;
}

/**
 * Handle preflight OPTIONS requests
 */
export function handlePreflight(request) {
  if (request.method === "OPTIONS") {
    const headers = new Headers();
    setupShopifyHeaders(headers);
    return new Response(null, { status: 200, headers });
  }
  return null;
}
