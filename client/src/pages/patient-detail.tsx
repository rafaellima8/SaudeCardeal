import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Pill, FlaskConical, Calendar, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Citizen, Consultation, Prescription, Exam } from "@shared/schema";

export default function PatientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: patient, isLoading: loadingPatient } = useQuery<Citizen>({
    queryKey: ['/api/citizens', id],
    queryFn: async () => {
      const response = await fetch(`/api/citizens/${id}`);
      if (!response.ok) throw new Error('Erro ao buscar paciente');
      return response.json();
    },
  });

  const { data: consultations = [] } = useQuery<Consultation[]>({
    queryKey: ['/api/consultations', { citizenId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/consultations?citizenId=${id}`);
      if (!response.ok) throw new Error('Erro ao buscar consultas');
      return response.json();
    },
    enabled: !!id,
  });

  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['/api/prescriptions', { citizenId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/prescriptions?citizenId=${id}`);
      if (!response.ok) throw new Error('Erro ao buscar prescrições');
      return response.json();
    },
    enabled: !!id,
  });

  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ['/api/exams', { citizenId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/exams?citizenId=${id}`);
      if (!response.ok) throw new Error('Erro ao buscar exames');
      return response.json();
    },
    enabled: !!id,
  });

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loadingPatient) {
    return <div className="text-center py-8">Carregando prontuário...</div>;
  }

  if (!patient) {
    return <div className="text-center py-8">Paciente não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid="button-back"
          onClick={() => setLocation('/pacientes')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prontuário Eletrônico do Cidadão</h1>
          <p className="text-muted-foreground mt-1">Histórico completo de atendimentos e prescrições</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={patient.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {patient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{patient.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{calculateAge(patient.birthDate)} anos</Badge>
                  <Badge variant="outline">{patient.gender === 'M' ? 'Masculino' : 'Feminino'}</Badge>
                  {patient.bloodType && <Badge variant="outline">Tipo: {patient.bloodType}</Badge>}
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
              <p className="font-mono text-foreground">{patient.cpf}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CNS</p>
              <p className="font-mono text-foreground">{patient.cns}</p>
            </div>
          </div>
          {patient.allergies && patient.allergies.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Alergias</p>
                <div className="flex gap-2">
                  {patient.allergies.map((allergy, idx) => (
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consultations" data-testid="tab-consultations">
            <FileText className="h-4 w-4 mr-2" />
            Consultas ({consultations.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" data-testid="tab-prescriptions">
            <Pill className="h-4 w-4 mr-2" />
            Prescrições ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="exams" data-testid="tab-exams">
            <FlaskConical className="h-4 w-4 mr-2" />
            Exames ({exams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultations" className="space-y-4 mt-4">
          {consultations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Nenhuma consulta registrada</p>
              </CardContent>
            </Card>
          ) : (
            consultations.map((consultation) => (
              <Card key={consultation.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{consultation.type}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(consultation.consultationDate).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {consultation.diagnosis && (
                    <div>
                      <p className="text-sm font-medium text-foreground">Diagnóstico</p>
                      <p className="text-sm text-muted-foreground">{consultation.diagnosis}</p>
                      {consultation.cid10 && consultation.cid10.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {consultation.cid10.map((cid, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs font-mono">{cid}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {consultation.notes && (
                    <div>
                      <p className="text-sm font-medium text-foreground">Observações</p>
                      <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4 mt-4">
          {prescriptions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Nenhuma prescrição registrada</p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map((prescription) => (
              <Card key={prescription.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{prescription.medication}</CardTitle>
                    <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>
                      {prescription.status === 'active' ? 'Ativa' : 
                       prescription.status === 'dispensed' ? 'Dispensada' : 'Cancelada'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Posologia</p>
                      <p className="text-foreground font-medium">{prescription.dosage} - {prescription.frequency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duração</p>
                      <p className="text-foreground font-medium">{prescription.duration}</p>
                    </div>
                  </div>
                  {prescription.instructions && (
                    <p className="text-sm text-muted-foreground">{prescription.instructions}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="exams" className="space-y-4 mt-4">
          {exams.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Nenhum exame solicitado</p>
              </CardContent>
            </Card>
          ) : (
            exams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{exam.type}</CardTitle>
                    <Badge variant={exam.status === 'completed' ? 'secondary' : 'outline'}>
                      {exam.status === 'completed' ? 'Concluído' : 
                       exam.status === 'pending' ? 'Pendente' : exam.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Solicitado em</p>
                      <p className="text-foreground">{new Date(exam.requestDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    {exam.completionDate && (
                      <div>
                        <p className="text-muted-foreground">Concluído em</p>
                        <p className="text-foreground">{new Date(exam.completionDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                  {exam.result && (
                    <div>
                      <p className="text-sm font-medium text-foreground">Resultado</p>
                      <p className="text-sm text-muted-foreground">{exam.result}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
