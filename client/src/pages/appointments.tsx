import { AppointmentCalendar } from "@/components/appointment-calendar";

export default function Appointments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">Gestão de consultas e procedimentos agendados</p>
      </div>

      <AppointmentCalendar />
    </div>
  );
}
