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
        "parameter-card cursor-pointer transition-all duration-300 max-w-sm",
        {
          "ring-2 ring-primary": isSelected,
          "normal": patient.status === "normal",
          "warning": patient.status === "warning",
          "critical": patient.status === "critical"
        }
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-base">{patient.name}</h3>
          <p className="patient-info">
            Room {patient.room} • {patient.ward}
          </p>
        </div>
        <span className={cn("font-medium text-sm", getStatusColor(patient.status))}>
          {patient.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="vital-value text-lg">{patient.vitals.bloodPressure}</p>
          <p className="vital-label text-xs">Blood Pressure</p>
        </div>
        <div>
          <p className="vital-value text-lg">{patient.vitals.oxygenSaturation}%</p>
          <p className="vital-label text-xs">O2 Saturation</p>
        </div>
        <div>
          <p className="vital-value text-lg">{patient.vitals.heartRate}</p>
          <p className="vital-label text-xs">Heart Rate</p>
        </div>
        <div>
          <p className="vital-value text-lg">{patient.vitals.respiratoryRate}</p>
          <p className="vital-label text-xs">Respiratory Rate</p>
        </div>
      </div>
    </Card>
  );
}