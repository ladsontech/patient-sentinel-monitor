import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface PatientDetailProps {
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
    history: Array<{
      timestamp: string;
      bloodPressure: number;
      oxygenSaturation: number;
      heartRate: number;
      respiratoryRate: number;
    }>;
  };
}

const VITAL_RANGES = {
  bloodPressure: {
    normal: "90-120",
    warning: "121-139",
    critical: "≥140 or ≤90"
  },
  oxygenSaturation: {
    normal: "95-100%",
    warning: "90-94%",
    critical: "<90%"
  },
  heartRate: {
    normal: "60-100",
    warning: "101-120",
    critical: ">120 or <50"
  },
  respiratoryRate: {
    normal: "12-20",
    warning: "21-30",
    critical: ">30 or <10"
  }
};

export function PatientDetail({ patient }: PatientDetailProps) {
  const getVitalStatus = (vital: keyof typeof VITAL_RANGES, value: number) => {
    switch (vital) {
      case 'bloodPressure':
        if (value >= 140 || value <= 90) return 'critical';
        if (value >= 121 && value <= 139) return 'warning';
        return 'normal';
      case 'oxygenSaturation':
        if (value < 90) return 'critical';
        if (value >= 90 && value <= 94) return 'warning';
        return 'normal';
      case 'heartRate':
        if (value > 120 || value < 50) return 'critical';
        if (value >= 101 && value <= 120) return 'warning';
        return 'normal';
      case 'respiratoryRate':
        if (value > 30 || value < 10) return 'critical';
        if (value >= 21 && value <= 30) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{patient.name}</h2>
          <p className="text-gray-500">
            Room {patient.room} • {patient.ward}
          </p>
        </div>
        <Card className={cn(
          "px-4 py-2",
          {
            "bg-green-50 text-green-700": patient.status === "normal",
            "bg-amber-50 text-amber-700": patient.status === "warning",
            "bg-red-50 text-red-700": patient.status === "critical"
          }
        )}>
          {patient.status.toUpperCase()}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(patient.vitals).map(([key, value]) => {
          const vitalKey = key as keyof typeof VITAL_RANGES;
          const status = getVitalStatus(vitalKey, value);
          const ranges = VITAL_RANGES[vitalKey];
          const unit = key === 'oxygenSaturation' ? '%' : 
                      key === 'heartRate' ? ' BPM' : 
                      key === 'respiratoryRate' ? ' breaths/min' : 
                      ' mmHg';

          return (
            <Card key={key} className={cn(
              "p-4",
              {
                "border-green-200": status === "normal",
                "border-amber-200": status === "warning",
                "border-red-200": status === "critical"
              }
            )}>
              <p className="vital-label">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="vital-value">{value}{unit}</p>
              <div className="mt-2 text-xs">
                <p className="text-green-600">Normal: {ranges.normal}</p>
                <p className="text-amber-600">Warning: {ranges.warning}</p>
                <p className="text-red-600">Critical: {ranges.critical}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={patient.history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="bloodPressure" stroke="#ef4444" name="Blood Pressure" />
            <Line type="monotone" dataKey="oxygenSaturation" stroke="#3b82f6" name="O2 Saturation" />
            <Line type="monotone" dataKey="heartRate" stroke="#22c55e" name="Heart Rate" />
            <Line type="monotone" dataKey="respiratoryRate" stroke="#f59e0b" name="Respiratory Rate" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}