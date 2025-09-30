#!/usr/bin/env node
/**
 * Integration Test for Tool Reference System
 * Tests the complete pipeline from database to API to verify Tinkerer can access tools
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/knowledge/tools';

async function testToolIntegration() {
  console.log('🧪 Testing tool reference integration...');
  console.log('🌐 Testing API endpoints that Tinkerer will use\n');

  let allTestsPassed = true;

  try {
    // Test 1: Get tool statistics
    console.log('📊 Test 1: Getting tool statistics...');
    const statsResponse = await fetch(`${API_BASE}?action=stats`);
    const statsData = await statsResponse.json();
    
    if (statsData.success && statsData.totalTools > 0) {
      console.log(`✅ Found ${statsData.totalTools} tools across ${statsData.categoryCounts.length} categories`);
      console.log(`   Top categories:`);
      statsData.categoryCounts.slice(0, 3).forEach(cat => {
        console.log(`   - ${cat.category}: ${cat.count} tools`);
      });
    } else {
      console.log('❌ Stats test failed:', statsData);
      allTestsPassed = false;
    }

    // Test 2: Get all categories
    console.log('\n📋 Test 2: Getting available categories...');
    const categoriesResponse = await fetch(`${API_BASE}?action=categories`);
    const categoriesData = await categoriesResponse.json();
    
    if (categoriesData.success && categoriesData.categories.length > 0) {
      console.log(`✅ Found ${categoriesData.categories.length} categories:`);
      categoriesData.categories.slice(0, 5).forEach(cat => {
        console.log(`   - ${cat}`);
      });
      if (categoriesData.categories.length > 5) {
        console.log(`   ... and ${categoriesData.categories.length - 5} more`);
      }
    } else {
      console.log('❌ Categories test failed:', categoriesData);
      allTestsPassed = false;
    }

    // Test 3: Search functionality
    console.log('\n🔍 Test 3: Testing search functionality...');
    const searchQueries = ['calculator', 'budget', 'form', 'timer'];
    
    for (const query of searchQueries) {
      const searchResponse = await fetch(`${API_BASE}?action=search&q=${encodeURIComponent(query)}&limit=5`);
      const searchData = await searchResponse.json();
      
      if (searchData.success) {
        console.log(`✅ Search "${query}": Found ${searchData.count} tools`);
        if (searchData.tools.length > 0) {
          searchData.tools.forEach(tool => {
            console.log(`   - ${tool.title} (${tool.category})`);
          });
        }
      } else {
        console.log(`❌ Search "${query}" failed:`, searchData);
        allTestsPassed = false;
      }
    }

    // Test 4: Get tools by category
    console.log('\n📂 Test 4: Getting tools by category...');
    const categoryResponse = await fetch(`${API_BASE}?action=category&name=Project Management&limit=5`);
    const categoryData = await categoryResponse.json();
    
    if (categoryData.success) {
      console.log(`✅ "Project Management" category: Found ${categoryData.count} tools`);
      categoryData.tools.forEach(tool => {
        console.log(`   - ${tool.title}`);
        console.log(`     Features: ${tool.features}`);
      });
    } else {
      console.log('❌ Category test failed:', categoryData);
      allTestsPassed = false;
    }

    // Test 5: Get specific tool details
    console.log('\n🎯 Test 5: Getting specific tool details...');
    const toolResponse = await fetch(`${API_BASE}?action=get&name=simple-calculator`);
    const toolData = await toolResponse.json();
    
    if (toolData.success && toolData.tool) {
      const tool = toolData.tool;
      console.log(`✅ Tool details for "${tool.title}":`);
      console.log(`   Description: ${tool.description}`);
      console.log(`   Category: ${tool.category}`);
      console.log(`   Features: ${tool.features}`);
      console.log(`   HTML Content Length: ${tool.htmlContent ? tool.htmlContent.length : 0} characters`);
      console.log(`   Usage Patterns: ${tool.usagePatterns}`);
    } else {
      console.log('❌ Tool details test failed:', toolData);
      allTestsPassed = false;
    }

    // Test 6: Error handling
    console.log('\n🚫 Test 6: Testing error handling...');
    const errorResponse = await fetch(`${API_BASE}?action=get&name=nonexistent-tool`);
    const errorData = await errorResponse.json();
    
    if (!errorData.success && errorResponse.status === 404) {
      console.log('✅ Error handling works correctly (404 for nonexistent tool)');
    } else {
      console.log('❌ Error handling test failed:', errorData);
      allTestsPassed = false;
    }

    // Test 7: Simulate Tinkerer workflow
    console.log('\n🤖 Test 7: Simulating Tinkerer workflow...');
    console.log('   Scenario: Tinkerer wants to build a budget tracking app');
    
    // Step 1: Search for budget-related tools
    const budgetSearchResponse = await fetch(`${API_BASE}?action=search&q=budget tracker finance&limit=3`);
    const budgetSearchData = await budgetSearchResponse.json();
    
    if (budgetSearchData.success && budgetSearchData.tools.length > 0) {
      console.log(`✅ Found ${budgetSearchData.tools.length} budget-related tools`);
      
      // Step 2: Get detailed implementation of the best match
      const bestTool = budgetSearchData.tools[0];
      console.log(`   Best match: ${bestTool.title}`);
      
      const detailResponse = await fetch(`${API_BASE}?action=get&name=${encodeURIComponent(bestTool.toolName)}`);
      const detailData = await detailResponse.json();
      
      if (detailData.success && detailData.tool.htmlContent) {
        console.log(`✅ Retrieved full implementation (${detailData.tool.htmlContent.length} chars)`);
        console.log(`   Tinkerer now has access to:`);
        console.log(`   - Complete HTML structure`);
        console.log(`   - CSS styling patterns`);
        console.log(`   - JavaScript functionality`);
        console.log(`   - UI/UX design patterns`);
        console.log(`   - Data management approaches`);
      } else {
        console.log('❌ Failed to get tool implementation');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ Budget search test failed:', budgetSearchData);
      allTestsPassed = false;
    }

    // Final results
    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Tool reference system is fully integrated and ready for Tinkerer');
      console.log('🎯 Tinkerer can now:');
      console.log('   - Search for design patterns by functionality');
      console.log('   - Browse tools by category');
      console.log('   - Access complete implementations');
      console.log('   - Learn from 20 reference tools across 13 categories');
      console.log('   - Build intelligent applications with proven patterns');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('🔧 Integration needs attention before Tinkerer can use the system');
    }

  } catch (error) {
    console.error('💥 Integration test failed with error:', error);
    console.log('❌ Make sure the development server is running on localhost:5000');
    allTestsPassed = false;
  }

  return allTestsPassed;
}

// Run the integration test
testToolIntegration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});