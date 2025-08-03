/**
 * Database Utility Functions
 * Provides safe database operations with comprehensive error handling
 */

import prisma from '../db.server.js';
import { createDatabaseError, logger } from './errorHandler.js';

/**
 * Session management utilities
 */
export const sessionUtils = {
  /**
   * Find session by ID with error handling
   */
  async findById(sessionId) {
    return await prisma.safeExecute(async () => {
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });
      
      if (!session) {
        logger.warn('Session not found', { sessionId });
        return null;
      }
      
      logger.debug('Session found', { sessionId, shop: session.shop });
      return session;
    }, 'findSessionById');
  },

  /**
   * Find session by shop with error handling
   */
  async findByShop(shop, isOnline = false) {
    return await prisma.safeExecute(async () => {
      const session = await prisma.session.findFirst({
        where: { 
          shop,
          isOnline 
        },
        orderBy: { expires: 'desc' } // Get the most recent session
      });
      
      if (!session) {
        logger.warn('Session not found for shop', { shop, isOnline });
        return null;
      }
      
      // Check if session is expired
      if (session.expires && new Date() > session.expires) {
        logger.warn('Session expired', { sessionId: session.id, shop, expires: session.expires });
        return null;
      }
      
      logger.debug('Session found for shop', { sessionId: session.id, shop, isOnline });
      return session;
    }, 'findSessionByShop');
  },

  /**
   * Create or update session with error handling
   */
  async upsert(sessionData) {
    return await prisma.safeExecute(async () => {
      const session = await prisma.session.upsert({
        where: { id: sessionData.id },
        update: {
          shop: sessionData.shop,
          state: sessionData.state,
          isOnline: sessionData.isOnline,
          scope: sessionData.scope,
          expires: sessionData.expires,
          accessToken: sessionData.accessToken,
          userId: sessionData.userId,
          firstName: sessionData.firstName,
          lastName: sessionData.lastName,
          email: sessionData.email,
          accountOwner: sessionData.accountOwner,
          locale: sessionData.locale,
          collaborator: sessionData.collaborator,
          emailVerified: sessionData.emailVerified,
        },
        create: sessionData
      });
      
      logger.info('Session upserted', { 
        sessionId: session.id, 
        shop: session.shop, 
        isOnline: session.isOnline 
      });
      
      return session;
    }, 'upsertSession');
  },

  /**
   * Delete session with error handling
   */
  async delete(sessionId) {
    return await prisma.safeExecute(async () => {
      const deletedSession = await prisma.session.delete({
        where: { id: sessionId }
      });
      
      logger.info('Session deleted', { 
        sessionId: deletedSession.id, 
        shop: deletedSession.shop 
      });
      
      return deletedSession;
    }, 'deleteSession');
  },

  /**
   * Delete expired sessions
   */
  async deleteExpired() {
    return await prisma.safeExecute(async () => {
      const result = await prisma.session.deleteMany({
        where: {
          expires: {
            lt: new Date()
          }
        }
      });
      
      logger.info('Expired sessions deleted', { count: result.count });
      return result;
    }, 'deleteExpiredSessions');
  },

  /**
   * Get session statistics
   */
  async getStats() {
    return await prisma.safeExecute(async () => {
      const [total, online, offline, expired] = await Promise.all([
        prisma.session.count(),
        prisma.session.count({ where: { isOnline: true } }),
        prisma.session.count({ where: { isOnline: false } }),
        prisma.session.count({ 
          where: { 
            expires: { lt: new Date() } 
          } 
        })
      ]);
      
      const stats = { total, online, offline, expired };
      logger.debug('Session statistics', stats);
      return stats;
    }, 'getSessionStats');
  }
};

/**
 * Database maintenance utilities
 */
export const maintenanceUtils = {
  /**
   * Run database health check
   */
  async healthCheck() {
    try {
      const isHealthy = await prisma.healthCheck();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'sqlite'
      };
    } catch (error) {
      logger.error('Database health check failed', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        database: 'sqlite'
      };
    }
  },

  /**
   * Clean up expired sessions
   */
  async cleanup() {
    try {
      const result = await sessionUtils.deleteExpired();
      logger.info('Database cleanup completed', { deletedSessions: result.count });
      return {
        success: true,
        deletedSessions: result.count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database cleanup failed', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const sessionStats = await sessionUtils.getStats();
      return {
        sessions: sessionStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get database stats', error);
      throw createDatabaseError('getStats', error);
    }
  }
};

/**
 * Transaction helpers
 */
export const transactionUtils = {
  /**
   * Execute multiple operations in a transaction
   */
  async execute(operations, operationName = 'transaction') {
    return await prisma.safeTransaction(operations, operationName);
  },

  /**
   * Batch session operations
   */
  async batchSessionOperations(operations) {
    return await prisma.safeTransaction(async (tx) => {
      const results = [];
      
      for (const operation of operations) {
        switch (operation.type) {
          case 'create':
            results.push(await tx.session.create({ data: operation.data }));
            break;
          case 'update':
            results.push(await tx.session.update({ 
              where: operation.where, 
              data: operation.data 
            }));
            break;
          case 'delete':
            results.push(await tx.session.delete({ where: operation.where }));
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }
      }
      
      return results;
    }, 'batchSessionOperations');
  }
};

/**
 * Database connection utilities
 */
export const connectionUtils = {
  /**
   * Test database connection
   */
  async testConnection() {
    try {
      await prisma.$connect();
      const isHealthy = await prisma.healthCheck();
      
      if (isHealthy) {
        logger.info('Database connection test successful');
        return { success: true, message: 'Database connection is healthy' };
      } else {
        logger.warn('Database connection test failed');
        return { success: false, message: 'Database connection is unhealthy' };
      }
    } catch (error) {
      logger.error('Database connection test error', error);
      return { 
        success: false, 
        message: 'Database connection failed', 
        error: error.message 
      };
    }
  },

  /**
   * Gracefully close database connection
   */
  async close() {
    try {
      await prisma.gracefulDisconnect();
      return { success: true, message: 'Database connection closed gracefully' };
    } catch (error) {
      logger.error('Error closing database connection', error);
      return { 
        success: false, 
        message: 'Error closing database connection', 
        error: error.message 
      };
    }
  }
};

/**
 * Export all utilities
 */
export default {
  session: sessionUtils,
  maintenance: maintenanceUtils,
  transaction: transactionUtils,
  connection: connectionUtils
};
