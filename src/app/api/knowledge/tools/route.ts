/**
 * Tool Reference API
 * Provides access to the tool library for Tinkerer and other agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { toolReferenceService } from '@/lib/knowledge/tool-reference-service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api-tools');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'search';
    
    logger.info('🔧 Tool reference API request', { action, params: Object.fromEntries(searchParams) });

    switch (action) {
      case 'search': {
        const query = searchParams.get('q') || searchParams.get('query');
        const category = searchParams.get('category') || undefined;
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter "q" is required for search' }, 
            { status: 400 }
          );
        }

        const tools = await toolReferenceService.searchTools(query, { category, limit });
        
        return NextResponse.json({
          success: true,
          action: 'search',
          query,
          category,
          count: tools.length,
          tools: tools.map(tool => ({
            id: tool.id,
            toolName: tool.toolName,
            title: tool.title,
            description: tool.description,
            category: tool.category,
            features: tool.features,
            functionality: tool.functionality,
            usagePatterns: tool.usagePatterns,
            filename: tool.filename
            // Note: htmlContent excluded by default for performance
          }))
        });
      }

      case 'categories': {
        const categories = await toolReferenceService.getCategories();
        
        return NextResponse.json({
          success: true,
          action: 'categories',
          categories
        });
      }

      case 'category': {
        const category = searchParams.get('name');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!category) {
          return NextResponse.json(
            { error: 'Category "name" parameter is required' }, 
            { status: 400 }
          );
        }

        const tools = await toolReferenceService.getToolsByCategory(category, limit);
        
        return NextResponse.json({
          success: true,
          action: 'category',
          category,
          count: tools.length,
          tools: tools.map(tool => ({
            id: tool.id,
            toolName: tool.toolName,
            title: tool.title,
            description: tool.description,
            category: tool.category,
            features: tool.features,
            functionality: tool.functionality,
            usagePatterns: tool.usagePatterns,
            filename: tool.filename
          }))
        });
      }

      case 'get': {
        const toolName = searchParams.get('name');

        if (!toolName) {
          return NextResponse.json(
            { error: 'Tool "name" parameter is required' }, 
            { status: 400 }
          );
        }

        const tool = await toolReferenceService.getToolByName(toolName);
        
        if (!tool) {
          return NextResponse.json(
            { error: 'Tool not found' }, 
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'get',
          tool: {
            id: tool.id,
            toolName: tool.toolName,
            title: tool.title,
            description: tool.description,
            category: tool.category,
            features: tool.features,
            functionality: tool.functionality,
            usagePatterns: tool.usagePatterns,
            htmlContent: tool.htmlContent, // Include full HTML for specific tool requests
            filename: tool.filename,
            createdAt: tool.createdAt
          }
        });
      }

      case 'stats': {
        const stats = await toolReferenceService.getToolStats();
        
        return NextResponse.json({
          success: true,
          action: 'stats',
          ...stats
        });
      }

      default: {
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: search, categories, category, get, stats` }, 
          { status: 400 }
        );
      }
    }

  } catch (error) {
    logger.error('💥 Tool reference API error', { error });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}