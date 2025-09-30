'use client';

import { useState, useEffect } from 'react';
import React from 'react';

interface TableCounts {
  table_name: string;
  count: string;
}

interface TableData {
  table: string;
  data: any[];
  count: number;
}

export default function DatabaseViewer() {
  const [counts, setCounts] = useState<TableCounts[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedView, setSelectedView] = useState<string>('default');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/database');
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCounts(data.counts || []);
      }
    } catch (err) {
      setError('Failed to fetch database counts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName: string, view: string = 'default') => {
    try {
      setLoading(true);
      setSelectedTable(tableName);
      setSelectedView(view);
      const response = await fetch(`/api/database?table=${tableName}&view=${view}&limit=1000`);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTableData(data);
      }
    } catch (err) {
      setError('Failed to fetch table data');
    } finally {
      setLoading(false);
    }
  };

  const availableViews = {
    messages: [
      { id: 'clean', name: 'Clean View', description: 'Your requested columns only' },
      { id: 'default', name: 'Full View', description: 'All columns with metadata' },
      { id: 'content', name: 'Content Focus', description: 'Focus on message content' }
    ]
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 97) + '...';
    }
    return String(value);
  };

  const formatContent = (content: string): React.JSX.Element => {
    if (!content || content === '-') return <span>-</span>;
    
    const preview = content.length > 200 ? content.substring(0, 197) + '...' : content;
    return (
      <div className="space-y-1">
        <div className="text-slate-600">{preview}</div>
        {content.length > 200 && (
          <button 
            onClick={() => {
              navigator.clipboard.writeText(content);
              alert('Full content copied to clipboard!');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Copy full content ({content.length} chars)
          </button>
        )}
      </div>
    );
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Database Viewer</h1>
          <p className="text-slate-600">View analytics data for Noah AI system</p>
          <div className="mt-4">
            <a 
              href="/" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Noah
            </a>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            Error: {error}
          </div>
        )}

        {/* Enhanced Database Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Noah Analytics Dashboard</h2>
          <p className="text-slate-600 mb-6">
            Custom analytics views with enhanced filtering and analysis. 
            <span className="font-medium">Note:</span> This is separate from the raw database tables in "My Data".
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {counts.map((item) => {
              const tableLabels: Record<string, { label: string; description: string; color: string }> = {
                'user_sessions': { label: 'User Sessions', description: 'Active user sessions', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                'conversations': { label: 'Conversations', description: 'Complete conversations with analytics', color: 'bg-green-50 border-green-200 text-green-800' },
                'messages': { label: 'Message Analytics', description: 'Custom message views & analysis', color: 'bg-purple-50 border-purple-200 text-purple-800' },
                'generated_tools': { label: 'Artifacts', description: 'Generated tools & content', color: 'bg-orange-50 border-orange-200 text-orange-800' },
                'trust_events': { label: 'Trust Events', description: 'Trust level changes', color: 'bg-red-50 border-red-200 text-red-800' },
                'message_annotations': { label: 'Annotations', description: 'Message annotations', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
                'tool_usage_events': { label: 'Tool Usage', description: 'Tool usage tracking', color: 'bg-gray-50 border-gray-200 text-gray-800' }
              };
              const config = tableLabels[item.table_name] || { label: item.table_name, description: 'Database table', color: 'bg-slate-50 border-slate-200 text-slate-800' };
              
              return (
                <div 
                  key={item.table_name}
                  className={`border rounded-lg p-4 hover:bg-opacity-70 cursor-pointer transition-colors ${config.color}`}
                  onClick={() => fetchTableData(item.table_name)}
                >
                  <div className="text-sm font-medium">
                    {config.label}
                  </div>
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {config.description}
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={fetchCounts}
            className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Counts'}
          </button>
        </div>

        {/* Table Data */}
        {tableData && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 capitalize">
                {tableData.table.replace('_', ' ')} ({tableData.count} records)
              </h2>
              <button
                onClick={() => setTableData(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* View Selector for Messages Table */}
            {tableData.table === 'messages' && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Select View</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availableViews.messages.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => fetchTableData('messages', view.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedView === view.id
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-medium text-sm">{view.name}</div>
                      <div className="text-xs opacity-75 mt-1">{view.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tableData.data.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No data found in this table
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {Object.keys(tableData.data[0]).map((key) => (
                        <th key={key} className="text-left py-3 px-4 font-semibold text-slate-700 capitalize">
                          {key.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.data.map((row, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} className="py-3 px-4 text-slate-600">
                            {key.includes('_at') || key.includes('timestamp') ? 
                              formatTimestamp(value as string) : 
                              key === 'content' || key === 'content_preview' ? 
                                formatContent(value as string) :
                              formatValue(value)
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {loading && !tableData && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="mt-2 text-slate-600">Loading...</div>
          </div>
        )}
      </div>
    </div>
  );
}