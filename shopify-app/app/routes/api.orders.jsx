// routes/api/orders.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getToken } from "../utils/tokenStorage";
import {
  asyncErrorHandler,
  createExternalApiError,
  createValidationError,
  ErrorTypes,
  logger,
  sanitizeInput
} from "../utils/errorHandler.js";
import { withRateLimit } from "../utils/rateLimiter.js";
import { createApiClient } from "../utils/apiClient.js";

export const loader = withRateLimit(
  asyncErrorHandler(async ({ request }) => {
  // 🔒 Authenticate the session
  const { session } = await authenticate.admin(request);
  const shop = sanitizeInput(session.shop, 'string');

  if (!shop) {
    throw createValidationError('shop', 'Invalid shop parameter');
  }

  logger.info('Fetching orders for shop', { shop });

  // 🔑 Get token for current shop from memory store
  const token = getToken(shop);

  if (!token) {
    logger.warn('Token not found for shop', { shop });
    throw new Error('Token not found for this store');
  }

  // 📨 Fetch orders from external API using enhanced API client
  try {
    const rushrClient = createApiClient.rushr(token);
    const response = await rushrClient.getOrders();

    // Validate response structure
    if (!response.data || typeof response.data !== 'object') {
      throw createExternalApiError('Rushr API', 200, 'Invalid response format', response.data);
    }

    const orders = Array.isArray(response.data.orders) ? response.data.orders : [];

    logger.info('Successfully fetched orders', {
      shop,
      orderCount: orders.length,
      requestId: response.requestId
    });

    return json({
      success: true,
      orders,
      timestamp: new Date().toISOString(),
      shop,
      requestId: response.requestId
    });

  } catch (error) {
    // Error is already properly formatted by the API client
    throw error;
  }
  }, 'fetch-orders'),
  'orders',
  'external'
);
