import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { VITAL_THRESHOLDS } from './vitalThresholds.ts';
import { generateVitalsForStatus, generateRandomInRange } from './vitalGenerator.ts';
import { determineStatus } from './statusDeterminer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      const newVitals = generateVitalsForStatus(targetStatus);

      // Add small random variations to make changes more natural
      Object.keys(newVitals).forEach(key => {
        const thresholdKey = key.toUpperCase() as keyof typeof VITAL_THRESHOLDS;
        newVitals[key] = generateRandomInRange(
          VITAL_THRESHOLDS[thresholdKey].MIN,
          VITAL_THRESHOLDS[thresholdKey].MAX,
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