import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateAlert = async (patient: any, genAI: any) => {
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

    // Update each patient's vitals with smaller variations
    for (const patient of patients) {
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

      // If status is critical, generate AI alert
      let aiAlert = null;
      if (status === 'critical') {
        aiAlert = await generateAlert({ ...patient, ...newVitals }, genAI);
      }

      // Update patient vitals
      await supabaseClient
        .from('patients')
        .update({
          ...newVitals,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient.id);

      // Add to history
      await supabaseClient
        .from('patient_history')
        .insert({
          patient_id: patient.id,
          ...newVitals,
        });

      if (aiAlert) {
        console.log('AI Alert for patient', patient.name, ':', aiAlert);
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