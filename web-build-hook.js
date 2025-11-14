/**
 * Post-build hook to ensure PWA manifest and meta tags are correct
 * This runs after Expo builds the web output
 */

const fs = require('fs');
const path = require('path');

const webBuildDir = path.join(__dirname, 'web-build');

// Ensure web-build directory exists
if (!fs.existsSync(webBuildDir)) {
  console.log('⚠️ web-build directory not found. Run "npm run build:web" first.');
  process.exit(0);
}

// Find index.html
const indexPath = path.join(webBuildDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.log('⚠️ index.html not found in web-build');
  process.exit(0);
}

console.log('🔧 Enhancing PWA manifest and meta tags...');

// Read index.html
let html = fs.readFileSync(indexPath, 'utf8');

// Ensure apple-mobile-web-app-capable meta tag exists
if (!html.includes('apple-mobile-web-app-capable')) {
  const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
  if (viewportMatch) {
    const appleMeta = '  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <meta name="apple-mobile-web-app-title" content="Cigar Catalog">\n';
    html = html.replace(viewportMatch[0], viewportMatch[0] + '\n' + appleMeta);
    console.log('✅ Added Apple PWA meta tags');
  }
}

// Ensure manifest link exists
if (!html.includes('manifest.json') && !html.includes('manifest.webmanifest')) {
  // Find the head tag
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const manifestLink = '  <link rel="manifest" href="/manifest.json">\n';
    html = html.replace(headMatch[0], headMatch[0] + '\n' + manifestLink);
    console.log('✅ Added manifest link');
  }
}

// Ensure apple-touch-icon link exists (multiple sizes for iOS)
if (!html.includes('apple-touch-icon')) {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const appleIcons = '  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icon.png">\n  <link rel="apple-touch-icon" sizes="192x192" href="/assets/icon.png">\n  <link rel="apple-touch-icon" sizes="512x512" href="/assets/icon.png">\n';
    html = html.replace(headMatch[0], headMatch[0] + '\n' + appleIcons);
    console.log('✅ Added apple-touch-icon links');
  }
}

// Ensure theme-color meta tag exists
if (!html.includes('theme-color')) {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const themeColor = '  <meta name="theme-color" content="#DC851F">\n';
    html = html.replace(headMatch[0], headMatch[0] + '\n' + themeColor);
    console.log('✅ Added theme-color meta tag');
  }
}

// Write back
fs.writeFileSync(indexPath, html, 'utf8');

// Check if manifest.json exists, create if not
const manifestPath = path.join(webBuildDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  const manifest = {
    name: 'Cigar Catalog',
    short_name: 'CigarCatalog',
    description: 'Cigar Catalog Progressive Web App',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#DC851F',
    orientation: 'portrait',
    icons: [
      {
        src: '/assets/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/assets/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✅ Created manifest.json');
}

console.log('✅ PWA enhancements complete!');

