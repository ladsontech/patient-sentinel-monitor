import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ALERT_COOLDOWN = 10000; // 10 seconds cooldown between alerts
const CRITICAL_STATE_DURATION = 10000; // 10 seconds in critical state
const criticalStateTimers = new Map<string, number>(); // Track when patients entered critical state

// Define normal ranges for vital signs
const VITAL_RANGES = {
  bloodPressure: { min: 90, max: 140, criticalLow: 85, criticalHigh: 160 },
  oxygenSaturation: { min: 95, max: 100, criticalLow: 90 },
  heartRate: { min: 60, max: 100, criticalLow: 50, criticalHigh: 120 },
  respiratoryRate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 25 }
};

// Helper function to generate random variation within a range
const generateVariation = (current: number, minChange: number, maxChange: number, min: number, max: number) => {
  const change = Math.random() * (maxChange - minChange) + minChange;
  const direction = Math.random() > 0.5 ? 1 : -1;
  return Math.min(max, Math.max(min, current + (change * direction)));
};

const generateAlert = async (patient: any, genAI: any) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = `Generate a brief, urgent medical alert message for a patient with the following vital signs:
    - Blood Pressure: ${patient.blood_pressure}
    - Oxygen Saturation: ${patient.oxygen_saturation}%
    - Heart Rate: ${patient.heart_rate}
    - Respiratory Rate: ${patient.respiratory_rate}
    Keep it concise and professional.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating alert:', error);
    return `Alert: Patient ${patient.name} in Room ${patient.room} has entered critical condition. Immediate attention required.`;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Fetch all patients
    const { data: patients, error: fetchError } = await supabase
      .from('patients')
      .select('*');

    if (fetchError) {
      console.error('Error fetching patients:', fetchError);
      throw fetchError;
    }

    if (!patients || patients.length === 0) {
      console.warn('No patients found in database');
      return new Response(
        JSON.stringify({ message: 'No patients found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing ${patients.length} patients`);

    // Update each patient's vitals with realistic variations
    for (const patient of patients) {
      const newVitals = {
        blood_pressure: generateVariation(patient.blood_pressure, 1, 5, 80, 180),
        oxygen_saturation: generateVariation(patient.oxygen_saturation, 0.1, 1, 85, 100),
        heart_rate: generateVariation(patient.heart_rate, 1, 3, 40, 140),
        respiratory_rate: generateVariation(patient.respiratory_rate, 0.5, 2, 8, 30),
        timestamp: new Date().toISOString()
      };

      // Determine patient status based on vital signs
      let status = 'normal';
      const now = Date.now();

      if (
        newVitals.blood_pressure <= VITAL_RANGES.bloodPressure.criticalLow ||
        newVitals.blood_pressure >= VITAL_RANGES.bloodPressure.criticalHigh ||
        newVitals.oxygen_saturation <= VITAL_RANGES.oxygenSaturation.criticalLow ||
        newVitals.heart_rate <= VITAL_RANGES.heartRate.criticalLow ||
        newVitals.heart_rate >= VITAL_RANGES.heartRate.criticalHigh ||
        newVitals.respiratory_rate <= VITAL_RANGES.respiratoryRate.criticalLow ||
        newVitals.respiratory_rate >= VITAL_RANGES.respiratoryRate.criticalHigh
      ) {
        if (!criticalStateTimers.has(patient.id)) {
          criticalStateTimers.set(patient.id, now);
        }

        if (now - criticalStateTimers.get(patient.id)! >= CRITICAL_STATE_DURATION) {
          status = 'critical';
        } else {
          status = 'warning';
        }
      } else if (
        newVitals.blood_pressure <= VITAL_RANGES.bloodPressure.min ||
        newVitals.blood_pressure >= VITAL_RANGES.bloodPressure.max ||
        newVitals.oxygen_saturation <= VITAL_RANGES.oxygenSaturation.min ||
        newVitals.heart_rate <= VITAL_RANGES.heartRate.min ||
        newVitals.heart_rate >= VITAL_RANGES.heartRate.max ||
        newVitals.respiratory_rate <= VITAL_RANGES.respiratoryRate.min ||
        newVitals.respiratory_rate >= VITAL_RANGES.respiratoryRate.max
      ) {
        status = 'warning';
        criticalStateTimers.delete(patient.id);
      } else {
        status = 'normal';
        criticalStateTimers.delete(patient.id);
      }

      // Store the historical data
      const { error: historyError } = await supabase
        .from('patient_history')
        .insert([
          {
            patient_id: patient.id,
            ...newVitals
          }
        ]);

      if (historyError) {
        console.error(`Error storing history for patient ${patient.id}:`, historyError);
      }

      // Update the patient's current vitals
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          ...newVitals,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient.id);

      if (updateError) {
        console.error(`Error updating patient ${patient.id}:`, updateError);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Patients updated successfully' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in update-patient-vitals function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});