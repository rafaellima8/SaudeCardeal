import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson, FileCode, Calendar, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EsusExport {
  id: string;
  batchId: string;
  status: "pending" | "processing" | "completed" | "failed";
  startDate: string;
  endDate: string;
  healthUnitCNES: string;
  jsonPath: string | null;
  xmlPath: string | null;
  totalRecords: {
    cidadaos: number;
    atendimentos: number;
    procedimentos: number;
    exames: number;
    solicitacoesTFD: number;
  } | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function EsusExportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: exports, isLoading, refetch } = useQuery<EsusExport[]>({
    queryKey: ["/api/esus/exports"],
  });

  const handleDownload = async (exportId: string, type: "json" | "xml") => {
    setDownloading(`${exportId}-${type}`);
    try {
      const response = await fetch(`/api/esus/exports/${exportId}/download?type=${type}`);
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Erro: ${error.error || "Falha no download"}`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `esus_export_${exportId}.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Erro ao fazer download do arquivo");
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      completed: { variant: "default", icon: CheckCircle, label: "Concluída" },
      processing: { variant: "secondary", icon: Loader2, label: "Processando" },
      pending: { variant: "secondary", icon: Clock, label: "Pendente" },
      failed: { variant: "destructive", icon: XCircle, label: "Falhou" },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1" data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTotalRecords = (totals: EsusExport["totalRecords"]) => {
    if (!totals) return 0;
    return (
      totals.cidadaos +
      totals.atendimentos +
      totals.procedimentos +
      totals.exames +
      totals.solicitacoesTFD
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exportações e-SUS APS</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de exportações para o sistema e-SUS do Ministério da Saúde
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          Atualizar
        </Button>
      </div>

      {!exports || exports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma exportação encontrada</h3>
            <p className="text-sm text-muted-foreground">
              As exportações e-SUS aparecerão aqui quando forem geradas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exports.map((exp) => (
            <Card key={exp.id} data-testid={`card-export-${exp.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(exp.startDate), "dd/MM/yyyy", { locale: ptBR })} até{" "}
                      {format(new Date(exp.endDate), "dd/MM/yyyy", { locale: ptBR })}
                    </CardTitle>
                    <CardDescription>
                      Batch ID: <code className="text-xs">{exp.batchId}</code>
                    </CardDescription>
                  </div>
                  {getStatusBadge(exp.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">CNES</p>
                    <p className="font-medium">{exp.healthUnitCNES}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total de Registros</p>
                    <p className="font-medium">{getTotalRecords(exp.totalRecords)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Criada em</p>
                    <p className="font-medium">
                      {format(new Date(exp.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Concluída em</p>
                    <p className="font-medium">
                      {exp.completedAt
                        ? format(new Date(exp.completedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                </div>

                {exp.totalRecords && (
                  <div className="flex gap-2 flex-wrap text-xs">
                    <Badge variant="outline" data-testid="badge-cidadaos">
                      Cidadãos: {exp.totalRecords.cidadaos}
                    </Badge>
                    <Badge variant="outline" data-testid="badge-atendimentos">
                      Atendimentos: {exp.totalRecords.atendimentos}
                    </Badge>
                    <Badge variant="outline" data-testid="badge-procedimentos">
                      Procedimentos: {exp.totalRecords.procedimentos}
                    </Badge>
                    <Badge variant="outline" data-testid="badge-exames">
                      Exames: {exp.totalRecords.exames}
                    </Badge>
                    <Badge variant="outline" data-testid="badge-tfd">
                      TFD: {exp.totalRecords.solicitacoesTFD}
                    </Badge>
                  </div>
                )}

                {exp.errorMessage && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
                    <p className="font-medium text-destructive">Erro:</p>
                    <p className="text-destructive/90">{exp.errorMessage}</p>
                  </div>
                )}

                {exp.status === "completed" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(exp.id, "json")}
                      disabled={downloading === `${exp.id}-json`}
                      data-testid="button-download-json"
                    >
                      {downloading === `${exp.id}-json` ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileJson className="h-4 w-4 mr-2" />
                      )}
                      Download JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(exp.id, "xml")}
                      disabled={downloading === `${exp.id}-xml`}
                      data-testid="button-download-xml"
                    >
                      {downloading === `${exp.id}-xml` ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileCode className="h-4 w-4 mr-2" />
                      )}
                      Download XML
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
