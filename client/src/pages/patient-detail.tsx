import { MedicalRecord } from "@/components/medical-record";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PatientDetail() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prontuário do Paciente</h1>
          <p className="text-muted-foreground mt-1">Histórico completo de atendimentos e prescrições</p>
        </div>
      </div>

      <MedicalRecord />
    </div>
  );
}
