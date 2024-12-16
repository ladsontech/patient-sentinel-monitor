import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching patients...')
    
    // Fetch all patients
    const { data: patients, error: patientsError } = await supabaseClient
      .from('patients')
      .select('*')
    
    if (patientsError) {
      console.error('Error fetching patients:', patientsError)
      throw patientsError
    }

    console.log(`Updating vitals for ${patients.length} patients...`)

    // Update each patient's vitals with slight variations
    for (const patient of patients) {
      const newVitals = {
        blood_pressure: patient.blood_pressure + Math.floor(Math.random() * 10 - 5),
        oxygen_saturation: Math.min(100, Math.max(90, patient.oxygen_saturation + Math.floor(Math.random() * 4 - 2))),
        heart_rate: patient.heart_rate + Math.floor(Math.random() * 8 - 4),
        respiratory_rate: patient.respiratory_rate + Math.floor(Math.random() * 4 - 2)
      }

      // Determine status based on vital signs
      let status = 'normal'
      if (newVitals.oxygen_saturation < 95 || newVitals.heart_rate > 90) {
        status = 'critical'
      } else if (newVitals.oxygen_saturation < 97 || newVitals.heart_rate > 80) {
        status = 'warning'
      }

      console.log(`Updating patient ${patient.id} with new vitals:`, newVitals)

      // Update patient vitals
      const { error: updateError } = await supabaseClient
        .from('patients')
        .update({
          ...newVitals,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient.id)

      if (updateError) {
        console.error(`Error updating patient ${patient.id}:`, updateError)
        throw updateError
      }

      // Add to history
      const { error: historyError } = await supabaseClient
        .from('patient_history')
        .insert({
          patient_id: patient.id,
          ...newVitals,
          timestamp: new Date().toISOString()
        })

      if (historyError) {
        console.error(`Error adding history for patient ${patient.id}:`, historyError)
        throw historyError
      }
    }

    return new Response(
      JSON.stringify({ message: 'Vitals updated successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in update-patient-vitals function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})