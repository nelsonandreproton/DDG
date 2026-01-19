#!/usr/bin/env node

/**
 * Test script for DuckDuckGo MCP Server
 * Run with: node test.js
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testEndpoint(name, method, path, body = null) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   ${method} ${path}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
      console.log(`   Body: ${JSON.stringify(body, null, 2).substring(0, 100)}...`);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.text();
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    try {
      const json = JSON.parse(data);
      console.log(`   ✅ Response: ${JSON.stringify(json, null, 2).substring(0, 200)}...`);
      return { success: true, data: json };
    } catch {
      console.log(`   ✅ Response: ${data.substring(0, 200)}...`);
      return { success: true, data };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting MCP Server Tests');
  console.log(`📍 Target: ${BASE_URL}\n`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Test 1: Health check
  results.push(await testEndpoint(
    'Health Check',
    'GET',
    '/health'
  ));
  
  // Test 2: Root endpoint
  results.push(await testEndpoint(
    'Server Info',
    'GET',
    '/'
  ));
  
  // Test 3: Diagnostic endpoint
  results.push(await testEndpoint(
    'Diagnostics',
    'GET',
    '/test'
  ));
  
  // Test 4: Initialize
  results.push(await testEndpoint(
    'MCP Initialize',
    'POST',
    '/mcp',
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    }
  ));
  
  // Test 5: Tools list
  results.push(await testEndpoint(
    'MCP Tools List',
    'POST',
    '/mcp',
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }
  ));
  
  // Test 6: Search (simple query)
  results.push(await testEndpoint(
    'MCP Search Tool',
    'POST',
    '/mcp',
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_web',
        arguments: {
          query: 'test',
          max_results: 2
        }
      }
    }
  ));
  
  // Test 7: Notification (no response expected)
  results.push(await testEndpoint(
    'MCP Notification',
    'POST',
    '/mcp',
    {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    }
  ));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Server is ready.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
