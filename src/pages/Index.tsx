import { useState, useEffect } from "react";
import { PatientCard } from "@/components/PatientCard";
import { PatientDetail } from "@/components/PatientDetail";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";

type Patient = {
  id: string;
  name: string;
  room: string;
  ward: string;
  vitals: {
    bloodPressure: number;
    oxygenSaturation: number;
    heartRate: number;
    respiratoryRate: number;
  };
  status: "normal" | "warning" | "critical";
  history: Array<{
    timestamp: string;
    bloodPressure: number;
    oxygenSaturation: number;
    heartRate: number;
    respiratoryRate: number;
  }>;
};

const fetchPatients = async (): Promise<Patient[]> => {
  const { data: patientsData, error: patientsError } = await supabase
    .from('patients')
    .select('*');

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    throw patientsError;
  }

  const { data: historyData, error: historyError } = await supabase
    .from('patient_history')
    .select('*');

  if (historyError) {
    console.error('Error fetching patient history:', historyError);
    throw historyError;
  }

  return patientsData.map(patient => ({
    id: patient.id,
    name: patient.name,
    room: patient.room,
    ward: patient.ward,
    vitals: {
      bloodPressure: patient.blood_pressure,
      oxygenSaturation: patient.oxygen_saturation,
      heartRate: patient.heart_rate,
      respiratoryRate: patient.respiratory_rate
    },
    status: patient.status,
    history: historyData
      .filter(h => h.patient_id === patient.id)
      .map(h => ({
        timestamp: h.timestamp || new Date().toISOString(),
        bloodPressure: h.blood_pressure,
        oxygenSaturation: h.oxygen_saturation,
        heartRate: h.heart_rate,
        respiratoryRate: h.respiratory_rate
      }))
  }));
};

const updatePatientVitals = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('update-patient-vitals', {
      method: 'POST'
    });
    
    if (error) {
      console.error('Error updating patient vitals:', error);
      throw error;
    }
    
    console.log('Patient vitals updated successfully:', data);
  } catch (error) {
    console.error('Error in updatePatientVitals:', error);
    throw error;
  }
};

const Index = () => {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    refetchInterval: 1000,
    retry: 3,
    meta: {
      onError: (error: Error) => {
        console.error('Error fetching patients:', error);
        toast({
          title: "Error",
          description: "Failed to fetch patient data. Please try again later.",
          variant: "destructive",
        });
      }
    }
  });

  useEffect(() => {
    const updateVitals = async () => {
      try {
        await updatePatientVitals();
      } catch (error) {
        console.error('Error in vital update interval:', error);
      }
    };

    const interval = setInterval(updateVitals, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (patients.length > 0 && !selectedPatient) {
      setSelectedPatient(patients[0]);
    }

    // Show notifications for critical patients
    patients.forEach(patient => {
      if (patient.status === "critical") {
        toast({
          title: "Critical Condition Alert",
          description: `${patient.name} in Room ${patient.room} needs immediate attention! Vital signs are concerning.`,
          variant: "destructive",
        });
      } else if (patient.status === "warning") {
        toast({
          title: "Warning Alert",
          description: `${patient.name} in Room ${patient.room} shows concerning vital signs.`,
          variant: "destructive",
        });
      }
    });
  }, [patients, selectedPatient, toast]);

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Hospital Alert System</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={() => setSelectedPatient(patient)}
              isSelected={selectedPatient?.id === patient.id}
            />
          ))}
        </div>
        
        <div className="lg:col-span-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {selectedPatient && <PatientDetail patient={selectedPatient} />}
        </div>
      </div>
    </div>
  );
};

export default Index;