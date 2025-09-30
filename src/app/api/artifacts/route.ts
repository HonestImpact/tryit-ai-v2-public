import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { analyticsPool } from '@/lib/analytics/connection-pool';

const logger = createLogger('artifacts-api');

/**
 * GET /api/artifacts - Fetch the latest artifact for a session
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    logger.debug('Fetching artifacts for session', { 
      sessionId: sessionId.substring(0, 8) + '...' 
    });

    // Get all artifacts for this session using shared analytics pool
    const result = await analyticsPool.executeQuery<Array<{ 
      id: string; 
      title: string; 
      content: string; 
      created_at: string; 
      generation_agent: string; 
    }>>(
      'SELECT id, title, content, created_at, generation_agent FROM generated_tools WHERE session_id = $1 ORDER BY created_at DESC',
      [sessionId]
    );

    if (result && result.length > 0) {
        const sessionArtifacts = result.map(artifact => ({
          id: artifact.id,
          title: artifact.title,
          content: artifact.content,
          timestamp: new Date(artifact.created_at).getTime(),
          agent: artifact.generation_agent || 'noah'
        }));
        
        const latestArtifact = sessionArtifacts[0];
        
        logger.info('Session artifacts found', { 
          sessionId: sessionId.substring(0, 8) + '...',
          count: sessionArtifacts.length,
          latestTitle: latestArtifact.title
        });
        
        return NextResponse.json({
          artifact: {
            title: latestArtifact.title,
            content: latestArtifact.content
          },
          sessionArtifacts: sessionArtifacts
        });
      } else {
        logger.debug('No artifacts found for session', { 
          sessionId: sessionId.substring(0, 8) + '...' 
        });
        
        return NextResponse.json({ 
          artifact: null, 
          sessionArtifacts: [] 
        });
      }
    
  } catch (error) {
    logger.error('Failed to fetch artifacts', { error });
    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    );
  }
}