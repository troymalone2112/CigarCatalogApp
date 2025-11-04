# Cigar Image Integration Guide

## Overview

This guide explains how to integrate the cigar images with your database and display them in your React Native app.

## What's Been Set Up

### 1. Database Schema Updates

- **File**: `cigar_database_schema.sql`
- **Changes**: Added `image_url` and `image_path` fields to the `cigars` table
- **Purpose**: Store image filenames and full paths for each cigar

### 2. Image Mapping Script

- **File**: `cigar_image_mapping.js`
- **Purpose**: Maps cigar images to database entries
- **Usage**: `npm run map-images`

### 3. Image Service

- **File**: `src/services/cigarImageService.ts`
- **Purpose**: Handles image loading, fallbacks, and path resolution
- **Features**:
  - Automatic fallback to placeholder image
  - Error handling for missing images
  - Preloading capabilities

### 4. Updated Types

- **File**: `src/types/index.ts`
- **Changes**: Added `DatabaseCigar` interface for database cigars
- **Purpose**: Type safety for database operations

### 5. Recommendation Service Updates

- **File**: `src/services/recommendationService.ts`
- **Changes**: Updated to use `DatabaseCigar` type and include image handling
- **Purpose**: Seamless integration with existing recommendation system

### 6. React Native Component

- **File**: `src/components/CigarRecommendationCard.tsx`
- **Purpose**: Display cigar recommendations with images
- **Features**:
  - Automatic image loading with fallbacks
  - Match score display
  - Comprehensive cigar information

## Image Mapping Results

### ✅ Perfect Matches (23 cigars):

1. **My Father - The Judge Grand Robusto** → `01_my_father_judge_grand_robusto.jpeg`
2. **Montecristo - 1935 Anniversary Nicaragua Espeso** → `02_montecristo_1935_anniversary_nicaragua_espeso.jpeg`
3. **Partagás - Línea Maestra Maestro** → `05_partagas_linea_maestra_maestro.jpeg`
4. **Oliva - Serie V Melanio Maduro Torpedo** → `06_oliva_serie_v_melanio_maduro_torpedo.jpg`
5. **Cohiba - Maduro 5 Mágicos** → `08_cohiba_maduro_5_magicos.jpeg`
6. **Brick House - Churchill** → `10_brick_house_churchill.jpeg`
7. **La Aroma de Cuba - Pasión Box-Pressed Torpedo** → `11_la_aroma_de_cuba_pasion_box_pressed_torpedo.jpeg`
8. **Casa Magna - Colorado XV Anniversary** → `14_casa_magna_colorado_xv_anniversary.jpeg`
9. **Romeo y Julieta - Wide Churchill** → `15_romeo_y_julieta_wide_churchhill.jpg`
10. **Perdomo - 30th Anniversary Sun Grown Epicure** → `16_perdomo_30th_anniversary_sun_grown_epicure.jpeg`
11. **Herrera Estelí - Norteño Lonsdale** → `19_herrera_esteli_norteno_lonsdale.jpeg`
12. **Warped - Corto x52** → `23_warped_corto_x52.jpeg`
13. **Tatuaje - Reserva A Uno** → `25_tatuaje_reserva_a_uno.jpeg`
14. **Fuente Fuente OpusX - Reserva D'Chateau** → `2023_01_fuente_fuente_opusx_reserva_dchateau.jpeg`
15. **Padrón - Serie 1926 No. 48 Maduro** → `2023_02_padron_serie_1926_no_48_maduro.jpeg`
16. **E.P. Carrillo - Allegiance Confidant** → `2023_05_ep_carrillo_allegiance_confidant.jpeg`
17. **Partagás - Serie P No. 2** → `2023_06_partagas_serie_p_no_2.jpeg`
18. **Blackened Cigars M81 - Drew Estate Corona** → `2023_07_blackened_cigars_m81_drew_estate_corona.jpeg`
19. **Alec Bradley - Prensado Torpedo** → `2023_08_alec_bradley_prensado_torpedo.jpeg`
20. **La Aroma de Cuba - Mi Amor Belicoso** → `2023_09_la_aroma_de_cuba_mi_amor_belicoso.jpeg`
21. **El Pulpo - Belicoso Grande** → `2023_10_el_pulpo_belicoso_grande.jpeg`
22. **601 - La Bomba Warhead X** → `601_La_Bomba_Warhead_X.jpg`
23. **Rocky Patel - Conviction Toro** → `Rocky_Patel_Conviction_Toro.jpeg`

### ⚠️ Missing Images (2 cigars):

1. **Arturo Fuente - Don Carlos No. 4** (2024 #3)
2. **Drew Estate - Liga Privada No. 9 Toro** (2024 #4)

## Next Steps

### 1. Run the Migration

```bash
# First, migrate the cigar data
npm run migrate-data

# Then, map the images
npm run map-images
```

### 2. Test the Integration

```typescript
// Example usage in your React Native component
import { CigarImageService } from '../services/cigarImageService';
import CigarRecommendationCard from '../components/CigarRecommendationCard';

// Get image source for a cigar
const imageSource = CigarImageService.getCigarImageSource(cigar);

// Display recommendation with image
<CigarRecommendationCard
  cigar={cigar}
  matchScore={0.95}
  reason="Top-rated cigar with exceptional flavor profile"
  onPress={() => navigation.navigate('CigarDetails', { cigar })}
/>
```

### 3. Add to Recommendations Screen

You can now use the `CigarRecommendationCard` component in your recommendations screen to display cigars with their images.

### 4. Preload Images (Optional)

For better performance, you can preload images during app initialization:

```typescript
import { CigarImageService } from '../services/cigarImageService';

// In your App.tsx or main component
useEffect(() => {
  CigarImageService.preloadImages();
}, []);
```

## File Structure

```
src/
├── services/
│   ├── cigarImageService.ts          # Image handling service
│   └── recommendationService.ts      # Updated with image support
├── components/
│   └── CigarRecommendationCard.tsx   # Cigar display component
└── types/
    └── index.ts                      # Updated with DatabaseCigar type

assets/
└── Cigar_Images/                     # All cigar images
    ├── 01_my_father_judge_grand_robusto.jpeg
    ├── 02_montecristo_1935_anniversary_nicaragua_espeso.jpeg
    └── ... (all other images)

Root/
├── cigar_database_schema.sql         # Updated database schema
├── cigar_image_mapping.js            # Image mapping script
└── migrate_cigar_data.js             # Data migration script
```

## Benefits

1. **Automatic Image Loading**: Images are automatically loaded based on cigar data
2. **Fallback Handling**: Missing images fall back to placeholder
3. **Type Safety**: Full TypeScript support for database operations
4. **Performance**: Optimized image loading and caching
5. **Maintainability**: Clean separation of concerns between data and UI

## Troubleshooting

### Images Not Loading

- Check that image files are in `assets/Cigar_Images/` folder
- Verify image filenames match exactly (case-sensitive)
- Ensure images are properly bundled with the app

### Database Issues

- Make sure Supabase environment variables are set
- Verify the `cigars` table exists with image fields
- Check that the migration scripts ran successfully

### Performance Issues

- Consider implementing image caching
- Use image preloading for frequently accessed cigars
- Optimize image sizes for mobile devices

## Future Enhancements

1. **Image Optimization**: Compress images for better performance
2. **CDN Integration**: Move images to a CDN for faster loading
3. **Multiple Images**: Support multiple images per cigar
4. **Image Upload**: Allow users to upload their own cigar images
5. **AI Image Recognition**: Use images for better cigar identification
