#!/usr/bin/env node

/**
 * Script to check API usage and quota status
 * Run with: node check-api-usage.js
 */

require('dotenv').config();
const axios = require('axios');

async function checkOpenAIUsage() {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.log('❌ OpenAI API Key not found');
    return;
  }

  try {
    console.log('🔍 Checking OpenAI usage...');
    const response = await axios.get('https://api.openai.com/v1/usage', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    console.log('✅ OpenAI API accessible');
    console.log('📊 Usage data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ OpenAI API Key invalid or expired');
    } else if (error.response?.status === 429) {
      console.log('⚠️ OpenAI API quota exceeded');
    } else {
      console.log('❌ OpenAI API error:', error.response?.status, error.response?.data);
    }
  }
}

async function checkPerplexityUsage() {
  const apiKey = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.log('❌ Perplexity API Key not found');
    return;
  }

  try {
    console.log('🔍 Checking Perplexity usage...');
    const response = await axios.get('https://api.perplexity.ai/accounts/self', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    console.log('✅ Perplexity API accessible');
    console.log('📊 Account data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Perplexity API Key invalid or expired');
    } else if (error.response?.status === 429) {
      console.log('⚠️ Perplexity API quota exceeded');
    } else {
      console.log('❌ Perplexity API error:', error.response?.status, error.response?.data);
    }
  }
}

async function main() {
  console.log('🔑 Checking API Usage and Quota Status...\n');
  
  await checkOpenAIUsage();
  console.log('');
  await checkPerplexityUsage();
  
  console.log('\n💡 Tips:');
  console.log('- HYBRID mode uses BOTH APIs (ChatGPT + Perplexity)');
  console.log('- BUDGET mode uses only ChatGPT (cheaper)');
  console.log('- Check your billing dashboard for detailed usage');
  console.log('- Consider switching to BUDGET mode if quota is low');
}

main().catch(console.error);









