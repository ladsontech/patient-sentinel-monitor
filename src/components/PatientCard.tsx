import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PatientCardProps {
  patient: {
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
  };
  onClick: () => void;
  isSelected: boolean;
}

export function PatientCard({ patient, onClick, isSelected }: PatientCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-green-500";
      case "warning":
        return "text-amber-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card
      className={cn(
        "parameter-card cursor-pointer transition-all duration-300",
        {
          "ring-2 ring-primary": isSelected,
          "normal": patient.status === "normal",
          "warning": patient.status === "warning",
          "critical": patient.status === "critical"
        }
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg">{patient.name}</h3>
          <p className="patient-info">
            Room {patient.room} • {patient.ward}
          </p>
        </div>
        <span className={cn("font-medium", getStatusColor(patient.status))}>
          {patient.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="vital-value">{patient.vitals.bloodPressure}</p>
          <p className="vital-label">Blood Pressure</p>
        </div>
        <div>
          <p className="vital-value">{patient.vitals.oxygenSaturation}%</p>
          <p className="vital-label">O2 Saturation</p>
        </div>
        <div>
          <p className="vital-value">{patient.vitals.heartRate}</p>
          <p className="vital-label">Heart Rate</p>
        </div>
        <div>
          <p className="vital-value">{patient.vitals.respiratoryRate}</p>
          <p className="vital-label">Respiratory Rate</p>
        </div>
      </div>
    </Card>
  );
}