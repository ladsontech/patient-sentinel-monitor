import { VITAL_THRESHOLDS } from './vitalThresholds.ts';

export const generateVitalsForStatus = (targetStatus: 'normal' | 'warning' | 'critical') => {
  switch (targetStatus) {
    case 'normal':
      return {
        blood_pressure: Math.floor(Math.random() * (VITAL_THRESHOLDS.BLOOD_PRESSURE.NORMAL.max - VITAL_THRESHOLDS.BLOOD_PRESSURE.NORMAL.min + 1)) + VITAL_THRESHOLDS.BLOOD_PRESSURE.NORMAL.min,
        oxygen_saturation: Math.floor(Math.random() * (VITAL_THRESHOLDS.OXYGEN_SATURATION.NORMAL.max - VITAL_THRESHOLDS.OXYGEN_SATURATION.NORMAL.min + 1)) + VITAL_THRESHOLDS.OXYGEN_SATURATION.NORMAL.min,
        heart_rate: Math.floor(Math.random() * (VITAL_THRESHOLDS.HEART_RATE.NORMAL.max - VITAL_THRESHOLDS.HEART_RATE.NORMAL.min + 1)) + VITAL_THRESHOLDS.HEART_RATE.NORMAL.min,
        respiratory_rate: Math.floor(Math.random() * (VITAL_THRESHOLDS.RESPIRATORY_RATE.NORMAL.max - VITAL_THRESHOLDS.RESPIRATORY_RATE.NORMAL.min + 1)) + VITAL_THRESHOLDS.RESPIRATORY_RATE.NORMAL.min
      };
    case 'warning':
      return {
        blood_pressure: Math.floor(Math.random() * (VITAL_THRESHOLDS.BLOOD_PRESSURE.WARNING.max - VITAL_THRESHOLDS.BLOOD_PRESSURE.WARNING.min + 1)) + VITAL_THRESHOLDS.BLOOD_PRESSURE.WARNING.min,
        oxygen_saturation: Math.floor(Math.random() * (VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.max - VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min + 1)) + VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min,
        heart_rate: Math.floor(Math.random() * (VITAL_THRESHOLDS.HEART_RATE.WARNING.max - VITAL_THRESHOLDS.HEART_RATE.WARNING.min + 1)) + VITAL_THRESHOLDS.HEART_RATE.WARNING.min,
        respiratory_rate: Math.floor(Math.random() * (VITAL_THRESHOLDS.RESPIRATORY_RATE.WARNING.max - VITAL_THRESHOLDS.RESPIRATORY_RATE.WARNING.min + 1)) + VITAL_THRESHOLDS.RESPIRATORY_RATE.WARNING.min
      };
    case 'critical':
      const criticalVital = Math.floor(Math.random() * 4);
      const warningVitals = generateVitalsForStatus('warning');
      
      switch(criticalVital) {
        case 0:
          warningVitals.blood_pressure = Math.random() < 0.5 ? 
            VITAL_THRESHOLDS.BLOOD_PRESSURE.MIN - 1 :
            VITAL_THRESHOLDS.BLOOD_PRESSURE.MAX + 1;
          break;
        case 1:
          warningVitals.oxygen_saturation = VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min - 1;
          break;
        case 2:
          warningVitals.heart_rate = Math.random() < 0.5 ?
            VITAL_THRESHOLDS.HEART_RATE.MIN - 1 :
            VITAL_THRESHOLDS.HEART_RATE.MAX + 1;
          break;
        case 3:
          warningVitals.respiratory_rate = Math.random() < 0.5 ?
            VITAL_THRESHOLDS.RESPIRATORY_RATE.MIN - 1 :
            VITAL_THRESHOLDS.RESPIRATORY_RATE.MAX + 1;
          break;
      }
      return warningVitals;
  }
};

export const generateRandomInRange = (min: number, max: number, current: number) => {
  // Generate small variations (±2) from current value, staying within min-max range
  const variation = Math.floor(Math.random() * 5) - 2;
  const newValue = current + variation;
  return Math.max(min, Math.min(max, newValue));
};