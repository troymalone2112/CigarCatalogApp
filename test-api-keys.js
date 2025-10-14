#!/usr/bin/env node

/**
 * Simple script to test API key configuration
 * Run with: node test-api-keys.js
 */

require('dotenv').config();

console.log('🔑 Testing API Key Configuration...\n');

// Check if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found');
  console.log('📝 Create a .env file in your project root with your API keys');
  console.log('📖 See API_SETUP_GUIDE.md for instructions\n');
  process.exit(1);
}

// Check OpenAI API Key
const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
if (openaiKey) {
  if (openaiKey.startsWith('sk-')) {
    console.log('✅ OpenAI API Key: Found and properly formatted');
  } else {
    console.log('⚠️ OpenAI API Key: Found but may be invalid (should start with "sk-")');
  }
} else {
  console.log('❌ OpenAI API Key: Not found');
  console.log('   Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file');
}

// Check Perplexity API Key
const perplexityKey = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY;
if (perplexityKey) {
  if (perplexityKey.startsWith('pplx-')) {
    console.log('✅ Perplexity API Key: Found and properly formatted');
  } else {
    console.log('⚠️ Perplexity API Key: Found but may be invalid (should start with "pplx-")');
  }
} else {
  console.log('❌ Perplexity API Key: Not found');
  console.log('   Add EXPO_PUBLIC_PERPLEXITY_API_KEY to your .env file');
}

// Summary
console.log('\n📊 Summary:');
const hasOpenAI = openaiKey && openaiKey.startsWith('sk-');
const hasPerplexity = perplexityKey && perplexityKey.startsWith('pplx-');

if (hasOpenAI && hasPerplexity) {
  console.log('🎉 All API keys configured! Your app should work properly.');
  console.log('💡 You can now test cigar recognition in the app.');
} else if (hasOpenAI) {
  console.log('⚠️ Only OpenAI configured. Budget mode will work, but no detailed search.');
} else if (hasPerplexity) {
  console.log('⚠️ Only Perplexity configured. Manual entry will work, but no image recognition.');
} else {
  console.log('❌ No API keys configured. The app will not function properly.');
}

console.log('\n📖 For setup instructions, see: API_SETUP_GUIDE.md');







