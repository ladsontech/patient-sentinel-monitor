import { VITAL_THRESHOLDS } from './vitalThresholds.ts';

export const determineStatus = (vitals: any) => {
  if (
    vitals.blood_pressure >= VITAL_THRESHOLDS.BLOOD_PRESSURE.MAX ||
    vitals.blood_pressure <= VITAL_THRESHOLDS.BLOOD_PRESSURE.MIN ||
    vitals.oxygen_saturation < VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min ||
    vitals.heart_rate >= VITAL_THRESHOLDS.HEART_RATE.MAX ||
    vitals.heart_rate <= VITAL_THRESHOLDS.HEART_RATE.MIN ||
    vitals.respiratory_rate >= VITAL_THRESHOLDS.RESPIRATORY_RATE.MAX ||
    vitals.respiratory_rate <= VITAL_THRESHOLDS.RESPIRATORY_RATE.MIN
  ) {
    return 'critical';
  } 
  
  if (
    (vitals.blood_pressure >= VITAL_THRESHOLDS.BLOOD_PRESSURE.WARNING.min && vitals.blood_pressure < VITAL_THRESHOLDS.BLOOD_PRESSURE.WARNING.max) ||
    (vitals.oxygen_saturation >= VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min && vitals.oxygen_saturation < VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.max) ||
    (vitals.heart_rate >= VITAL_THRESHOLDS.HEART_RATE.WARNING.min && vitals.heart_rate < VITAL_THRESHOLDS.HEART_RATE.WARNING.max) ||
    (vitals.respiratory_rate >= VITAL_THRESHOLDS.RESPIRATORY_RATE.WARNING.min && vitals.respiratory_rate < VITAL_THRESHOLDS.RESPIRATORY_RATE.WARNING.max)
  ) {
    return 'warning';
  }
  
  return 'normal';
};