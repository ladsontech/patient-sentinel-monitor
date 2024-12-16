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

    // Update each patient's vitals with smaller variations
    for (const patient of patients) {
      const previousStatus = patient.status;
      const now = Date.now();
      
      // Generate smaller variations for more realistic continuous monitoring
      const newVitals = {
        blood_pressure: patient.blood_pressure + Math.floor(Math.random() * 6 - 3), // ±3
        oxygen_saturation: Math.min(100, Math.max(85, patient.oxygen_saturation + Math.floor(Math.random() * 4 - 2))), // ±2
        heart_rate: patient.heart_rate + Math.floor(Math.random() * 4 - 2), // ±2
        respiratory_rate: patient.respiratory_rate + Math.floor(Math.random() * 2 - 1) // ±1
      };

      // Determine status based on vital signs and critical state timer
      let status = 'normal';
      const criticalStartTime = criticalStateTimers.get(patient.id);
      
      if (newVitals.oxygen_saturation < 90 || newVitals.heart_rate > 100 || newVitals.blood_pressure > 160) {
        if (!criticalStartTime) {
          criticalStateTimers.set(patient.id, now);
        }
        status = 'critical';
      } else if (newVitals.oxygen_saturation < 94 || newVitals.heart_rate > 90 || newVitals.blood_pressure > 140) {
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
