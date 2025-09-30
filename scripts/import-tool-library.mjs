#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

// Import our existing RAG system
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the RAG system directly
import('../rag/index.ts').then(async ({ ragSystem }) => {
  await importToolLibrary(ragSystem);
}).catch(error => {
  console.error('Failed to import RAG system:', error);
  process.exit(1);
});

async function parseHTMLTool(filePath) {
  console.log(`Parsing: ${filePath}`);
  
  const htmlContent = await fs.readFile(filePath, 'utf-8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  // Extract metadata
  const titleElement = document.querySelector('title');
  const title = titleElement ? titleElement.textContent.trim() : path.basename(filePath, '.html');
  
  // Look for description in various places
  let description = '';
  const descParagraph = document.querySelector('p');
  if (descParagraph) {
    description = descParagraph.textContent.trim();
  }
  
  // Extract tool category from filename
  const filename = path.basename(filePath, '.html');
  const toolName = filename.replace(/_\d+$/, ''); // Remove timestamp
  const category = getToolCategory(toolName);
  
  // Create structured content for RAG (optimized for memory - exclude full HTML)
  const structuredContent = `
TOOL: ${title}

DESCRIPTION: ${description}

CATEGORY: ${category}

FUNCTIONALITY:
${extractFunctionality(document)}

IMPLEMENTATION:
This is a complete HTML tool with CSS styling and JavaScript functionality.
Key features include:
${extractKeyFeatures(document)}

USAGE PATTERNS:
${getUsagePatterns(toolName)}

TECHNICAL DETAILS:
- Interactive user interface with HTML, CSS, and JavaScript
- Responsive design for various screen sizes
- Self-contained tool requiring no external dependencies
- Can be used as reference for building similar functionality
  `.trim();
  
  return {
    content: structuredContent,
    metadata: {
      title,
      description,
      category,
      toolName,
      type: 'interactive_tool',
      filename: path.basename(filePath),
      technologies: ['HTML', 'CSS', 'JavaScript'],
      lastModified: new Date().toISOString()
    }
  };
}

function getToolCategory(toolName) {
  const categories = {
    'budget': 'Finance & Planning',
    'calculator': 'Utilities & Math',
    'timer': 'Productivity & Time',
    'kanban': 'Project Management',
    'form': 'Data Collection',
    'chart': 'Data Visualization',
    'tracker': 'Productivity & Tracking',
    'scheduler': 'Time & Calendar',
    'checklist': 'Task Management',
    'comparison': 'Analysis & Decision',
    'decision': 'Analysis & Decision',
    'habit': 'Personal Development',
    'meeting': 'Collaboration',
    'progress': 'Project Management',
    'random': 'Utilities & Fun',
    'rating': 'Feedback & Assessment',
    'slider': 'User Interface',
    'text': 'Content & Writing',
    'timeline': 'Project Management',
    'date': 'Time & Calendar'
  };
  
  for (const [key, category] of Object.entries(categories)) {
    if (toolName.includes(key)) {
      return category;
    }
  }
  
  return 'General Tools';
}

function extractFunctionality(document) {
  const functions = [];
  
  // Look for buttons and their onclick handlers
  const buttons = document.querySelectorAll('button[onclick]');
  buttons.forEach(button => {
    const onclick = button.getAttribute('onclick');
    const text = button.textContent.trim();
    if (text && onclick) {
      functions.push(`- ${text}: ${onclick}`);
    }
  });
  
  // Look for input fields
  const inputs = document.querySelectorAll('input[type], select');
  inputs.forEach(input => {
    const type = input.type || input.tagName.toLowerCase();
    const id = input.id || input.name;
    if (id) {
      functions.push(`- ${type} input: ${id}`);
    }
  });
  
  return functions.length > 0 ? functions.join('\n') : 'Interactive tool with dynamic functionality';
}

function extractKeyFeatures(document) {
  const features = [];
  
  // Check for common patterns
  if (document.querySelector('.calculator, #calculator')) features.push('Calculator interface');
  if (document.querySelector('.timer, #timer')) features.push('Timer functionality');
  if (document.querySelector('.kanban, .task-board')) features.push('Kanban board layout');
  if (document.querySelector('.form, form')) features.push('Form handling');
  if (document.querySelector('.chart, .graph')) features.push('Data visualization');
  if (document.querySelector('.progress, .progress-bar')) features.push('Progress tracking');
  if (document.querySelector('.calendar, .scheduler')) features.push('Calendar/scheduling');
  if (document.querySelector('table')) features.push('Tabular data display');
  if (document.querySelector('.slider, input[type="range"]')) features.push('Slider controls');
  if (document.querySelector('button')) features.push('Interactive buttons');
  if (document.querySelector('input, textarea, select')) features.push('User input fields');
  
  return features.length > 0 ? features.join('\n- ') : 'Interactive user interface';
}

function getUsagePatterns(toolName) {
  const patterns = {
    'budget': 'Financial planning, expense tracking, income management',
    'calculator': 'Mathematical calculations, quick computations',
    'timer': 'Time management, productivity tracking, countdowns',
    'kanban': 'Project management, task organization, workflow visualization',
    'form': 'Data collection, user input, information gathering',
    'chart': 'Data visualization, analytics, reporting',
    'tracker': 'Progress monitoring, habit building, goal tracking',
    'scheduler': 'Appointment booking, time management, calendar planning',
    'checklist': 'Task completion, to-do management, progress tracking',
    'comparison': 'Decision making, option analysis, feature comparison',
    'decision': 'Choice analysis, weighted scoring, decision support',
    'habit': 'Personal development, routine building, behavior tracking',
    'meeting': 'Team coordination, scheduling, collaboration',
    'progress': 'Project tracking, milestone monitoring, status updates',
    'random': 'Random selection, decision making, entertainment',
    'rating': 'Feedback collection, assessment, evaluation',
    'slider': 'Value adjustment, range selection, interactive controls',
    'text': 'Content creation, text manipulation, formatting',
    'timeline': 'Project planning, milestone tracking, chronological display',
    'date': 'Date selection, time picking, scheduling'
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    if (toolName.includes(key)) {
      return pattern;
    }
  }
  
  return 'General purpose interactive tool for various workflows';
}

async function importToolLibrary(ragSystem) {
  console.log('Starting tool library import with streaming approach...');
  
  const toolsDir = path.join(__dirname, '..', 'tools', 'reference-library');
  
  try {
    const files = await fs.readdir(toolsDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    console.log(`Found ${htmlFiles.length} HTML tools to import`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Initialize RAG system once
    await ragSystem.initialize();
    console.log('✅ RAG system initialized');
    
    // Process files one by one to avoid memory issues
    for (const file of htmlFiles) {
      try {
        console.log(`\n🔄 Processing: ${file}`);
        
        const filePath = path.join(toolsDir, file);
        const { content, metadata } = await parseHTMLTool(filePath);
        
        // Create single document for streaming processing
        const document = {
          id: `tool_${metadata.toolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content,
          metadata: {
            source: `tool_library/${file}`,
            type: 'knowledge',
            title: metadata.title,
            category: metadata.category,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        };
        
        // Process one document at a time
        await ragSystem.addDocuments([document]);
        
        console.log(`✅ Successfully imported: ${metadata.title}`);
        successCount++;
        
        // Small delay to allow garbage collection
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
      } catch (error) {
        console.error(`❌ Error importing ${file}:`, error.message);
        errorCount++;
        
        // Continue with next file instead of stopping
        continue;
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Success: ${successCount} tools`);
    console.log(`❌ Errors: ${errorCount} tools`);
    console.log(`📚 Total: ${htmlFiles.length} tools processed`);
    
    if (successCount > 0) {
      console.log(`\n🎉 Successfully imported ${successCount} tools to RAG knowledge base!`);
    }
    
  } catch (error) {
    console.error('❌ Failed to import tool library:', error);
    process.exit(1);
  }
}