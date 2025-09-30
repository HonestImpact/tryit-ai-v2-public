// Beautiful Approachable Direction - Ethereal Canvas Interface
'use client';

import React, { useState } from 'react';

export default function BeautifulApproachableInterface() {
  const [trustLevel, setTrustLevel] = useState(65);
  const [skepticMode, setSkepticMode] = useState(false);
  const [showReasoningGently, setShowReasoningGently] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Floating Header */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/40 to-white/60 backdrop-blur-xl"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            {/* Logo with breathing animation */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center animate-pulse">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                {/* Subtle pulse ring */}
                <div className="absolute inset-0 rounded-2xl bg-blue-400/20 animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-light text-slate-800">Noah</h1>
                <p className="text-sm text-slate-500">Building trust together</p>
              </div>
            </div>

            {/* Trust Garden Visualization */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-xs font-medium text-slate-600 mb-2">Trust Growth</div>
                <div className="relative">
                  {/* Tree metaphor */}
                  <div className="w-16 h-16 relative">
                    <svg className="w-full h-full" viewBox="0 0 64 64">
                      {/* Tree trunk */}
                      <rect x="30" y="40" width="4" height="24" fill="#8B4513" rx="2"/>
                      {/* Tree crown - grows with trust */}
                      <circle 
                        cx="32" 
                        cy="35" 
                        r={8 + (trustLevel / 100) * 6} 
                        fill={`hsl(${trustLevel * 1.2}, 60%, 50%)`}
                        className="transition-all duration-1000 ease-out"
                      />
                      {/* Leaves floating */}
                      {trustLevel > 50 && (
                        <>
                          <circle cx="45" cy="25" r="2" fill="#4ADE80" opacity="0.6" className="animate-bounce" style={{animationDelay: '0.5s'}}/>
                          <circle cx="20" cy="30" r="1.5" fill="#4ADE80" opacity="0.4" className="animate-bounce" style={{animationDelay: '1s'}}/>
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{trustLevel}% grown</div>
                </div>
              </div>

              {/* Gentle Skeptic Toggle */}
              <div className="text-center">
                <div className="text-xs font-medium text-slate-600 mb-3">Thoughtful Mode</div>
                <button
                  onClick={() => setSkepticMode(!skepticMode)}
                  className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                    skepticMode 
                      ? 'bg-gradient-to-r from-amber-200 to-orange-300 shadow-amber-200/50 shadow-lg' 
                      : 'bg-gradient-to-r from-slate-200 to-slate-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
                      skepticMode ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  >
                    {skepticMode ? (
                      <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    )}
                  </div>
                </button>
                <div className="text-xs text-slate-500 mt-2">
                  {skepticMode ? 'Questioning gently' : 'Trusting freely'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        {/* Hero Message */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light text-slate-800 mb-4">
            Your curiosity makes this <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">better</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            This AI grows stronger when you ask questions. Your skepticism isn't a barrier—it's how we build something trustworthy together.
          </p>
        </div>

        {/* Conversation */}
        <div className="space-y-8">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-lg">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white px-6 py-4 rounded-3xl rounded-br-lg shadow-xl shadow-blue-500/20">
                <p className="leading-relaxed">
                  Can you help me create a meditation timer app?
                </p>
                <div className="text-xs text-blue-100 mt-2 opacity-75">2:34 PM</div>
              </div>
            </div>
          </div>

          {/* Assistant Message with Gentle Trust Building */}
          <div className="flex justify-start">
            <div className="max-w-2xl">
              <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl rounded-bl-lg shadow-xl shadow-slate-200/50 p-6">
                <div className="flex items-start space-x-4">
                  {/* Avatar with soft pulse */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">N</span>
                    </div>
                    <div className="absolute inset-0 bg-emerald-400/30 rounded-full animate-ping"></div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-slate-800 leading-relaxed mb-4">
                      I'd love to help you create a peaceful meditation timer. I'm thinking of something with gentle sounds, 
                      customizable durations, and maybe some breathing guidance. 
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">Just now • Noah</div>
                      
                      {/* Gentle confidence indicator */}
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {[1,2,3,4,5].map((i) => (
                            <div 
                              key={i}
                              className={`w-1 h-4 rounded-full transition-all duration-300 ${
                                i <= 4 ? 'bg-emerald-400' : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">Confident</span>
                      </div>
                    </div>

                    {/* Gentle reasoning reveal */}
                    <button
                      onClick={() => setShowReasoningGently(!showReasoningGently)}
                      className="mt-3 text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-1"
                    >
                      <span>See my thinking process</span>
                      <svg className={`w-3 h-3 transition-transform ${showReasoningGently ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {showReasoningGently && (
                      <div className="mt-3 p-4 bg-blue-50/50 border border-blue-200/50 rounded-2xl">
                        <div className="text-xs text-slate-600 space-y-1">
                          <div>💭 I considered meditation app best practices</div>
                          <div>🎨 Planning a calming design with nature sounds</div>
                          <div>⏱️ Thinking about flexible timing options</div>
                          <div>🧘 Including breath guidance for beginners</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Challenge invitation - very gentle */}
                <div className="mt-4 pt-4 border-t border-slate-200/50">
                  <button className="text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>Something not quite right? Let me know</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Artifacts Panel */}
        <div className="mt-12">
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-xl shadow-slate-200/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-800">Your Creative Space</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-500">1 creation ready</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200/50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-800">Meditation Timer</h4>
                  <p className="text-xs text-slate-600">Beautiful & peaceful • Just created</p>
                </div>
                <button className="bg-white/80 hover:bg-white transition-colors rounded-xl p-2 shadow-sm">
                  <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="mt-8">
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-4 shadow-xl shadow-slate-200/30">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="What would you like to create together?"
                className="flex-1 bg-transparent text-slate-800 placeholder-slate-500 focus:outline-none"
              />
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl px-6 py-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200">
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}