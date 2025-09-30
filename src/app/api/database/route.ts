import { NextRequest, NextResponse } from 'next/server';
import { analyticsPool } from '@/lib/analytics/connection-pool';
import { analyticsDb } from '@/lib/analytics/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const view = searchParams.get('view') || 'default';
  const limit = parseInt(searchParams.get('limit') || '1000'); // Increased for testing

  try {
    if (table) {
      // Enhanced table data with analytical views
      const validTables = ['user_sessions', 'conversations', 'messages', 'generated_tools', 'tool_usage_events', 'trust_events', 'message_annotations'];
      if (!validTables.includes(table)) {
        return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
      }

      // Special handling for enhanced conversation view
      if (table === 'conversations') {
        const data = await analyticsDb.getAnalyticsDashboard(limit);
        return NextResponse.json({ table, data, count: data?.length || 0, enhanced: true });
      }

      // Messages table with multiple view options
      if (table === 'messages') {
        let query = '';
        let viewName = view;

        switch (view) {
          case 'clean':
            query = `SELECT 
              m.conversation_id,
              m.message_sequence,
              m.role,
              m.message_type,
              m.agent_involved,
              m.skeptic_mode_active,
              m.content,
              m.created_at,
              m.response_time_ms
            FROM messages m
            WHERE m.conversation_id IS NOT NULL
            ORDER BY m.created_at DESC 
            LIMIT $1`;
            break;

          case 'content':
            query = `SELECT 
              m.conversation_id,
              m.role,
              m.content,
              m.created_at,
              m.response_time_ms,
              m.agent_involved
            FROM messages m
            WHERE m.conversation_id IS NOT NULL
            ORDER BY m.created_at DESC 
            LIMIT $1`;
            break;

          default: // 'default' - full view
            query = `SELECT 
              m.*,
              c.conversation_sequence,
              CASE WHEN LENGTH(m.content) > 100 
                THEN LEFT(m.content, 100) || '...' 
                ELSE m.content 
              END as content_preview
            FROM messages m
            LEFT JOIN conversations c ON m.conversation_id = c.id
            ORDER BY m.created_at DESC 
            LIMIT $1`;
            break;
        }

        const data = await analyticsPool.executeQuery(query, [limit]);
        return NextResponse.json({ table, data, count: data?.length || 0, view: viewName });
      }

      // Enhanced artifacts view with content
      if (table === 'generated_tools') {
        const data = await analyticsPool.executeQuery(
          `SELECT 
            gt.*,
            CASE WHEN LENGTH(gt.content) > 200 
              THEN LEFT(gt.content, 200) || '...' 
              ELSE gt.content 
            END as content_preview
          FROM generated_tools gt
          ORDER BY gt.created_at DESC LIMIT $1`,
          [limit]
        );
        return NextResponse.json({ table, data, count: data?.length || 0, enhanced: true });
      }

      // Default table view
      const data = await analyticsPool.executeQuery(
        `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );

      return NextResponse.json({ table, data, count: data?.length || 0 });
    } else {
      // Get table counts
      const counts = await analyticsPool.executeQuery(`
        SELECT 'user_sessions' as table_name, COUNT(*) as count FROM user_sessions
        UNION ALL
        SELECT 'conversations', COUNT(*) FROM conversations  
        UNION ALL
        SELECT 'messages', COUNT(*) FROM messages
        UNION ALL
        SELECT 'generated_tools', COUNT(*) FROM generated_tools
        UNION ALL
        SELECT 'trust_events', COUNT(*) FROM trust_events
        UNION ALL
        SELECT 'message_annotations', COUNT(*) FROM message_annotations
        UNION ALL
        SELECT 'tool_usage_events', COUNT(*) FROM tool_usage_events
        ORDER BY table_name
      `);

      return NextResponse.json({ counts });
    }
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ 
      error: 'Database query failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}