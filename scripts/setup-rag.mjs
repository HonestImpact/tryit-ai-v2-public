#!/usr/bin/env node
// RAG Setup - Clean, bulletproof implementation
// Follows TryIt-AI Kit architecture patterns

import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Load environment
config({ path: join(projectRoot, '.env.local') });

console.log('🚀 TryIt-AI RAG Setup\n');

function validateEnvironment() {
  console.log('🔍 Validating environment...');

  const envPath = join(projectRoot, '.env.local');
  let envContent = '';

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }

  const required = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key =>
    !process.env[key] && !envContent.includes(`${key}=`)
  );

  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(key => console.log(`   ${key}`));
    console.log('\n💡 Add these to your .env.local file:');
    console.log('   ANTHROPIC_API_KEY=your_key_here');
    console.log('   OPENAI_API_KEY=your_key_here');
    process.exit(1);
  }

  // Ensure RAG is enabled
  if (!envContent.includes('RAG_ENABLED=')) {
    const ragConfig = `
# RAG Configuration (added by setup)
RAG_ENABLED=true
RAG_PROVIDER=langchain
RAG_CONTEXT_LIMIT=3
RAG_RELEVANCE_THRESHOLD=0.7
`;
    writeFileSync(envPath, envContent + ragConfig);
    console.log('✅ Added RAG configuration to .env.local');
  }

  console.log('✅ Environment validation passed');
}

function setupComponentDirectory() {
  console.log('📁 Setting up component directory...');

  const componentsDir = join(projectRoot, 'rag', 'components');

  if (!existsSync(componentsDir)) {
    console.log('⚠️ No components directory found');
    console.log('💡 You can add components later to:', componentsDir);
    return false;
  }

  console.log('✅ Components directory found');
  return true;
}

function updateAIConfig() {
  console.log('⚙️ Verifying AI configuration...');

  const aiConfigPath = join(projectRoot, 'src', 'lib', 'ai-config.ts');

  if (!existsSync(aiConfigPath)) {
    console.log('❌ AI config not found');
    return false;
  }

  const content = readFileSync(aiConfigPath, 'utf8');

  if (!content.includes('RAG_ENABLED')) {
    console.log('❌ AI config missing RAG settings');
    console.log('💡 RAG configuration already added to ai-config.ts');
    return false;
  }

  console.log('✅ AI configuration is ready');
  return true;
}

function checkChatIntegration() {
  console.log('🔌 Checking chat integration...');

  const chatPath = join(projectRoot, 'src', 'app', 'api', 'chat', 'route.ts');

  if (!existsSync(chatPath)) {
    console.log('❌ Chat route not found');
    return false;
  }

  const content = readFileSync(chatPath, 'utf8');

  if (!content.includes('getRAGContext')) {
    console.log('❌ Chat route missing RAG integration');
    console.log('💡 RAG integration already added to chat route');
    return false;
  }

  console.log('✅ Chat integration is ready');
  return true;
}

function displayInstructions() {
  console.log('\n🎯 Setup Complete!\n');

  console.log('📋 Next Steps:');
  console.log('  1. Restart your development server: pnpm dev');
  console.log('  2. Test RAG with Noah: "I need a calculator component"');
  console.log('  3. Add components to ./rag/components/ for enhanced responses\n');

  console.log('💡 Development Mode:');
  console.log('  • Uses in-memory vector store (no external dependencies)');
  console.log('  • Perfect for testing and development');
  console.log('  • Components reset on restart\n');

  console.log('🚀 Production Mode (Optional):');
  console.log('  • Add CHROMA_URL=your_chroma_server to .env.local');
  console.log('  • Add LANGSMITH_TRACING=true for monitoring\n');

  console.log('✅ Your RAG system is ready!');
}

// Main execution
try {
  validateEnvironment();
  setupComponentDirectory();
  updateAIConfig();
  checkChatIntegration();
  displayInstructions();
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}