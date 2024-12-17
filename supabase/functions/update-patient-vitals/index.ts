import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Medical thresholds based on standard hospital parameters
const VITAL_THRESHOLDS = {
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

const generateVitalsForStatus = (currentVitals: any, targetStatus: 'normal' | 'warning' | 'critical') => {
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
      // For critical, we'll randomly choose one vital sign to be critical while others remain in warning
      const criticalVital = Math.floor(Math.random() * 4);
      const warningVitals = generateVitalsForStatus(currentVitals, 'warning');
      
      switch(criticalVital) {
        case 0:
          warningVitals.blood_pressure = Math.random() < 0.5 ? 
            VITAL_THRESHOLDS.BLOOD_PRESSURE.MIN - Math.floor(Math.random() * 10) :
            VITAL_THRESHOLDS.BLOOD_PRESSURE.MAX + Math.floor(Math.random() * 10);
          break;
        case 1:
          warningVitals.oxygen_saturation = VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min - Math.floor(Math.random() * 5);
          break;
        case 2:
          warningVitals.heart_rate = Math.random() < 0.5 ?
            VITAL_THRESHOLDS.HEART_RATE.MIN - Math.floor(Math.random() * 5) :
            VITAL_THRESHOLDS.HEART_RATE.MAX + Math.floor(Math.random() * 20);
          break;
        case 3:
          warningVitals.respiratory_rate = Math.random() < 0.5 ?
            VITAL_THRESHOLDS.RESPIRATORY_RATE.MIN - Math.floor(Math.random() * 3) :
            VITAL_THRESHOLDS.RESPIRATORY_RATE.MAX + Math.floor(Math.random() * 5);
          break;
      }
      return warningVitals;
  }
};

const generateRandomInRange = (min: number, max: number, current: number) => {
  const variation = Math.floor(Math.random() * 5) - 2;
  const newValue = current + variation;
  return Math.max(min, Math.min(max, newValue));
};

const generateAlert = async (patient: any, genAI: any) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `As a medical professional, generate a brief, urgent medical alert message for a patient with the following vital signs:
    - Blood Pressure: ${patient.blood_pressure} mmHg
    - Oxygen Saturation: ${patient.oxygen_saturation}%
    - Heart Rate: ${patient.heart_rate} BPM
    - Respiratory Rate: ${patient.respiratory_rate} breaths/min
    
    Consider these thresholds for critical values:
    - Blood Pressure: Critical if > 140 mmHg or < 90 mmHg
    - Oxygen Saturation: Critical if < 90%
    - Heart Rate: Critical if > 120 BPM or < 50 BPM
    - Respiratory Rate: Critical if > 30 or < 10 breaths/min
    
    Focus on the most concerning vital sign and provide a concise, professional medical alert.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

const determineStatus = (vitals: any) => {
  let status = 'normal';
  
  // Check each vital sign against thresholds
  if (
    vitals.blood_pressure >= VITAL_THRESHOLDS.BLOOD_PRESSURE.MAX ||
    vitals.blood_pressure <= VITAL_THRESHOLDS.BLOOD_PRESSURE.MIN ||
    vitals.oxygen_saturation <= VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min ||
    vitals.heart_rate >= VITAL_THRESHOLDS.HEART_RATE.MAX ||
    vitals.heart_rate <= VITAL_THRESHOLDS.HEART_RATE.MIN ||
    vitals.respiratory_rate >= VITAL_THRESHOLDS.RESPIRATORY_RATE.MAX ||
    vitals.respiratory_rate <= VITAL_THRESHOLDS.RESPIRATORY_RATE.MIN
  ) {
    status = 'critical';
  } else if (
    (vitals.blood_pressure >= VITAL_THRESHOLDS.BLOOD_PRESSURE.WARNING.min && vitals.blood_pressure < VITAL_THRESHOLDS.BLOOD_PRESSURE.WARNING.max) ||
    (vitals.oxygen_saturation >= VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.min && vitals.oxygen_saturation <= VITAL_THRESHOLDS.OXYGEN_SATURATION.WARNING.max) ||
    (vitals.heart_rate >= VITAL_THRESHOLDS.HEART_RATE.WARNING.min && vitals.heart_rate < VITAL_THRESHOLDS.HEART_RATE.WARNING.max) ||
    (vitals.respiratory_rate >= VITAL_THRESHOLDS.RESPIRATORY_RATE.WARNING.min && vitals.respiratory_rate < VITAL_THRESHOLDS.RESPIRATORY_RATE.WARNING.max)
  ) {
    status = 'warning';
  }
  
  return status;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '');

    // Fetch all patients
    const { data: patients, error: patientsError } = await supabaseClient
      .from('patients')
      .select('*');
    
    if (patientsError) throw patientsError;

    // Update each patient's vitals with realistic variations
    for (const patient of patients) {
      // Determine a random status with weighted probabilities
      const rand = Math.random();
      let targetStatus: 'normal' | 'warning' | 'critical';
      
      if (rand < 0.6) { // 60% chance of normal
        targetStatus = 'normal';
      } else if (rand < 0.85) { // 25% chance of warning
        targetStatus = 'warning';
      } else { // 15% chance of critical
        targetStatus = 'critical';
      }

      // Generate new vitals based on the target status
      const newVitals = generateVitalsForStatus(patient, targetStatus);

      // Add small random variations to make changes more natural
      Object.keys(newVitals).forEach(key => {
        newVitals[key] = generateRandomInRange(
          VITAL_THRESHOLDS[key.toUpperCase()].MIN,
          VITAL_THRESHOLDS[key.toUpperCase()].MAX,
          newVitals[key]
        );
      });

      // Determine final status based on the actual vitals
      const status = determineStatus(newVitals);

      // Generate AI alert only for critical patients
      let aiAlert = null;
      if (status === 'critical') {
        aiAlert = await generateAlert({ ...patient, ...newVitals }, genAI);
        console.log('Critical patient alert:', patient.name, aiAlert);
      }

      // Update patient vitals
      await supabaseClient
        .from('patients')
        .update({
          ...newVitals,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient.id);

      // Add to history
      await supabaseClient
        .from('patient_history')
        .insert({
          patient_id: patient.id,
          ...newVitals,
          timestamp: new Date().toISOString()
        });
    }

    return new Response(
      JSON.stringify({ message: 'Vitals updated successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});