import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Pill, FlaskConical, Calendar, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

//todo: remove mock functionality
const mockRecord = {
  patient: {
    name: 'João Silva Santos',
    cpf: '123.456.789-00',
    cns: '123 4567 8901 2345',
    age: 45,
    gender: 'Masculino',
    bloodType: 'O+',
    allergies: ['Penicilina', 'Dipirona'],
  },
  consultations: [
    { date: '15/01/2025', type: 'Consulta Médica', professional: 'Dra. Maria Silva', diagnosis: 'Hipertensão arterial (I10)', notes: 'Paciente apresenta PA 150/95. Iniciado tratamento.' },
    { date: '10/12/2024', type: 'Consulta Enfermagem', professional: 'Enf. Carlos Santos', diagnosis: 'Controle de rotina', notes: 'Sinais vitais estáveis. Orientações sobre dieta.' },
  ],
  prescriptions: [
    { date: '15/01/2025', medication: 'Losartana 50mg', dosage: '1 comp/dia', duration: '30 dias', doctor: 'Dra. Maria Silva' },
    { date: '15/01/2025', medication: 'Hidroclorotiazida 25mg', dosage: '1 comp/dia', duration: '30 dias', doctor: 'Dra. Maria Silva' },
  ],
  exams: [
    { date: '12/01/2025', type: 'Hemograma completo', status: 'Concluído', result: 'Normal' },
    { date: '12/01/2025', type: 'Glicemia de jejum', status: 'Concluído', result: '95 mg/dL' },
  ],
};

export function MedicalRecord() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={mockRecord.patient.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {mockRecord.patient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{mockRecord.patient.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{mockRecord.patient.age} anos</Badge>
                  <Badge variant="outline">{mockRecord.patient.gender}</Badge>
                  <Badge variant="outline">Tipo: {mockRecord.patient.bloodType}</Badge>
                </div>
              </div>
            </div>
            <Button size="default" data-testid="button-new-consultation">
              <Plus className="h-4 w-4 mr-2" />
              Nova Consulta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">CPF</p>
              <p className="font-mono text-foreground">{mockRecord.patient.cpf}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CNS</p>
              <p className="font-mono text-foreground">{mockRecord.patient.cns}</p>
            </div>
          </div>
          {mockRecord.patient.allergies.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Alergias</p>
                <div className="flex gap-2">
                  {mockRecord.patient.allergies.map((allergy, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="consultations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultations" data-testid="tab-consultations">
            <FileText className="h-4 w-4 mr-2" />
            Consultas
          </TabsTrigger>
          <TabsTrigger value="prescriptions" data-testid="tab-prescriptions">
            <Pill className="h-4 w-4 mr-2" />
            Prescrições
          </TabsTrigger>
          <TabsTrigger value="exams" data-testid="tab-exams">
            <FlaskConical className="h-4 w-4 mr-2" />
            Exames
          </TabsTrigger>
          <TabsTrigger value="schedule" data-testid="tab-schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Agendamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultations" className="space-y-4 mt-4">
          {mockRecord.consultations.map((consultation, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{consultation.type}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{consultation.professional}</p>
                  </div>
                  <Badge variant="outline">{consultation.date}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Diagnóstico</p>
                  <p className="text-sm text-muted-foreground">{consultation.diagnosis}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Observações</p>
                  <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4 mt-4">
          {mockRecord.prescriptions.map((prescription, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{prescription.medication}</CardTitle>
                  <Badge variant="outline">{prescription.date}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Posologia</p>
                    <p className="text-foreground font-medium">{prescription.dosage}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duração</p>
                    <p className="text-foreground font-medium">{prescription.duration}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Prescrito por: {prescription.doctor}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="exams" className="space-y-4 mt-4">
          {mockRecord.exams.map((exam, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{exam.type}</CardTitle>
                  <Badge variant="outline">{exam.date}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge className="mt-1">{exam.status}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resultado</p>
                    <p className="text-foreground font-medium mt-1">{exam.result}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum agendamento futuro</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
