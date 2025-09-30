/**
 * Tool Reference Service
 * Provides access to the imported tool library for intelligent design patterns
 */

import { Client } from 'pg';
import { createLogger } from '@/lib/logger';

const logger = createLogger('tool-reference');

export interface ToolReference {
  id: number;
  toolName: string;
  title: string;
  description: string;
  category: string;
  features: string;
  functionality: string;
  usagePatterns: string;
  htmlContent: string;
  filename: string;
  createdAt: Date;
}

export interface ToolSearchOptions {
  category?: string;
  limit?: number;
  searchTerm?: string;
}

export class ToolReferenceService {
  private client: Client | null = null;
  private initialized = false;

  /**
   * Initialize the database connection
   */
  private async initialize(): Promise<void> {
    if (this.initialized && this.client) return;

    try {
      this.client = new Client({
        connectionString: process.env.DATABASE_URL
      });
      
      await this.client.connect();
      this.initialized = true;
      
      logger.info('✅ Tool reference service initialized');
      
    } catch (error) {
      logger.error('💥 Failed to initialize tool reference service', { error });
      throw new Error(`Tool reference service initialization failed: ${error}`);
    }
  }

  /**
   * Search for tools by text query
   */
  async searchTools(query: string, options: ToolSearchOptions = {}): Promise<ToolReference[]> {
    await this.initialize();
    
    if (!this.client) {
      throw new Error('Tool reference service not initialized');
    }

    try {
      logger.info('🔍 Searching tools', { query, options });

      let sql = `
        SELECT * FROM tool_reference 
        WHERE to_tsvector('english', title || ' ' || description || ' ' || category || ' ' || features || ' ' || usage_patterns) 
        @@ plainto_tsquery('english', $1)
      `;
      
      const params: any[] = [query];
      let paramIndex = 2;

      // Add category filter if specified
      if (options.category) {
        sql += ` AND category = $${paramIndex}`;
        params.push(options.category);
        paramIndex++;
      }

      sql += ` ORDER BY 
        ts_rank(to_tsvector('english', title || ' ' || description || ' ' || category || ' ' || features), plainto_tsquery('english', $1)) DESC,
        title ASC
      `;

      // Add limit
      if (options.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
      } else {
        sql += ` LIMIT 20`; // Default limit
      }

      const result = await this.client.query(sql, params);
      
      logger.info('✅ Tool search completed', { 
        query, 
        resultsCount: result.rows.length 
      });

      return result.rows.map(this.mapRowToTool);

    } catch (error) {
      logger.error('💥 Failed to search tools', { error, query });
      throw new Error(`Tool search failed: ${error}`);
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    await this.initialize();
    
    if (!this.client) {
      throw new Error('Tool reference service not initialized');
    }

    try {
      const result = await this.client.query(
        'SELECT DISTINCT category FROM tool_reference ORDER BY category'
      );
      
      return result.rows.map(row => row.category);

    } catch (error) {
      logger.error('💥 Failed to get categories', { error });
      throw new Error(`Get categories failed: ${error}`);
    }
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(category: string, limit: number = 10): Promise<ToolReference[]> {
    await this.initialize();
    
    if (!this.client) {
      throw new Error('Tool reference service not initialized');
    }

    try {
      logger.info('📋 Getting tools by category', { category, limit });

      const result = await this.client.query(
        'SELECT * FROM tool_reference WHERE category = $1 ORDER BY title ASC LIMIT $2',
        [category, limit]
      );
      
      logger.info('✅ Tools by category retrieved', { 
        category, 
        count: result.rows.length 
      });

      return result.rows.map(this.mapRowToTool);

    } catch (error) {
      logger.error('💥 Failed to get tools by category', { error, category });
      throw new Error(`Get tools by category failed: ${error}`);
    }
  }

  /**
   * Get a specific tool by name
   */
  async getToolByName(toolName: string): Promise<ToolReference | null> {
    await this.initialize();
    
    if (!this.client) {
      throw new Error('Tool reference service not initialized');
    }

    try {
      logger.info('🎯 Getting tool by name', { toolName });

      const result = await this.client.query(
        'SELECT * FROM tool_reference WHERE tool_name = $1',
        [toolName]
      );
      
      if (result.rows.length === 0) {
        logger.info('❓ Tool not found', { toolName });
        return null;
      }

      const tool = this.mapRowToTool(result.rows[0]);
      logger.info('✅ Tool retrieved', { toolName, title: tool.title });
      
      return tool;

    } catch (error) {
      logger.error('💥 Failed to get tool by name', { error, toolName });
      throw new Error(`Get tool by name failed: ${error}`);
    }
  }

  /**
   * Get tool statistics
   */
  async getToolStats(): Promise<{
    totalTools: number;
    categoryCounts: { category: string; count: number }[];
  }> {
    await this.initialize();
    
    if (!this.client) {
      throw new Error('Tool reference service not initialized');
    }

    try {
      // Get total count
      const totalResult = await this.client.query('SELECT COUNT(*) as total FROM tool_reference');
      const totalTools = parseInt(totalResult.rows[0].total);

      // Get category counts
      const categoryResult = await this.client.query(`
        SELECT category, COUNT(*) as count 
        FROM tool_reference 
        GROUP BY category 
        ORDER BY count DESC, category ASC
      `);

      const categoryCounts = categoryResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count)
      }));

      return { totalTools, categoryCounts };

    } catch (error) {
      logger.error('💥 Failed to get tool stats', { error });
      throw new Error(`Get tool stats failed: ${error}`);
    }
  }

  /**
   * Map database row to ToolReference interface
   */
  private mapRowToTool(row: any): ToolReference {
    return {
      id: row.id,
      toolName: row.tool_name,
      title: row.title,
      description: row.description || '',
      category: row.category,
      features: row.features || '',
      functionality: row.functionality || '',
      usagePatterns: row.usage_patterns || '',
      htmlContent: row.html_content || '',
      filename: row.filename,
      createdAt: row.created_at
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.initialized = false;
      logger.info('🔌 Tool reference service connection closed');
    }
  }
}

// Export singleton instance
export const toolReferenceService = new ToolReferenceService();