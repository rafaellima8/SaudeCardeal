import { PatientList } from "@/components/patient-list";

export default function Patients() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
        <p className="text-muted-foreground mt-1">Cadastro e prontuários eletrônicos dos cidadãos</p>
      </div>

      <PatientList />
    </div>
  );
}
