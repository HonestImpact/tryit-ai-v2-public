# Noah - Trust Recovery Protocol AI System

> A multi-agent AI assistant designed to build genuine trust through honest interaction and collaborative problem-solving.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?style=flat-square&logo=tailwind-css)

## 🎯 What is Noah?

Noah is an advanced conversational AI system that generates functional web tools and provides intelligent assistance through a sophisticated multi-agent architecture. Unlike traditional chatbots, Noah implements a "Trust Recovery Protocol" - building authentic relationships through transparency, skepticism handling, and collaborative problem-solving.

### ✨ Key Features

- **🛠️ Real-time Tool Generation**: Creates complete HTML/CSS/JavaScript applications instantly
- **🧠 Multi-Agent Intelligence**: Specialized agents for research (Wanderer) and building (Tinkerer)
- **📦 Session-Based Toolbox**: Accumulates all generated tools with individual download capabilities
- **🔍 RAG-Powered Knowledge**: ChromaDB vector storage with 21 reference design patterns
- **⚡ Optimized Performance**: 83% faster tool generation (5 seconds vs 28+ seconds)
- **🤔 Skeptic Mode**: Optional challenging mode for more robust interactions
- **📊 Trust Tracking**: Dynamic trust scoring and transparent reasoning
- **🔄 Multi-Provider LLMs**: Supports Anthropic, OpenAI, Google, Mistral, and Cohere

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- API keys for AI providers (Anthropic/OpenAI recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HonestImpact/TryIt-AI-Replit.git
   cd TryIt-AI-Replit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your `.env.local`:
   ```env
   # Required API Keys
   ANTHROPIC_API_KEY=your_anthropic_key
   OPENAI_API_KEY=your_openai_key
   
   # Database
   DATABASE_URL=your_postgresql_url
   
   # Optimized Model Configuration
   LLM_DEEPBUILD=openai
   MODEL_ID_DEEPBUILD=gpt-4o
   LLM_DEFAULT=anthropic
   MODEL_ID_DEFAULT=claude-3-5-sonnet-20241022
   
   # RAG System
   RAG_ENABLED=true
   CHROMA_URL=http://localhost:8000
   ```

4. **Start the services**
   ```bash
   # Start ChromaDB (for RAG)
   npx chromadb run --host 0.0.0.0 --port 8000
   
   # Start Noah (in another terminal)
   npm run dev
   ```

5. **Access Noah**
   Open [http://localhost:5000](http://localhost:5000) in your browser

## 🏗️ Architecture Overview

### Multi-Agent System

- **Noah (Primary)**: Conversational interface and direct tool generation
- **Wanderer**: Research specialist with fast response times  
- **Tinkerer**: Technical implementation specialist with access to 21 design patterns

### Technology Stack

- **Frontend**: Next.js 15 + TypeScript + TailwindCSS 4
- **Backend**: Next.js API routes with multi-agent orchestration
- **Database**: PostgreSQL for analytics and tool storage
- **Vector Store**: ChromaDB for RAG knowledge base
- **AI Providers**: Anthropic Claude (primary), OpenAI, others via AI SDK

### Performance Optimizations

- **Task-specific model selection**: Different LLMs optimized for different tasks
- **Module-level agent caching**: Agents initialized once and reused
- **Turbopack development**: Fast development builds
- **Webpack production**: Stable production builds

## 🛠️ Core Features Explained

### Tool Generation
Noah can create complete web applications including:
- Interactive calculators and utilities
- Data visualization tools  
- Form builders and UI components
- Games and productivity apps

### Session-Based Toolbox
- All generated tools persist across the conversation
- Individual download buttons for each tool
- Agent attribution and timestamps
- Preview of tool content

### Trust Recovery Protocol
- **Skeptic Mode**: Challenge Noah's responses for more robust answers
- **Trust Scoring**: Dynamic trust levels based on interaction quality
- **Transparent Reasoning**: Optional display of decision-making process
- **Honest Communication**: Direct feedback about limitations and uncertainties

## 📊 Recent Improvements

### September 2025 Updates
- **83% Performance Boost**: Optimized model selection reduced tool generation from 28s to 5s
- **Enhanced Toolbox**: Session-based artifact management prevents tool overwriting
- **Production Deployment**: Fixed Turbopack symlink issues for stable deployments
- **Enhanced Tinkerer**: Integrated 21 reference design patterns for intelligent tool building

## 🔧 Configuration

### Model Configuration
```env
# For fastest tool generation
LLM_DEEPBUILD=openai
MODEL_ID_DEEPBUILD=gpt-4o

# For best conversation quality  
LLM_DEFAULT=anthropic
MODEL_ID_DEFAULT=claude-3-5-sonnet-20241022

# For research tasks
LLM_RESEARCH=openai
MODEL_ID_RESEARCH=gpt-4o-mini
```

### RAG Knowledge Base
The system includes 21 reference tools for intelligent design patterns:
- Budget trackers and financial tools
- Scheduling and calendar components  
- Form builders and data collection
- Charts and visualization libraries
- And more...

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Production build (Webpack)  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests with Vitest
npm run typecheck    # TypeScript type checking
```

### Project Structure

```
src/
├── app/                 # Next.js App Router
├── lib/
│   ├── agents/         # Multi-agent system
│   ├── analytics/      # User analytics and tracking
│   ├── knowledge/      # RAG and tool reference system
│   ├── providers/      # LLM provider factory
│   └── safety/         # Content safety and filtering
├── components/         # Reusable UI components
└── styles/            # Global styles and themes
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use TailwindCSS for styling
- Maintain test coverage for critical paths
- Follow the existing code style and patterns

## 📝 License

This project is proprietary software owned by HonestImpact.

## 🔗 Links

- **Repository**: https://github.com/HonestImpact/TryIt-AI-Replit
- **Issues**: Report bugs and feature requests
- **Documentation**: See `replit.md` for technical details

---

**Built with ❤️ by the HonestImpact team**

*Noah represents a new approach to AI assistance - one built on trust, transparency, and genuine collaboration.*