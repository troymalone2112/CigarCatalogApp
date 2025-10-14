import { Cigar } from '../types';

/**
 * Service for managing cigar images
 * Handles image loading, fallbacks, and path resolution
 */
export class CigarImageService {
  /**
   * Get the image source for a cigar
   * @param cigar - The cigar object
   * @returns Image source object for React Native Image component
   */
  static getCigarImageSource(cigar: Cigar): any {
    if (!cigar.image_url) {
      // Return placeholder image if no image is available
      return require('../../assets/cigar-placeholder.jpg');
    }

    try {
      // Try to load the specific cigar image
      const imageName = cigar.image_url.replace(/\.(jpg|jpeg|png)$/i, '');
      return require(`../../assets/Cigar_Images/${cigar.image_url}`);
    } catch (error) {
      console.warn(`Failed to load image for ${cigar.brand_name} ${cigar.cigar_name}:`, error);
      // Fallback to placeholder
      return require('../../assets/cigar-placeholder.jpg');
    }
  }

  /**
   * Get image source with fallback handling
   * @param cigar - The cigar object
   * @param fallbackImage - Optional custom fallback image
   * @returns Image source object
   */
  static getCigarImageSourceWithFallback(cigar: Cigar, fallbackImage?: any): any {
    if (!cigar.image_url) {
      return fallbackImage || require('../../assets/cigar-placeholder.jpg');
    }

    try {
      return require(`../../assets/Cigar_Images/${cigar.image_url}`);
    } catch (error) {
      console.warn(`Image not found for ${cigar.brand_name} ${cigar.cigar_name}, using fallback`);
      return fallbackImage || require('../../assets/cigar-placeholder.jpg');
    }
  }

  /**
   * Check if a cigar has an image available
   * @param cigar - The cigar object
   * @returns Boolean indicating if image is available
   */
  static hasImage(cigar: Cigar): boolean {
    return !!cigar.image_url;
  }

  /**
   * Get all available image filenames for debugging
   * @returns Array of image filenames
   */
  static getAvailableImages(): string[] {
    // This would typically be populated from your assets or database
    return [
      '01_my_father_judge_grand_robusto.jpeg',
      '02_montecristo_1935_anniversary_nicaragua_espeso.jpeg',
      '05_partagas_linea_maestra_maestro.jpeg',
      '06_oliva_serie_v_melanio_maduro_torpedo.jpg',
      '08_cohiba_maduro_5_magicos.jpeg',
      '10_brick_house_churchill.jpeg',
      '11_la_aroma_de_cuba_pasion_box_pressed_torpedo.jpeg',
      '14_casa_magna_colorado_xv_anniversary.jpeg',
      '15_romeo_y_julieta_wide_churchhill.jpg',
      '16_perdomo_30th_anniversary_sun_grown_epicure.jpeg',
      '19_herrera_esteli_norteno_lonsdale.jpeg',
      '23_warped_corto_x52.jpeg',
      '25_tatuaje_reserva_a_uno.jpeg',
      '2023_01_fuente_fuente_opusx_reserva_dchateau.jpeg',
      '2023_02_padron_serie_1926_no_48_maduro.jpeg',
      '2023_05_ep_carrillo_allegiance_confidant.jpeg',
      '2023_06_partagas_serie_p_no_2.jpeg',
      '2023_07_blackened_cigars_m81_drew_estate_corona.jpeg',
      '2023_08_alec_bradley_prensado_torpedo.jpeg',
      '2023_09_la_aroma_de_cuba_mi_amor_belicoso.jpeg',
      '2023_10_el_pulpo_belicoso_grande.jpeg',
      '601_La_Bomba_Warhead_X.jpg',
      'Rocky_Patel_Conviction_Toro.jpeg'
    ];
  }

  /**
   * Preload images for better performance
   * Call this during app initialization
   */
  static preloadImages(): void {
    const images = this.getAvailableImages();
    images.forEach(imageName => {
      try {
        require(`../../assets/Cigar_Images/${imageName}`);
      } catch (error) {
        console.warn(`Failed to preload image: ${imageName}`);
      }
    });
  }
}
