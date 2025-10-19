#!/usr/bin/env node

/**
 * Script to test which API is hitting quota limits
 * Run with: node test-api-quota.js
 */

require('dotenv').config();
const axios = require('axios');

async function testOpenAI() {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.log('❌ OpenAI API Key not found');
    return false;
  }

  try {
    console.log('🔍 Testing OpenAI API with small request...');
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ OpenAI API working - quota available');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ OpenAI API Key invalid or expired');
    } else if (error.response?.status === 429) {
      console.log('⚠️ OpenAI API quota exceeded or rate limited');
      console.log('   Error:', error.response?.data?.error?.message);
    } else if (error.response?.status === 402) {
      console.log('💳 OpenAI API payment required or quota exceeded');
      console.log('   Error:', error.response?.data?.error?.message);
    } else {
      console.log('❌ OpenAI API error:', error.response?.status, error.response?.data?.error?.message);
    }
    return false;
  }
}

async function testPerplexity() {
  const apiKey = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.log('❌ Perplexity API Key not found');
    return false;
  }

  try {
    console.log('🔍 Testing Perplexity API with small request...');
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ Perplexity API working - quota available');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Perplexity API Key invalid or expired');
    } else if (error.response?.status === 429) {
      console.log('⚠️ Perplexity API quota exceeded or rate limited');
      console.log('   Error:', error.response?.data?.error?.message);
    } else if (error.response?.status === 402) {
      console.log('💳 Perplexity API payment required or quota exceeded');
      console.log('   Error:', error.response?.data?.error?.message);
    } else {
      console.log('❌ Perplexity API error:', error.response?.status, error.response?.data?.error?.message);
    }
    return false;
  }
}

async function main() {
  console.log('🔑 Testing API Quota Status...\n');
  
  const openaiWorking = await testOpenAI();
  console.log('');
  const perplexityWorking = await testPerplexity();
  
  console.log('\n📊 Results:');
  if (openaiWorking && perplexityWorking) {
    console.log('🎉 Both APIs working! The quota error might be intermittent.');
    console.log('💡 Try the recognition again - it might have been a temporary rate limit.');
  } else if (openaiWorking && !perplexityWorking) {
    console.log('⚠️ OpenAI working, Perplexity has quota issues');
    console.log('💡 Switch to BUDGET mode (ChatGPT only) to continue using the app');
  } else if (!openaiWorking && perplexityWorking) {
    console.log('⚠️ Perplexity working, OpenAI has quota issues');
    console.log('💡 The app will need OpenAI for image recognition');
  } else {
    console.log('❌ Both APIs have issues - check your billing and quotas');
  }
  
  console.log('\n🔧 Recommendations:');
  console.log('- Check your OpenAI billing dashboard: https://platform.openai.com/usage');
  console.log('- Check your Perplexity billing dashboard: https://www.perplexity.ai/settings/billing');
  console.log('- Consider upgrading your plan if you\'re hitting limits frequently');
  console.log('- Use BUDGET mode (ChatGPT only) to reduce API usage');
}

main().catch(console.error);





