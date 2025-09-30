#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const { Client } = pg;

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
  
  // Extract key features
  const features = extractKeyFeatures(document);
  const functionality = extractFunctionality(document);
  const usagePatterns = getUsagePatterns(toolName);
  
  return {
    toolName,
    title,
    description,
    category,
    features,
    functionality,
    usagePatterns,
    htmlContent,
    filename: path.basename(filePath)
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
  
  return features.join(', ') || 'Interactive user interface';
}

function extractFunctionality(document) {
  const functions = [];
  
  // Look for buttons and their onclick handlers
  const buttons = document.querySelectorAll('button[onclick]');
  buttons.forEach(button => {
    const onclick = button.getAttribute('onclick');
    const text = button.textContent.trim();
    if (text && onclick) {
      functions.push(`${text}: ${onclick}`);
    }
  });
  
  // Look for input fields
  const inputs = document.querySelectorAll('input[type], select');
  inputs.forEach(input => {
    const type = input.type || input.tagName.toLowerCase();
    const id = input.id || input.name;
    if (id) {
      functions.push(`${type} input: ${id}`);
    }
  });
  
  return functions.length > 0 ? functions.join('; ') : 'Interactive tool with dynamic functionality';
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

async function createToolReferenceDatabase() {
  console.log('Creating tool reference database...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS tool_reference (
        id SERIAL PRIMARY KEY,
        tool_name VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100),
        features TEXT,
        functionality TEXT,
        usage_patterns TEXT,
        html_content TEXT,
        filename VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tool_name)
      );
    `);
    
    // Create search index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tool_reference_search 
      ON tool_reference USING gin(to_tsvector('english', title || ' ' || description || ' ' || category || ' ' || features));
    `);
    
    console.log('✅ Tool reference table created');
    
    // Parse and insert tools
    const toolsDir = path.join(__dirname, '..', 'tools', 'reference-library');
    const files = await fs.readdir(toolsDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    console.log(`Found ${htmlFiles.length} HTML tools to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of htmlFiles) {
      try {
        const filePath = path.join(toolsDir, file);
        const toolData = await parseHTMLTool(filePath);
        
        // Insert into database (with upsert to handle duplicates)
        await client.query(`
          INSERT INTO tool_reference (
            tool_name, title, description, category, features, 
            functionality, usage_patterns, html_content, filename
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (tool_name) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            features = EXCLUDED.features,
            functionality = EXCLUDED.functionality,
            usage_patterns = EXCLUDED.usage_patterns,
            html_content = EXCLUDED.html_content,
            filename = EXCLUDED.filename,
            created_at = CURRENT_TIMESTAMP
        `, [
          toolData.toolName,
          toolData.title,
          toolData.description,
          toolData.category,
          toolData.features,
          toolData.functionality,
          toolData.usagePatterns,
          toolData.htmlContent,
          toolData.filename
        ]);
        
        console.log(`✅ Inserted: ${toolData.title}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        errorCount++;
      }
    }
    
    // Show summary
    const result = await client.query('SELECT COUNT(*) as total FROM tool_reference');
    const totalInDb = result.rows[0].total;
    
    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Success: ${successCount} tools`);
    console.log(`❌ Errors: ${errorCount} tools`);
    console.log(`📚 Total in database: ${totalInDb} tools`);
    
    // Test search functionality
    console.log(`\n🔍 Testing search functionality...`);
    const searchResult = await client.query(`
      SELECT tool_name, title, category 
      FROM tool_reference 
      WHERE to_tsvector('english', title || ' ' || description || ' ' || category || ' ' || features) @@ plainto_tsquery('english', 'calculator')
      LIMIT 3;
    `);
    
    console.log(`Found ${searchResult.rows.length} calculator-related tools:`);
    searchResult.rows.forEach(row => {
      console.log(`  - ${row.title} (${row.category})`);
    });
    
  } finally {
    await client.end();
  }
}

// Run the script
createToolReferenceDatabase().catch(error => {
  console.error('❌ Failed to create tool reference database:', error);
  process.exit(1);
});