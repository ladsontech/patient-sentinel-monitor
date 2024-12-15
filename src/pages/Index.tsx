import { useState, useEffect } from "react";
import { PatientCard } from "@/components/PatientCard";
import { PatientDetail } from "@/components/PatientDetail";
import { useToast } from "@/components/ui/use-toast";

// Simulated data generation
const generateVitals = () => ({
  bloodPressure: Math.floor(Math.random() * (140 - 100) + 100),
  oxygenSaturation: Math.floor(Math.random() * (100 - 92) + 92),
  heartRate: Math.floor(Math.random() * (100 - 60) + 60),
  respiratoryRate: Math.floor(Math.random() * (20 - 12) + 12),
});

const generateHistoryPoint = () => ({
  timestamp: new Date().toLocaleTimeString(),
  ...generateVitals(),
});

const generatePatient = (id: number) => {
  const vitals = generateVitals();
  const status = 
    vitals.oxygenSaturation < 95 || vitals.heartRate > 90 ? "critical" :
    vitals.oxygenSaturation < 97 || vitals.heartRate > 80 ? "warning" : 
    "normal";

  return {
    id: `patient-${id}`,
    name: `Patient ${id}`,
    room: `${Math.floor(Math.random() * 5) + 1}0${id}`,
    ward: ["ICU", "Emergency", "General"][Math.floor(Math.random() * 3)],
    vitals,
    status,
    history: Array(10).fill(null).map(generateHistoryPoint),
  };
};

const Index = () => {
  const [patients, setPatients] = useState(Array(6).fill(null).map((_, i) => generatePatient(i + 1)));
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setPatients(prevPatients => 
        prevPatients.map(patient => {
          const newVitals = generateVitals();
          const newStatus = 
            newVitals.oxygenSaturation < 95 || newVitals.heartRate > 90 ? "critical" :
            newVitals.oxygenSaturation < 97 || newVitals.heartRate > 80 ? "warning" : 
            "normal";

          if (newStatus === "critical" && patient.status !== "critical") {
            toast({
              title: "Critical Condition Alert",
              description: `${patient.name} in Room ${patient.room} needs immediate attention!`,
              variant: "destructive",
            });
          }

          return {
            ...patient,
            vitals: newVitals,
            status: newStatus,
            history: [...patient.history.slice(-9), generateHistoryPoint()],
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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