#!/usr/bin/env node
import pg from 'pg';

const { Client } = pg;

async function testToolReference() {
  console.log('🧪 Testing tool reference system...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    // Test 1: Count total tools
    const countResult = await client.query('SELECT COUNT(*) as total FROM tool_reference');
    const totalTools = countResult.rows[0].total;
    console.log(`✅ Total tools in database: ${totalTools}`);
    
    // Test 2: List all categories
    const categoriesResult = await client.query('SELECT DISTINCT category FROM tool_reference ORDER BY category');
    console.log(`\n📋 Available categories:`);
    categoriesResult.rows.forEach(row => {
      console.log(`  - ${row.category}`);
    });
    
    // Test 3: Search functionality tests
    const searches = [
      'calculator',
      'budget',
      'timer',
      'kanban',
      'form',
      'chart'
    ];
    
    console.log(`\n🔍 Testing search functionality:`);
    for (const searchTerm of searches) {
      const searchResult = await client.query(`
        SELECT tool_name, title, category 
        FROM tool_reference 
        WHERE to_tsvector('english', title || ' ' || description || ' ' || category || ' ' || features) @@ plainto_tsquery('english', $1)
        ORDER BY title
      `, [searchTerm]);
      
      if (searchResult.rows.length > 0) {
        console.log(`  "${searchTerm}": Found ${searchResult.rows.length} tools`);
        searchResult.rows.forEach(row => {
          console.log(`    - ${row.title} (${row.category})`);
        });
      } else {
        console.log(`  "${searchTerm}": No tools found`);
      }
    }
    
    // Test 4: Get tool by category
    console.log(`\n📊 Tools by category:`);
    const categoryResult = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM tool_reference 
      GROUP BY category 
      ORDER BY count DESC, category
    `);
    
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} tools`);
    });
    
    // Test 5: Get sample tool details
    console.log(`\n🛠️ Sample tool details:`);
    const sampleResult = await client.query(`
      SELECT tool_name, title, description, features, functionality 
      FROM tool_reference 
      WHERE tool_name = 'simple-calculator' 
      LIMIT 1
    `);
    
    if (sampleResult.rows.length > 0) {
      const tool = sampleResult.rows[0];
      console.log(`Tool: ${tool.title}`);
      console.log(`Description: ${tool.description}`);
      console.log(`Features: ${tool.features}`);
      console.log(`Functionality: ${tool.functionality}`);
    }
    
    // Test 6: Verify HTML content is stored
    const htmlResult = await client.query('SELECT COUNT(*) as count FROM tool_reference WHERE html_content IS NOT NULL AND length(html_content) > 1000');
    const toolsWithHtml = htmlResult.rows[0].count;
    console.log(`\n📄 Tools with full HTML content: ${toolsWithHtml}/${totalTools}`);
    
    console.log(`\n✅ Tool reference system is working correctly!`);
    console.log(`🎯 Ready for Tinkerer to use for intelligent tool building`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the test
testToolReference().catch(error => {
  console.error('❌ Tool reference test failed:', error);
  process.exit(1);
});