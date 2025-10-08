const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

if (!supabaseKey || supabaseKey.includes('anon')) {
  console.error('❌ Service Role Key Required!');
  console.error('📝 Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  console.error('🔗 Get it from: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/settings/api');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase with Service Role Key...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Image mapping based on the files in Cigar_Images folder
const imageMapping = {
  // 2024 Top 25 Cigars
  'My Father': {
    'The Judge Grand Robusto': '01_my_father_judge_grand_robusto.jpeg'
  },
  'Montecristo': {
    '1935 Anniversary Nicaragua Espeso': '02_montecristo_1935_anniversary_nicaragua_espeso.jpeg'
  },
  'Arturo Fuente': {
    'Don Carlos No. 4': null // No image available
  },
  'Drew Estate': {
    'Liga Privada No. 9 Toro': null // No image available
  },
  'Partagás': {
    'Línea Maestra Maestro': '05_partagas_linea_maestra_maestro.jpeg'
  },
  'Oliva': {
    'Serie V Melanio Maduro Torpedo': '06_oliva_serie_v_melanio_maduro_torpedo.jpg'
  },
  'Cohiba': {
    'Maduro 5 Mágicos': '08_cohiba_maduro_5_magicos.jpeg'
  },
  'Brick House': {
    'Churchill': '10_brick_house_churchill.jpeg'
  },
  'La Aroma de Cuba': {
    'Pasión Box-Pressed Torpedo': '11_la_aroma_de_cuba_pasion_box_pressed_torpedo.jpeg'
  },
  'Casa Magna': {
    'Colorado XV Anniversary': '14_casa_magna_colorado_xv_anniversary.jpeg'
  },
  'Romeo y Julieta': {
    'Wide Churchill': '15_romeo_y_julieta_wide_churchill.png'
  },
  'Perdomo': {
    '30th Anniversary Sun Grown Epicure': '16_perdomo_30th_anniversary_sun_grown_epicure.jpeg'
  },
  'Herrera Estelí': {
    'Norteño Lonsdale': '19_herrera_esteli_norteno_lonsdale.jpeg'
  },
  'Warped': {
    'Corto x52': '23_warped_corto_x52.jpeg'
  },
  'Tatuaje': {
    'Reserva A Uno': '25_tatuaje_reserva_a_uno.jpeg'
  },
  
  // 2023 Top 25 Cigars
  'Fuente Fuente OpusX': {
    'Reserva D\'Chateau': '2023_01_fuente_fuente_opusx_reserva_dchateau.jpeg'
  },
  'Padrón': {
    'Serie 1926 No. 48 Maduro': '2023_02_padron_serie_1926_no_48_maduro.jpeg'
  },
  'E.P. Carrillo': {
    'Allegiance Confidant': '2023_05_ep_carrillo_allegiance_confidant.jpeg'
  },
  'Partagás': {
    'Serie P No. 2': '2023_06_partagas_serie_p_no_2.jpeg'
  },
  'Blackened Cigars M81': {
    'Drew Estate Corona': '2023_07_blackened_cigars_m81_drew_estate_corona.jpeg'
  },
  'Alec Bradley': {
    'Prensado Torpedo': '2023_08_alec_bradley_prensado_torpedo.jpeg'
  },
  'La Aroma de Cuba': {
    'Mi Amor Belicoso': '2023_09_la_aroma_de_cuba_mi_amor_belicoso.jpeg'
  },
  'El Pulpo': {
    'Belicoso Grande': '2023_10_el_pulpo_belicoso_grande.jpeg'
  },
  
  // 2022 Top 25 Cigars
  '601': {
    'La Bomba Warhead X': '601_La_Bomba_Warhead_X.jpg'
  },
  'Rocky Patel': {
    'Conviction Toro': 'Rocky_Patel_Conviction_Toro.jpeg'
  }
};

async function updateCigarImages() {
  try {
    console.log('🔄 Starting cigar image mapping update...');
    
    // Get all cigars from the database
    const { data: cigars, error: fetchError } = await supabase
      .from('cigars')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching cigars:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${cigars.length} cigars in database`);
    
    let updatedCount = 0;
    let missingImagesCount = 0;
    
    // Update each cigar with its corresponding image
    for (const cigar of cigars) {
      const brandName = cigar.brand;
      const cigarName = cigar.line;
      
      // Find matching image
      let imageFileName = null;
      
      if (imageMapping[brandName] && imageMapping[brandName][cigarName]) {
        imageFileName = imageMapping[brandName][cigarName];
      }
      
      // Update the cigar with image information
      const { error: updateError } = await supabase
        .from('cigars')
        .update({ 
          image_url: imageFileName
        })
        .eq('id', cigar.id);
      
      if (updateError) {
        console.error(`❌ Error updating cigar ${brandName} ${cigarName}:`, updateError);
      } else {
        if (imageFileName) {
          console.log(`✅ Updated ${brandName} ${cigarName} with image: ${imageFileName}`);
          updatedCount++;
        } else {
          console.log(`⚠️  No image found for ${brandName} ${cigarName}`);
          missingImagesCount++;
        }
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`✅ Cigars with images: ${updatedCount}`);
    console.log(`⚠️  Cigars without images: ${missingImagesCount}`);
    console.log(`📊 Total cigars processed: ${cigars.length}`);
    
  } catch (error) {
    console.error('❌ Error in updateCigarImages:', error);
  }
}

// Run the update
updateCigarImages();
