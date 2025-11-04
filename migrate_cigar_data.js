// Migration script to populate the cigar database from CSV data
// Run this with: node migrate_cigar_data.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

if (!supabaseKey || supabaseKey.includes('anon')) {
  console.error('❌ Service Role Key Required!');
  console.error('📝 Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  console.error(
    '🔗 Get it from: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/settings/api',
  );
  process.exit(1);
}

console.log('🔗 Connecting to Supabase with Service Role Key...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Function to extract price from string like "$13.30"
function extractPrice(priceString) {
  if (!priceString) return null;
  const match = priceString.match(/\$?(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

// Function to determine year and rank from URL
function extractYearAndRank(url) {
  if (!url) return { year: null, rank: null };

  // Look for year in URL
  const yearMatch = url.match(/(2022|2023|2024)/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // For rank, we'll need to determine this from the data order
  // This is a simplified approach - you might want to manually assign ranks
  return { year, rank: null };
}

// Function to extract flavor tags from description
function extractFlavorTags(description) {
  if (!description) return [];

  const commonFlavors = [
    'chocolate',
    'coffee',
    'leather',
    'cedar',
    'earth',
    'spice',
    'pepper',
    'nuts',
    'cream',
    'vanilla',
    'caramel',
    'honey',
    'sweetness',
    'tobacco',
    'wood',
    'smoke',
    'cocoa',
    'espresso',
    'dark chocolate',
    'roasted',
    'nutty',
    'earthy',
    'spicy',
    'sweet',
    'creamy',
    'woody',
    'smoky',
    'toasty',
    'rich',
    'smooth',
    'bold',
    'complex',
    'balanced',
    'elegant',
  ];

  const foundFlavors = [];
  const lowerDesc = description.toLowerCase();

  commonFlavors.forEach((flavor) => {
    if (lowerDesc.includes(flavor)) {
      foundFlavors.push(flavor);
    }
  });

  return foundFlavors;
}

async function migrateCigarData() {
  try {
    console.log('🚀 Starting cigar data migration...');

    // Read CSV file
    const csvPath = path.join(
      __dirname,
      'assets',
      'complete_top25_cigars_2024_2023_2022 - complete_top25_cigars_2024_2023_2022.csv',
    );
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');

    // Skip header row
    const dataLines = lines.slice(1).filter((line) => line.trim());

    console.log(`📊 Found ${dataLines.length} cigars to migrate`);

    let rankCounter = { 2022: 1, 2023: 1, 2024: 1 };
    let successCount = 0;
    let errorCount = 0;

    for (const line of dataLines) {
      try {
        const columns = parseCSVLine(line);

        if (columns.length < 6) {
          console.log(`⚠️  Skipping incomplete row: ${columns[0]}`);
          continue;
        }

        const [
          brandName,
          cigarName,
          rating,
          price,
          description,
          strength,
          detailUrl,
          ...extraColumns
        ] = columns;

        // Extract year and rank
        const { year, rank } = extractYearAndRank(detailUrl);
        const actualRank = year ? rankCounter[year]++ : null;

        // Parse rating and price
        const ratingNum = parseInt(rating) || 0;
        const priceNum = extractPrice(price);

        // Map strength values to match existing table constraints
        const strengthMapping = {
          Mild: 'Mild',
          Medium: 'Medium',
          'Medium-Full': 'Full', // Map to Full since Strong is not allowed
          Full: 'Full',
        };
        const normalizedStrength = strengthMapping[strength] || 'Medium';

        // Create cigar record (matching existing table structure)
        const cigarData = {
          brand: brandName?.trim(),
          line: cigarName?.trim(),
          name: `${brandName?.trim()} ${cigarName?.trim()}`,
          size: '', // Not available in CSV
          wrapper: '', // Not available in CSV
          filler: '', // Not available in CSV
          binder: '', // Not available in CSV
          strength: normalizedStrength,
          flavor_profile: extractFlavorTags(description), // Convert to array
          tobacco_origins: [], // Not available in CSV
          smoking_experience: {
            first: '',
            second: '',
            final: '',
          },
          image_url: null, // Will be set by image mapping script
          recognition_confidence: ratingNum / 100,
          detail_url: detailUrl?.trim() || null, // Include the URL from CSV
        };

        // Check if cigar already exists
        const { data: existingCigar } = await supabase
          .from('cigars')
          .select('id')
          .eq('brand', cigarData.brand)
          .eq('name', cigarData.name)
          .single();

        if (existingCigar) {
          console.log(`⚠️  Skipping duplicate: ${brandName} ${cigarName}`);
          continue;
        }

        // Insert cigar
        const { data: cigar, error: cigarError } = await supabase
          .from('cigars')
          .insert([cigarData])
          .select()
          .single();

        if (cigarError) {
          console.error(`❌ Error inserting cigar ${brandName} ${cigarName}:`, cigarError);
          errorCount++;
          continue;
        }

        // Flavor profiles are already included in the main cigar record as an array

        successCount++;
        console.log(
          `✅ Migrated: ${brandName} ${cigarName} (Rating: ${rating}, Year: ${year || 'Unknown'})`,
        );
      } catch (error) {
        console.error(`❌ Error processing line:`, error);
        errorCount++;
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${successCount} cigars`);
    console.log(`❌ Errors: ${errorCount} cigars`);
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateCigarData();
}

module.exports = { migrateCigarData };
