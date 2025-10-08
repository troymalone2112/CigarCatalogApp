# 🚀 Quick Start - API Keys Setup

## Step 1: Get Your API Keys

### OpenAI API Key
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up/login
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

### Perplexity API Key  
1. Go to [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Sign up/login
3. Generate API key
4. Copy the key (starts with `pplx-...`)

## Step 2: Create .env File

Create a file named `.env` in your project root:

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-actual-openai-key-here
EXPO_PUBLIC_PERPLEXITY_API_KEY=pplx-your-actual-perplexity-key-here
```

## Step 3: Test Configuration

Run the test script:
```bash
node test-api-keys.js
```

## Step 4: Start the App

```bash
npm start
```

## ✅ You're Ready!

- Take photos of cigars for AI recognition
- Use manual entry as backup
- Toggle budget mode to save costs
- Build your digital humidor!

## Need Help?

See `API_SETUP_GUIDE.md` for detailed instructions and troubleshooting.



