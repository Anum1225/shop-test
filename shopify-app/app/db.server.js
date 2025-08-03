import { PrismaClient } from "@prisma/client";
import { createDatabaseError, logger } from "./utils/errorHandler.js";

// Enhanced Prisma client with error handling
class EnhancedPrismaClient extends PrismaClient {
  constructor(options = {}) {
    super({
      ...options,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Add event listeners for logging
    this.$on('error', (e) => {
      logger.error('Database error', new Error(e.message), { target: e.target });
    });

    this.$on('warn', (e) => {
      logger.warn('Database warning', { message: e.message, target: e.target });
    });

    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (e) => {
        logger.info('Database query', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`
        });
      });
    }
  }

  // Wrapper for safe database operations
  async safeExecute(operation, operationName) {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      logger.performance(`Database operation: ${operationName}`, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.performance(`Database operation: ${operationName}`, duration, { success: false });
      logger.error(`Database operation failed: ${operationName}`, error);
      throw createDatabaseError(operationName, error);
    }
  }

  // Safe transaction wrapper
  async safeTransaction(operations, operationName = 'transaction') {
    const startTime = Date.now();
    try {
      const result = await this.$transaction(operations, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      });
      const duration = Date.now() - startTime;
      logger.performance(`Database transaction: ${operationName}`, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.performance(`Database transaction: ${operationName}`, duration, { success: false });
      logger.error(`Database transaction failed: ${operationName}`, error);
      throw createDatabaseError(operationName, error);
    }
  }

  // Connection health check
  async healthCheck() {
    try {
      await this.$queryRaw`SELECT 1`;
      logger.info('Database health check passed');
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  // Graceful disconnect
  async gracefulDisconnect() {
    try {
      await this.$disconnect();
      logger.info('Database disconnected gracefully');
    } catch (error) {
      logger.error('Error during database disconnect', error);
    }
  }
}

// Initialize Prisma client with error handling
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new EnhancedPrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new EnhancedPrismaClient();

export default prisma;
