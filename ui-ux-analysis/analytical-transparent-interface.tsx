// Analytical Transparent Direction - Data Observatory Interface
'use client';

import React, { useState } from 'react';

export default function AnalyticalTransparentInterface() {
  const [trustLevel, setTrustLevel] = useState(73);
  const [skepticMode, setSkepticMode] = useState(true);
  const [activeMetric, setActiveMetric] = useState('trust');
  
  // Mock data for visualizations
  const trustHistory = [45, 52, 48, 65, 70, 68, 73];
  const confidenceDistribution = [
    { range: '90-100%', count: 12, color: 'bg-green-400' },
    { range: '70-89%', count: 8, color: 'bg-yellow-400' },
    { range: '50-69%', count: 3, color: 'bg-orange-400' },
    { range: '<50%', count: 1, color: 'bg-red-400' }
  ];
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Analytics Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Noah Analytics Dashboard</h1>
                <p className="text-sm text-slate-500">Session ID: a7f3c2d1 • Started 18 minutes ago</p>
              </div>
            </div>
            
            {/* Real-time metrics */}
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">{trustLevel}%</div>
                <div className="text-xs text-slate-500">Trust Level</div>
                <div className="text-xs text-green-600">↗ +8% from start</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">94%</div>
                <div className="text-xs text-slate-500">Avg Confidence</div>
                <div className="text-xs text-blue-600">24 responses</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">2.1s</div>
                <div className="text-xs text-slate-500">Avg Response</div>
                <div className="text-xs text-purple-600">Tinkerer active</div>
              </div>

              {/* Skeptic mode with data */}
              <button
                onClick={() => setSkepticMode(!skepticMode)}
                className={`relative px-4 py-2 rounded-lg border transition-all ${
                  skepticMode 
                    ? 'bg-red-50 border-red-200 text-red-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-sm font-medium">
                  Skeptic Mode {skepticMode ? 'ON' : 'OFF'}
                </div>
                <div className="text-xs">
                  {skepticMode ? '+23% accuracy' : 'Standard mode'}
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Chat - Left Column */}
          <div className="col-span-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Conversation Stream</h2>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-slate-500">
                      Messages: <span className="font-medium text-slate-900">24</span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Artifacts: <span className="font-medium text-slate-900">3</span>
                    </div>
                  </div>
                </div>

                {/* Messages with analytics overlays */}
                <div className="space-y-6">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="max-w-lg">
                      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg">
                        <p className="text-sm">Create a financial tracking dashboard with budget alerts</p>
                        <div className="mt-2 pt-2 border-t border-blue-500/30 text-xs text-blue-100">
                          14:32:15 • 67 chars • Complexity: High
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assistant Message with Rich Analytics */}
                  <div className="flex justify-start">
                    <div className="max-w-2xl w-full">
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        {/* Message header with metrics */}
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-purple-100 border border-purple-200 rounded flex items-center justify-center">
                                <span className="text-xs font-medium text-purple-600">T</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">Tinkerer Agent</div>
                                <div className="text-xs text-slate-500">Response time: 2.3s • Tokens: 1,247</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              {/* Confidence visualization */}
                              <div className="text-center">
                                <div className="text-sm font-semibold text-green-600">96%</div>
                                <div className="text-xs text-slate-500">Confidence</div>
                              </div>
                              
                              {/* Trust impact */}
                              <div className="text-center">
                                <div className="text-sm font-semibold text-blue-600">+3%</div>
                                <div className="text-xs text-slate-500">Trust Δ</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Message content */}
                        <div className="p-4">
                          <p className="text-slate-800 leading-relaxed mb-3">
                            I'll create a comprehensive financial dashboard with real-time budget tracking, 
                            smart alerts, and visual spending analysis. This will include category-based 
                            budgets, trend predictions, and customizable notification thresholds.
                          </p>

                          {/* Reasoning Tree Visualization */}
                          <details className="mb-3">
                            <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                              View Decision Tree & Knowledge Sources
                            </summary>
                            <div className="mt-3 p-3 bg-slate-50 rounded border">
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  <span>Pattern Match: Dashboard Architecture (95% confidence)</span>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  <span>Applied: Observable Pattern, MVC Structure</span>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                  <span>Enhanced with: Real-time updates, Alert system</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                  <span>Complexity Assessment: Advanced (3,200+ chars)</span>
                                </div>
                              </div>
                            </div>
                          </details>

                          {/* Challenge interface with prediction */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500">
                              Predicted accuracy: 94% • Knowledge sources: 3
                            </div>
                            <button className="text-xs text-red-600 hover:text-red-700 font-medium border border-red-200 px-2 py-1 rounded">
                              Challenge Response
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Sidebar - Right Column */}
          <div className="col-span-4 space-y-6">
            {/* Trust Trend Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Trust Evolution</h3>
              
              {/* Mini trust chart */}
              <div className="space-y-3">
                <div className="flex items-end space-x-1 h-16">
                  {trustHistory.map((value, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div 
                        className={`bg-gradient-to-t rounded-t ${
                          value > 65 ? 'from-green-400 to-green-500' :
                          value > 45 ? 'from-yellow-400 to-yellow-500' :
                          'from-red-400 to-red-500'
                        }`}
                        style={{ height: `${(value / 100) * 100}%` }}
                      ></div>
                      <div className="text-xs text-slate-500 text-center mt-1">{value}</div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Session Start</span>
                  <span>Now</span>
                </div>
              </div>

              {/* Trust insights */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-sm font-medium text-green-800">📈 Trust Trend: Positive</div>
                <div className="text-xs text-green-700 mt-1">
                  Skeptic mode contributed to +15% trust stability
                </div>
              </div>
            </div>

            {/* Confidence Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Response Quality</h3>
              
              <div className="space-y-3">
                {confidenceDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{item.range}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color}`}
                          style={{ width: `${(item.count / 24) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-slate-900 w-6">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-xs text-slate-500">
                Average confidence: 94% • Std deviation: 12%
              </div>
            </div>

            {/* Agent Performance Comparison */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Agent Performance</h3>
              
              <div className="space-y-4">
                <div className="p-3 border border-slate-200 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">Tinkerer</span>
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Avg Response</div>
                      <div className="font-medium">2.1s</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Confidence</div>
                      <div className="font-medium">96%</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 border border-slate-200 rounded opacity-75">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">Wanderer</span>
                    <span className="text-xs text-slate-500">Standby</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Last Response</div>
                      <div className="font-medium">0.8s</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Confidence</div>
                      <div className="font-medium">89%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Artifact Analytics */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Generated Artifacts</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Dashboard.html</div>
                    <div className="text-xs text-slate-500">Complexity: Advanced • 3.2KB</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-600">96% confidence</div>
                    <div className="text-xs text-slate-500">2min ago</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-slate-500">
                Total artifacts: 3 • Success rate: 100%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}