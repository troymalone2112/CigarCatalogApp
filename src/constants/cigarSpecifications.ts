// Cigar specification constants for dropdowns and validation

export const AGING_PREFERENCE_OPTIONS = [
  { value: 0, label: 'No aging preference' },
  { value: 1, label: '1 month' },
  { value: 2, label: '2 months' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 9, label: '9 months' },
  { value: 12, label: '12 months' },
  { value: 15, label: '15 months' },
  { value: 18, label: '18 months' },
  { value: 21, label: '21 months' },
  { value: 24, label: '24 months' },
];

export const LENGTH_OPTIONS = [
  { value: 3.5, label: 'Less than 4 inches' },
  { value: 4.0, label: '4.0 inches' },
  { value: 4.5, label: '4.5 inches' },
  { value: 5.0, label: '5.0 inches' },
  { value: 5.5, label: '5.5 inches' },
  { value: 6.0, label: '6.0 inches' },
  { value: 6.5, label: '6.5 inches' },
  { value: 7.0, label: '7.0 inches' },
  { value: 7.5, label: '7.5 inches' },
  { value: 8.0, label: '8.0 inches' },
  { value: 8.5, label: '8.5 inches' },
  { value: 9.0, label: '9.0 inches' },
  { value: 9.5, label: 'More than 9 inches' },
];

export const RING_GAUGE_OPTIONS = [
  { value: 30, label: 'Less than 32' },
  { value: 32, label: '32' },
  { value: 34, label: '34' },
  { value: 36, label: '36' },
  { value: 38, label: '38' },
  { value: 40, label: '40' },
  { value: 42, label: '42' },
  { value: 44, label: '44' },
  { value: 46, label: '46' },
  { value: 48, label: '48' },
  { value: 50, label: '50' },
  { value: 52, label: '52' },
  { value: 54, label: '54' },
  { value: 56, label: '56' },
  { value: 58, label: '58' },
  { value: 60, label: '60' },
  { value: 62, label: 'More than 60' },
];

export const VITOLA_OPTIONS = [
  { value: 'Petit Corona', label: 'Petit Corona' },
  { value: 'Corona', label: 'Corona' },
  { value: 'Robusto', label: 'Robusto' },
  { value: 'Toro', label: 'Toro' },
  { value: 'Torpedo', label: 'Torpedo' },
  { value: 'Churchill', label: 'Churchill' },
  { value: 'Double Corona', label: 'Double Corona' },
  { value: 'Panatela', label: 'Panatela' },
  { value: 'Lancero', label: 'Lancero' },
  { value: 'Pyramid', label: 'Pyramid' },
  { value: 'Perfecto', label: 'Perfecto' },
  { value: 'Belicoso', label: 'Belicoso' },
  { value: 'Figurado', label: 'Figurado' },
  { value: 'Culebras', label: 'Culebras (braided)' },
  { value: 'Presidente', label: 'Presidente' },
  { value: 'Other', label: 'Other / Custom' },
];

// Helper functions
export const getAgingLabel = (months: number): string => {
  const option = AGING_PREFERENCE_OPTIONS.find(opt => opt.value === months);
  return option ? option.label : 'Unknown';
};

export const getLengthLabel = (inches: number): string => {
  const option = LENGTH_OPTIONS.find(opt => opt.value === inches);
  return option ? option.label : 'Unknown';
};

export const getRingGaugeLabel = (gauge: number): string => {
  const option = RING_GAUGE_OPTIONS.find(opt => opt.value === gauge);
  return option ? option.label : 'Unknown';
};

export const getVitolaLabel = (vitola: string): string => {
  const option = VITOLA_OPTIONS.find(opt => opt.value === vitola);
  return option ? option.label : vitola;
};






