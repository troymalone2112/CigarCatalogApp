# 🔑 API Keys Setup Guide

## Required API Keys

Your Cigar Catalog app needs two API keys to function properly:

### 1. OpenAI API Key (Required)
**Used for:** Image recognition and cigar identification from photos

**How to get it:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)
5. **Cost:** ~$0.01-0.05 per image recognition

### 2. Perplexity API Key (Required)
**Used for:** Detailed cigar information, pricing, and reviews

**How to get it:**
1. Go to [Perplexity API Settings](https://www.perplexity.ai/settings/api)
2. Sign up or log in to your account
3. Generate an API key
4. Copy the key
5. **Cost:** ~$0.001-0.01 per search

## Setup Instructions

### Step 1: Create Environment File
Create a file named `.env` in your project root with this content:

```bash
# OpenAI API Key
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-actual-openai-key-here

# Perplexity API Key  
EXPO_PUBLIC_PERPLEXITY_API_KEY=pplx-your-actual-perplexity-key-here

# Optional debug mode
DEBUG_API_CALLS=false
```

### Step 2: Add to .gitignore
Make sure `.env` is in your `.gitignore` file to keep keys secure:

```
.env
```

### Step 3: Restart Development Server
After adding the keys, restart your Expo development server:

```bash
npm start
```

## Cost Estimates

**Typical Usage:**
- **Image Recognition:** $0.02-0.05 per cigar photo
- **Information Search:** $0.005-0.01 per cigar lookup
- **Total per cigar:** ~$0.03-0.06

**Budget Mode:**
- Uses only OpenAI (no Perplexity search)
- Cost: ~$0.02-0.05 per cigar

## Testing Your Setup

1. **Check API Keys:** The app will show error messages if keys are missing
2. **Test Recognition:** Try taking a photo of a cigar
3. **Check Logs:** Enable `DEBUG_API_CALLS=true` to see API responses

## Troubleshooting

**"API Key not found" error:**
- Ensure `.env` file exists in project root
- Check key names match exactly (including `EXPO_PUBLIC_` prefix)
- Restart development server

**"Insufficient credits" error:**
- Add billing information to your OpenAI/Perplexity accounts
- Check your usage limits

**Recognition not working:**
- Verify OpenAI key has GPT-4 Vision access
- Check image quality and lighting
- Try manual entry as fallback

## Security Notes

- ✅ Keys are prefixed with `EXPO_PUBLIC_` for Expo compatibility
- ✅ Never commit `.env` file to version control
- ✅ Rotate keys periodically for security
- ✅ Monitor usage to prevent unexpected charges

## Need Help?

If you encounter issues:
1. Check the console for error messages
2. Verify API keys are active and have credits
3. Test with a simple cigar photo first
4. Use manual entry mode as a fallback



