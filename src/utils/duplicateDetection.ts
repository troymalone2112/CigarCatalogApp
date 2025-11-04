import { Cigar, InventoryItem } from '../types';

/**
 * Checks if a cigar already exists in the inventory
 * Matches by brand, line, and name (case-insensitive)
 */
export function findDuplicateCigar(cigar: Cigar, inventory: InventoryItem[]): InventoryItem | null {
  const normalizedBrand = cigar.brand.toLowerCase().trim();
  const normalizedLine = (cigar.line || '').toLowerCase().trim();
  const normalizedName = (cigar.name || '').toLowerCase().trim();

  return (
    inventory.find((item) => {
      const itemBrand = item.cigar.brand.toLowerCase().trim();
      const itemLine = (item.cigar.line || '').toLowerCase().trim();
      const itemName = (item.cigar.name || '').toLowerCase().trim();

      // Match by brand first
      if (itemBrand !== normalizedBrand) {
        return false;
      }

      // If both have lines, they must match
      if (normalizedLine && itemLine) {
        if (normalizedLine !== itemLine) {
          return false;
        }
      }

      // If both have names, they must match
      if (normalizedName && itemName) {
        if (normalizedName !== itemName) {
          return false;
        }
      }

      // If one has a name and the other doesn't, but they have the same line, consider it a match
      if ((normalizedName && !itemName) || (!normalizedName && itemName)) {
        // If they have the same line, it's likely the same cigar
        if (normalizedLine && itemLine && normalizedLine === itemLine) {
          return true;
        }
        return false;
      }

      return true;
    }) || null
  );
}

/**
 * Creates a user-friendly display name for a cigar
 */
export function getCigarDisplayName(cigar: Cigar): string {
  const parts = [cigar.brand];
  if (cigar.line) {
    parts.push(cigar.line);
  }
  if (cigar.name && cigar.name !== 'Unknown Name') {
    parts.push(cigar.name);
  }
  return parts.join(' ');
}
