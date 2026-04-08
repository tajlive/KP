#!/usr/bin/env node
// Test cookie format

const testCookie = {
  access_token: "eyJhbGciOiJIUzI1NiIs...",
  refresh_token: "eyJhbGciOiJIUzI1NiIs...",
  expires_in: 3600,
  expires_at: 1234567890,
  token_type: "bearer",
  user: { id: "test" }
};

const cookieValue = JSON.stringify(testCookie);
console.log('Cookie value format:');
console.log(cookieValue.substring(0, 100) + '...');
console.log('\nLength:', cookieValue.length);
console.log('Valid JSON:', JSON.parse(cookieValue) ? 'YES' : 'NO');
