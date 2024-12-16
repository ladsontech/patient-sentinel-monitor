import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

// Keep track of when we last generated an alert for each patient
const lastAlertTimes = new Map<string, number>();
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
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Generate a brief, urgent medical alert message for a patient with the following vital signs:
      - Blood Pressure: ${patient.blood_pressure}
      - Oxygen Saturation: ${patient.oxygen_saturation}%
      - Heart Rate: ${patient.heart_rate} bpm
      - Respiratory Rate: ${patient.respiratory_rate}
      Keep it professional and concise, focusing on the most concerning vital sign.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating alert:', error);
    return `Alert: Patient ${patient.name} has entered critical condition. Immediate attention required.`;
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
    console.log('Starting vitals update process');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '');

    // Fetch all patients
    const { data: patients, error: patientsError } = await supabaseClient
      .from('patients')
      .select('*');
    
    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      throw patientsError;
    }

    console.log(`Processing ${patients?.length ?? 0} patients`);

    // Update each patient's vitals with realistic variations
    for (const patient of patients) {
      const previousStatus = patient.status;
      const now = Date.now();
      
      // Generate realistic variations for vital signs
      const newVitals = {
        blood_pressure: Math.round(generateVariation(
          patient.blood_pressure,
          0.5,
          2,
          VITAL_RANGES.bloodPressure.min,
          VITAL_RANGES.bloodPressure.max
        )),
        oxygen_saturation: Math.round(generateVariation(
          patient.oxygen_saturation,
          0.1,
          0.5,
          VITAL_RANGES.oxygenSaturation.min,
          VITAL_RANGES.oxygenSaturation.max
        )),
        heart_rate: Math.round(generateVariation(
          patient.heart_rate,
          1,
          3,
          VITAL_RANGES.heartRate.min,
          VITAL_RANGES.heartRate.max
        )),
        respiratory_rate: Math.round(generateVariation(
          patient.respiratory_rate,
          0.5,
          1,
          VITAL_RANGES.respiratoryRate.min,
          VITAL_RANGES.respiratoryRate.max
        ))
      };

      // Determine status based on vital signs and critical state timer
      let status = 'normal';
      const criticalStartTime = criticalStateTimers.get(patient.id);
      
      if (
        newVitals.blood_pressure < VITAL_RANGES.bloodPressure.criticalLow ||
        newVitals.blood_pressure > VITAL_RANGES.bloodPressure.criticalHigh ||
        newVitals.oxygen_saturation < VITAL_RANGES.oxygenSaturation.criticalLow ||
        newVitals.heart_rate < VITAL_RANGES.heartRate.criticalLow ||
        newVitals.heart_rate > VITAL_RANGES.heartRate.criticalHigh ||
        newVitals.respiratory_rate < VITAL_RANGES.respiratoryRate.criticalLow ||
        newVitals.respiratory_rate > VITAL_RANGES.respiratoryRate.criticalHigh
      ) {
        if (!criticalStartTime) {
          criticalStateTimers.set(patient.id, now);
        }
        status = 'critical';
      } else if (
        newVitals.blood_pressure < VITAL_RANGES.bloodPressure.min ||
        newVitals.blood_pressure > VITAL_RANGES.bloodPressure.max ||
        newVitals.oxygen_saturation < VITAL_RANGES.oxygenSaturation.min ||
        newVitals.heart_rate < VITAL_RANGES.heartRate.min ||
        newVitals.heart_rate > VITAL_RANGES.heartRate.max ||
        newVitals.respiratory_rate < VITAL_RANGES.respiratoryRate.min ||
        newVitals.respiratory_rate > VITAL_RANGES.respiratoryRate.max
      ) {
        status = 'warning';
      }

      // Keep critical state for minimum duration
      if (criticalStartTime && now - criticalStartTime < CRITICAL_STATE_DURATION) {
        status = 'critical';
      } else if (criticalStartTime && status !== 'critical') {
        criticalStateTimers.delete(patient.id);
      }

      // Generate AI alert only if status changed to critical and cooldown passed
      let aiAlert = null;
      const lastAlertTime = lastAlertTimes.get(patient.id) || 0;
      
      if (status === 'critical' && 
          previousStatus !== 'critical' && 
          now - lastAlertTime > ALERT_COOLDOWN) {
        try {
          aiAlert = await generateAlert({ ...patient, ...newVitals }, genAI);
          lastAlertTimes.set(patient.id, now);
          console.log(`Generated AI alert for patient ${patient.name}: ${aiAlert}`);
        } catch (error) {
          console.error('Failed to generate AI alert:', error);
        }
      }

      try {
        // Update patient vitals
        const { error: updateError } = await supabaseClient
          .from('patients')
          .update({
            ...newVitals,
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', patient.id);

        if (updateError) {
          console.error(`Error updating patient ${patient.id}:`, updateError);
          continue;
        }

        // Add to history
        const { error: historyError } = await supabaseClient
          .from('patient_history')
          .insert({
            patient_id: patient.id,
            ...newVitals,
          });

        if (historyError) {
          console.error(`Error adding history for patient ${patient.id}:`, historyError);
        }

      } catch (error) {
        console.error(`Error processing patient ${patient.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Vitals updated successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in update-patient-vitals function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});