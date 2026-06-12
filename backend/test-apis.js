#!/usr/bin/env node

/**
 * Travel Explore Destinations - API Diagnostic Script
 * Run this to check if all APIs are working correctly
 * 
 * Usage: node test-apis.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(symbol, message, color = 'reset') {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.clear();
  log('🚀', 'Travel Explore Destinations - API Diagnostic', 'cyan');
  log('=', '='.repeat(50), 'cyan');
  
  // Test 1: Backend Health
  log('📡', 'Test 1: Checking Backend Server...', 'blue');
  try {
    const health = await request(`${BASE_URL}/api/opentripmap/health`);
    if (health.status === 200) {
      log('✅', 'Backend is running!', 'green');
      log('   ', `API Key Configured: ${health.data.apiKeyConfigured}`, 'green');
      log('   ', `API Key Preview: ${health.data.apiKeyPreview}`, 'green');
    } else {
      log('❌', `Backend returned status ${health.status}`, 'red');
    }
  } catch (err) {
    log('❌', `Backend is NOT running: ${err.message}`, 'red');
    log('   ', 'Fix: Run "node server.js" in the Travel folder', 'yellow');
    process.exit(1);
  }
  
  console.log('');
  
  // Test 2: Popular Destinations
  log('📍', 'Test 2: Fetching Popular Destinations...', 'blue');
  try {
    const popular = await request(`${BASE_URL}/api/opentripmap/popular`);
    if (popular.status === 200 && Array.isArray(popular.data)) {
      log('✅', `Successfully loaded ${popular.data.length} popular destinations`, 'green');
      log('   ', `Sample: ${popular.data[0].name} (${popular.data[0].city})`, 'green');
    } else {
      log('❌', `Unexpected response`, 'red');
    }
  } catch (err) {
    log('❌', `Failed to load popular destinations: ${err.message}`, 'red');
  }
  
  console.log('');
  
  // Test 3: Search - Agra
  log('🔍', 'Test 3: Searching for "Agra"...', 'blue');
  try {
    const search = await request(`${BASE_URL}/api/opentripmap/search?query=Agra&limit=5`);
    if (search.status === 200 && search.data.features) {
      log('✅', `Found ${search.data.count} destinations for "Agra"`, 'green');
      if (search.data.features.length > 0) {
        log('   ', `First result: ${search.data.features[0].properties?.name || 'Unknown'}`, 'green');
      }
    } else {
      log('❌', `Search returned status ${search.status}`, 'red');
      if (search.data.error) log('   ', `Error: ${search.data.error}`, 'yellow');
    }
  } catch (err) {
    log('❌', `Search request failed: ${err.message}`, 'red');
  }
  
  console.log('');
  
  // Test 4: Search - Mumbai
  log('🔍', 'Test 4: Searching for "Mumbai"...', 'blue');
  try {
    const search = await request(`${BASE_URL}/api/opentripmap/search?query=Mumbai&limit=5`);
    if (search.status === 200 && search.data.features) {
      log('✅', `Found ${search.data.count} destinations for "Mumbai"`, 'green');
      if (search.data.features.length > 0) {
        log('   ', `First result: ${search.data.features[0].properties?.name || 'Unknown'}`, 'green');
      }
    } else {
      log('⚠️ ', `Search returned status ${search.status}`, 'yellow');
    }
  } catch (err) {
    log('❌', `Search request failed: ${err.message}`, 'red');
  }
  
  console.log('');
  
  // Test 5: Database Destinations
  log('💾', 'Test 5: Checking Database Destinations...', 'blue');
  try {
    const db = await request(`${BASE_URL}/api/destination/destinations`);
    if (db.status === 200) {
      const count = Array.isArray(db.data) ? db.data.length : 0;
      if (count > 0) {
        log('✅', `Database has ${count} destinations`, 'green');
      } else {
        log('⚠️ ', 'Database is empty (this is OK, use search to add destinations)', 'yellow');
      }
    } else {
      log('⚠️ ', `Database endpoint returned status ${db.status}`, 'yellow');
    }
  } catch (err) {
    log('⚠️ ', `Database check failed: ${err.message}`, 'yellow');
  }
  
  console.log('');
  log('=', '='.repeat(50), 'cyan');
  log('📋', 'Diagnostic Summary', 'cyan');
  log('   ', '✅ If all tests passed, your API is working!', 'green');
  log('   ', '⚠️  Check warnings before deploying', 'yellow');
  log('   ', '❌ Fix errors - backend must be running', 'red');
  log('   ', '', 'reset');
  log('💡', 'Tips:', 'cyan');
  log('   ', '1. Make sure node server.js is running', 'reset');
  log('   ', '2. Make sure MongoDB is running', 'reset');
  log('   ', '3. Check your OpenTripMap API key in .env / config/apiConfig.js', 'reset');
  log('   ', '4. Try searching from browser at http://localhost:5174', 'reset');
  log('   ', '', 'reset');
}

// Run the tests
runTests().catch(err => {
  log('🔥', `Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
