import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { saveToken, getAllTokens } from "../utils/tokenStorage";
import {
  asyncErrorHandler,
  createValidationError,
  validateRequiredFields,
  sanitizeInput,
  logger,
  ErrorTypes
} from "../utils/errorHandler.js";
import { withRateLimit } from "../utils/rateLimiter.js";

export const action = withRateLimit(
  asyncErrorHandler(async ({ request }) => {
  // Validate HTTP method
  if (request.method !== "POST") {
    const error = new Error(`Method ${request.method} not allowed`);
    error.statusCode = 405;
    throw error;
  }

  logger.info("Starting token save process");

  // 🔒 Authenticate the session
  const { session } = await authenticate.admin(request);
  const shop = sanitizeInput(session.shop, 'string');

  if (!shop) {
    throw createValidationError('shop', 'Invalid shop parameter');
  }

  logger.info("Session authenticated", { shop });

  // Parse and validate request body
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    throw createValidationError('request_body', 'Invalid JSON in request body');
  }

  // Validate required fields
  validateRequiredFields(requestBody, ['token']);

  const token = sanitizeInput(requestBody.token, 'string');

  if (!token || token.length < 10) {
    throw createValidationError('token', 'Token must be at least 10 characters long');
  }

  logger.info("Attempting to save token", { shop, tokenLength: token.length });

  // 🔑 Save the API token in memory
  const success = saveToken(shop, token);

  if (!success) {
    throw new Error('Failed to save token to storage');
  }

  logger.info("Token saved successfully", { shop });

  // Log all tokens for debugging (in development only)
  if (process.env.NODE_ENV === 'development') {
    getAllTokens();
  }

  return json({
    success: true,
    message: "Token saved successfully",
    shop,
    timestamp: new Date().toISOString()
  });
  }, 'save-token'),
  'save-token',
  'token'
);