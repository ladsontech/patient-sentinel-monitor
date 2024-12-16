import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keep track of when we last generated an alert for each patient
const lastAlertTimes = new Map<string, number>();
const ALERT_COOLDOWN = 30000; // 30 seconds cooldown between alerts for the same patient

const generateAlert = async (patient: any, genAI: any) => {
  try {
    // Use the mini model which has higher rate limits
    const model = genAI.getGenerativeModel({ model: "gemini-pro-mini" });
    
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
    // Return a default message if AI generation fails
    return `Alert: Patient ${patient.name} has entered critical condition. Immediate attention required.`;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
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

    // Update each patient's vitals with smaller variations
    for (const patient of patients) {
      const previousStatus = patient.status;
      
      // Generate smaller variations for more realistic continuous monitoring
      const newVitals = {
        blood_pressure: patient.blood_pressure + Math.floor(Math.random() * 6 - 3), // ±3
        oxygen_saturation: Math.min(100, Math.max(85, patient.oxygen_saturation + Math.floor(Math.random() * 4 - 2))), // ±2
        heart_rate: patient.heart_rate + Math.floor(Math.random() * 4 - 2), // ±2
        respiratory_rate: patient.respiratory_rate + Math.floor(Math.random() * 2 - 1) // ±1
      };

      // Determine status based on vital signs
      let status = 'normal';
      if (newVitals.oxygen_saturation < 90 || newVitals.heart_rate > 100 || newVitals.blood_pressure > 160) {
        status = 'critical';
      } else if (newVitals.oxygen_saturation < 94 || newVitals.heart_rate > 90 || newVitals.blood_pressure > 140) {
        status = 'warning';
      }

      // Generate AI alert only if:
      // 1. Status changed to critical
      // 2. We haven't generated an alert recently for this patient
      let aiAlert = null;
      const now = Date.now();
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

        if (aiAlert) {
          console.log('AI Alert for patient', patient.name, ':', aiAlert);
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