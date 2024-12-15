import { useState, useEffect } from "react";
import { PatientCard } from "@/components/PatientCard";
import { PatientDetail } from "@/components/PatientDetail";
import { useToast } from "@/components/ui/use-toast";
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
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*');
  
  if (error) throw error;
  
  const { data: history, error: historyError } = await supabase
    .from('patient_history')
    .select('*')
    .order('timestamp', { ascending: true });
  
  if (historyError) throw historyError;

  return (patients as Database['public']['Tables']['patients']['Row'][]).map(patient => ({
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
    history: (history as Database['public']['Tables']['patient_history']['Row'][])
      .filter(h => h.patient_id === patient.id)
      .map(h => ({
        timestamp: new Date(h.timestamp!).toLocaleTimeString(),
        bloodPressure: h.blood_pressure,
        oxygenSaturation: h.oxygen_saturation,
        heartRate: h.heart_rate,
        respiratoryRate: h.respiratory_rate
      }))
  }));
};

const Index = () => {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    refetchInterval: 3000, // Refetch every 3 seconds
  });

  useEffect(() => {
    if (patients.length > 0 && !selectedPatient) {
      setSelectedPatient(patients[0]);
    }

    // Check for critical patients and show notifications
    patients.forEach(patient => {
      if (patient.status === "critical") {
        toast({
          title: "Critical Condition Alert",
          description: `${patient.name} in Room ${patient.room} needs immediate attention!`,
          variant: "destructive",
        });
      }
    });
  }, [patients, selectedPatient, toast]);

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-8">Hospital Alert System</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={() => setSelectedPatient(patient)}
              isSelected={selectedPatient?.id === patient.id}
            />
          ))}
        </div>
        
        <div className="lg:col-span-2">
          {selectedPatient && <PatientDetail patient={selectedPatient} />}
        </div>
      </div>
    </div>
  );
};

export default Index;