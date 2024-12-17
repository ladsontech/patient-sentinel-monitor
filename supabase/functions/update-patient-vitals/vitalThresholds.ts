export const VITAL_THRESHOLDS = {
  BLOOD_PRESSURE: {
    MIN: 90,
    MAX: 140,
    NORMAL: { min: 90, max: 120 },
    WARNING: { min: 121, max: 139 }
  },
  OXYGEN_SATURATION: {
    MIN: 85,
    MAX: 100,
    NORMAL: { min: 95, max: 100 },
    WARNING: { min: 90, max: 94 }
  },
  HEART_RATE: {
    MIN: 50,
    MAX: 140,
    NORMAL: { min: 60, max: 100 },
    WARNING: { min: 101, max: 120 }
  },
  RESPIRATORY_RATE: {
    MIN: 10,
    MAX: 35,
    NORMAL: { min: 12, max: 20 },
    WARNING: { min: 21, max: 30 }
  }
};