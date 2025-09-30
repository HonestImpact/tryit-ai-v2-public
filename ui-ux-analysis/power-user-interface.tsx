// Power User Direction - Command Center Interface
'use client';

import React, { useState } from 'react';

export default function PowerUserInterface() {
  const [trustLevel, setTrustLevel] = useState(75);
  const [skepticMode, setSkepticMode] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-mono">
      {/* Command Bar */}
      <div className="border-b border-slate-700 bg-slate-800/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-4">
            <div className="text-green-400 font-semibold">noah:~$</div>
            <div className="text-xs text-slate-400">
              Agent: <span className="text-blue-400">Tinkerer</span> | 
              Session: <span className="text-yellow-400">a7f3c</span> | 
              Uptime: <span className="text-green-400">12m</span>
            </div>
          </div>
          
          {/* Trust Metrics */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Trust</span>
              <div className="w-16 h-1 bg-slate-700 rounded">
                <div 
                  className={`h-full rounded transition-all duration-300 ${
                    trustLevel > 60 ? 'bg-green-400' : 
                    trustLevel > 30 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${trustLevel}%` }}
                />
              </div>
              <span className="text-xs text-slate-300 w-8">{trustLevel}%</span>
            </div>
            
            <button
              onClick={() => setSkepticMode(!skepticMode)}
              className={`px-2 py-1 text-xs border rounded transition-colors ${
                skepticMode 
                  ? 'border-red-400 text-red-400 bg-red-400/10' 
                  : 'border-slate-600 text-slate-400'
              }`}
            >
              SKEPTIC {skepticMode ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-48px)]">
        {/* Main Chat */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* User Message */}
            <div className="flex justify-end">
              <div className="max-w-2xl">
                <div className="bg-blue-600/20 border border-blue-500/30 px-4 py-3 rounded text-sm">
                  <div className="flex items-start justify-between">
                    <span>Create a data visualization dashboard</span>
                    <span className="text-xs text-slate-400 ml-4">14:32:15</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assistant Message with Metrics */}
            <div className="flex justify-start">
              <div className="max-w-2xl w-full">
                <div className="bg-slate-800 border border-slate-700 rounded">
                  {/* Header with agent info */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-purple-500/20 border border-purple-400/30 rounded flex items-center justify-center">
                        <span className="text-xs text-purple-300">T</span>
                      </div>
                      <span className="text-xs text-slate-300">Tinkerer</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-green-400">2.3s</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-slate-400">
                        Confidence: <span className="text-yellow-400">94%</span>
                      </div>
                      <button className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                        [Cmd+/] Challenge
                      </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <p className="text-sm text-slate-200 leading-relaxed">
                      I'll create a comprehensive dashboard with real-time metrics. 
                      This will include interactive charts, customizable widgets, and 
                      data filtering capabilities.
                    </p>
                    
                    {/* Reasoning (expandable) */}
                    <details className="mt-3 text-xs">
                      <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
                        Show reasoning & knowledge sources
                      </summary>
                      <div className="mt-2 p-3 bg-slate-900/50 border border-slate-700 rounded text-slate-400">
                        <div>• Used design patterns: Dashboard, Observer, Strategy</div>
                        <div>• Knowledge sources: 3 relevant patterns found</div>
                        <div>• Complexity assessment: Complex (3500+ chars)</div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-slate-700 p-4">
            <div className="flex items-center space-x-3">
              <span className="text-green-400 text-sm">></span>
              <input
                type="text"
                placeholder="Type command or press Cmd+K for palette..."
                className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none placeholder-slate-500"
              />
              <span className="text-xs text-slate-500">[Enter] send • [Cmd+K] palette</span>
            </div>
          </div>
        </div>

        {/* Sidebar - Artifacts & Metrics */}
        {showMetrics && (
          <div className="w-80 border-l border-slate-700 bg-slate-900/50">
            {/* Performance Metrics */}
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Session Metrics</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg Response</span>
                  <span className="text-green-400">1.8s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trust Trend</span>
                  <span className="text-green-400">↗ +15%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Challenges</span>
                  <span className="text-yellow-400">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Artifacts</span>
                  <span className="text-blue-400">5</span>
                </div>
              </div>
            </div>

            {/* Artifact Toolbox */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Artifact Stack</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-800/50 border border-slate-700 rounded text-xs">
                  <div>
                    <div className="text-slate-200">Dashboard.html</div>
                    <div className="text-slate-500">Tinkerer • 2min ago</div>
                  </div>
                  <button className="text-slate-400 hover:text-slate-200">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}