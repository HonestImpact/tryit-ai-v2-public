// Secure Analytics Connection Pool - Production-Grade Database Layer
// Replaces ad-hoc pg.Client with pooled connections for "Best, Cleanest, Fastest, Most Logical, Most Elegant" code

import { Pool, type PoolClient, type QueryResult } from 'pg';
import { createLogger } from '@/lib/logger';

const logger = createLogger('analytics-pool');

export interface PooledQueryOptions {
  timeout?: number;
  retries?: number;
  skipOnError?: boolean;
}

class SecureAnalyticsPool {
  private pool: Pool | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize connection pool with security validation
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // SECURITY: Validate required environment variables
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required for analytics database connection');
      }

      // SECURITY: Validate connection string format (basic check)
      if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
        throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
      }

      // Create connection pool with production-ready configuration
      this.pool = new Pool({
        connectionString: databaseUrl,
        // Connection pool settings optimized for analytics workload
        min: 1, // Minimum connections (analytics doesn't need many idle connections)
        max: 5, // Maximum connections (sufficient for async analytics writes)
        idleTimeoutMillis: 30000, // Close idle connections after 30s
        connectionTimeoutMillis: 10000, // Connection timeout
        // Query timeout handled per-query
        statement_timeout: 5000, // 5s statement timeout as safety net
        // Connection validation
        application_name: 'noah-analytics',
      });

      // Test the connection
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1 as pool_health_check');
        logger.info('Analytics connection pool initialized successfully', {
          minConnections: 1,
          maxConnections: 5,
          environment: process.env.NODE_ENV || 'development'
        });
      } finally {
        client.release();
      }

      this.isInitialized = true;

    } catch (error) {
      logger.error('Failed to initialize analytics connection pool', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute query with pooled connection and elegant error handling
   */
  async executeQuery<T = any>(
    query: string, 
    params: any[] = [], 
    options: PooledQueryOptions = {}
  ): Promise<T | null> {
    // Ensure pool is initialized
    await this.initialize();
    
    if (!this.pool) {
      logger.error('Analytics pool not initialized');
      return null;
    }

    const startTime = Date.now();
    const { timeout = 5000, retries = 3, skipOnError = true } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      let client: PoolClient | null = null;
      
      try {
        // Get client from pool with timeout
        const clientPromise = this.pool.connect();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Pool connection timeout after ${timeout}ms`)), timeout);
        });

        client = await Promise.race([clientPromise, timeoutPromise]);

        // Execute query with timeout protection
        const queryPromise = client.query(query, params);
        const queryTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
        });

        const result: QueryResult = await Promise.race([queryPromise, queryTimeoutPromise]);
        
        const duration = Date.now() - startTime;
        logger.debug('Analytics pooled query executed', { 
          duration, 
          attempt, 
          rowCount: result.rowCount || 0,
          query: query.substring(0, 100) + '...' 
        });

        return result.rows as T;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const duration = Date.now() - startTime;
        
        logger.warn(`Analytics pooled query failed (attempt ${attempt}/${retries})`, { 
          error: lastError.message, 
          duration,
          query: query.substring(0, 50) + '...'
        });

        if (attempt === retries) {
          if (skipOnError) {
            logger.error('Analytics pooled query failed after all retries - skipping', { 
              error: lastError.message,
              totalDuration: Date.now() - startTime
            });
            return null;
          } else {
            throw lastError;
          }
        }

        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));

      } finally {
        // Always release client back to pool
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            logger.warn('Failed to release client back to pool', {
              error: releaseError instanceof Error ? releaseError.message : String(releaseError)
            });
          }
        }
      }
    }

    return null;
  }

  /**
   * Health check for the connection pool
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!this.pool) return false;

      const result = await this.executeQuery(
        'SELECT 1 as pool_health, NOW() as current_time',
        [],
        { timeout: 2000, retries: 1, skipOnError: false }
      );
      
      return result !== null;
      
    } catch (error) {
      logger.error('Analytics pool health check failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getPoolStats() {
    if (!this.pool) return null;

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Graceful shutdown of the connection pool
   */
  async shutdown(): Promise<void> {
    if (this.pool) {
      logger.info('Shutting down analytics connection pool...');
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      this.initializationPromise = null;
    }
  }
}

// Export singleton instance for consistent pool access
export const analyticsPool = new SecureAnalyticsPool();