#!/bin/bash

# Setup script for Cigar Catalog App environment variables
# This script helps you configure your API keys securely

echo "🔧 Cigar Catalog App - Environment Setup"
echo "========================================"
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file
echo "📝 Creating .env file..."

cat > .env << EOF
# Environment Variables for Cigar Catalog App
# Generated on $(date)

# OpenAI API Key (for cigar recognition)
# Get from: https://platform.openai.com/api-keys
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-key-here

# Perplexity API Key (for additional AI features)  
# Get from: https://www.perplexity.ai/settings/api
EXPO_PUBLIC_PERPLEXITY_API_KEY=pplx-your-perplexity-key-here

# Stripe API Key (for RevenueCat web billing)
# Get from: https://dashboard.stripe.com/apikeys
EXPO_PUBLIC_STRIPE_API_KEY=sk_live_your-stripe-key-here

# Supabase Configuration (these are safe to expose - they're public keys)
# Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ-your-supabase-anon-key-here

# Debug Settings
DEBUG_API_CALLS=false
EOF

echo "✅ .env file created!"
echo ""
echo "🔑 Next Steps:"
echo "1. Edit the .env file and replace the placeholder values with your actual API keys"
echo "2. Make sure .env is in your .gitignore file (it should be already)"
echo "3. For EAS builds, set these as secrets:"
echo "   eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value 'your-key'"
echo "   eas secret:create --scope project --name EXPO_PUBLIC_PERPLEXITY_API_KEY --value 'your-key'"
echo "   eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_API_KEY --value 'your-key'"
echo ""
echo "🔒 Security Notes:"
echo "- Never commit .env files to git"
echo "- Use EAS secrets for production builds"
echo "- Supabase anon keys are safe to expose (they're public keys)"
echo ""

# Check if .gitignore contains .env
if grep -q "\.env" .gitignore; then
    echo "✅ .env is already in .gitignore"
else
    echo "⚠️  Adding .env to .gitignore..."
    echo "" >> .gitignore
    echo "# Environment variables" >> .gitignore
    echo ".env" >> .gitignore
    echo ".env.local" >> .gitignore
    echo ".env.*.local" >> .gitignore
    echo "✅ Added .env to .gitignore"
fi

echo ""
echo "🎉 Setup complete! Edit .env with your actual API keys."
