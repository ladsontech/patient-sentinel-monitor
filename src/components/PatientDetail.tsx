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

export function PatientDetail({ patient }: PatientDetailProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="vital-label">Blood Pressure</p>
          <p className="vital-value">{patient.vitals.bloodPressure}</p>
        </Card>
        <Card className="p-4">
          <p className="vital-label">O2 Saturation</p>
          <p className="vital-value">{patient.vitals.oxygenSaturation}%</p>
        </Card>
        <Card className="p-4">
          <p className="vital-label">Heart Rate</p>
          <p className="vital-value">{patient.vitals.heartRate}</p>
        </Card>
        <Card className="p-4">
          <p className="vital-label">Respiratory Rate</p>
          <p className="vital-value">{patient.vitals.respiratoryRate}</p>
        </Card>
      </div>

      <Card className="graph-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={patient.history.slice(-30)} // Show last 30 data points for better visualization
          >
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