import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  FileText, 
  AlertCircle, 
  Pill, 
  TestTube, 
  Activity 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicalHistoryProps {
  citizenId: string;
}

export function MedicalHistory({ citizenId }: MedicalHistoryProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["/api/citizens", citizenId, "medical-history"],
    queryFn: () => apiRequest("GET", `/api/citizens/${citizenId}/medical-history`),
    enabled: !!citizenId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!history) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Nenhum histórico disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Problemas Ativos */}
        {history.problems && history.problems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-600" />
                <CardTitle className="text-sm font-medium">
                  Problemas/Condições Ativas
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.problems.map((problem: any) => (
                <div
                  key={problem.id}
                  className="flex items-start justify-between rounded-md border p-3"
                  data-testid={`problem-${problem.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{problem.description}</p>
                      <Badge 
                        variant={
                          problem.status === "active" 
                            ? "default" 
                            : problem.status === "controlled" 
                            ? "secondary" 
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {problem.status === "active" ? "Ativo" : 
                         problem.status === "controlled" ? "Controlado" : "Resolvido"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      CIAP-2: {problem.ciap2Code}
                    </p>
                    {problem.diagnosedAt && (
                      <p className="text-xs text-muted-foreground">
                        Diagnosticado em: {format(new Date(problem.diagnosedAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Últimas Consultas */}
        {history.consultations && history.consultations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-medium">
                  Últimas Consultas
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.consultations.slice(0, 5).map((consultation: any) => (
                <div
                  key={consultation.id}
                  className="rounded-md border p-3 space-y-2"
                  data-testid={`consultation-history-${consultation.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(consultation.consultationDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  
                  {consultation.diagnosis && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Diagnóstico:</p>
                      <p className="text-sm">{consultation.diagnosis}</p>
                    </div>
                  )}

                  {consultation.ciap2Codes && consultation.ciap2Codes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {consultation.ciap2Codes.map((code: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          CIAP-2: {code}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {consultation.cid10Codes && consultation.cid10Codes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {consultation.cid10Codes.map((code: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          CID-10: {code}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Últimas Prescrições */}
        {history.prescriptions && history.prescriptions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-medium">
                  Últimas Prescrições
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.prescriptions.slice(0, 5).map((prescription: any) => (
                <div
                  key={prescription.id}
                  className="rounded-md border p-2"
                  data-testid={`prescription-history-${prescription.id}`}
                >
                  <p className="text-sm font-medium">{prescription.medication}</p>
                  <p className="text-xs text-muted-foreground">
                    {prescription.dosage} - {prescription.frequency} por {prescription.duration}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Últimos Exames */}
        {history.exams && history.exams.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-medium">
                  Últimos Exames
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.exams.slice(0, 5).map((exam: any) => (
                <div
                  key={exam.id}
                  className="rounded-md border p-2"
                  data-testid={`exam-history-${exam.id}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{exam.examType}</p>
                    <Badge 
                      variant={
                        exam.status === "completed" 
                          ? "default" 
                          : exam.status === "requested" 
                          ? "secondary" 
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {exam.status === "requested" ? "Solicitado" :
                       exam.status === "scheduled" ? "Agendado" :
                       exam.status === "completed" ? "Concluído" : "Cancelado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Solicitado em: {format(new Date(exam.requestDate), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  {exam.result && (
                    <p className="text-xs mt-1">Resultado: {exam.result}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Mensagem se não houver histórico */}
        {(!history.problems || history.problems.length === 0) &&
         (!history.consultations || history.consultations.length === 0) &&
         (!history.prescriptions || history.prescriptions.length === 0) &&
         (!history.exams || history.exams.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">Nenhum histórico clínico disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                Este paciente ainda não possui atendimentos registrados nesta unidade
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
