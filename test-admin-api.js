#!/usr/bin/env node
// Quick test script to verify admin API works

const http = require('http');

// Make request to local server
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin-users?limit=10',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
