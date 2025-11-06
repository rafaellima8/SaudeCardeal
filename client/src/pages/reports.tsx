
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, TrendingUp, TrendingDown, Download, Users, Activity, Pill, FileBarChart } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportData {
  summary: {
    totalPatients: number;
    newPatients: number;
    totalConsultations: number;
    totalPrescriptions: number;
    totalExams: number;
    tfdRequests: number;
  };
  consultationsByType: Array<{ type: string; count: number }>;
  topDiagnoses: Array<{ diagnosis: string; count: number }>;
  medicationUsage: Array<{ medication: string; quantity: number }>;
  ageDistribution: Array<{ range: string; count: number }>;
}

export default function Reports() {
  const [period, setPeriod] = useState("30");
  const [unitId, setUnitId] = useState<string>("all");

  const { data: units = [] } = useQuery({
    queryKey: ['/api/units'],
  });

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ['/api/reports', period, unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('period', period);
      if (unitId !== 'all') {
        params.append('unitId', unitId);
      }
      const response = await fetch(`/api/reports?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar relatório');
      return response.json();
    },
  });

  const handleExportPDF = () => {
    // Implementação futura de exportação PDF
    alert('Funcionalidade de exportação em desenvolvimento');
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios e Indicadores</h1>
          <p className="text-muted-foreground mt-1">Acompanhe os indicadores de saúde da atenção básica</p>
        </div>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 max-w-xs">
          <Label>Período</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-xs">
          <Label>Unidade</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {units.map((unit: any) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{reportData.summary.totalPatients}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">+{reportData.summary.newPatients}</span> novos cadastros
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consultas Realizadas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{reportData.summary.totalConsultations}</div>
                <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prescrições</CardTitle>
                <Pill className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{reportData.summary.totalPrescriptions}</div>
                <p className="text-xs text-muted-foreground mt-1">Medicamentos prescritos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exames Solicitados</CardTitle>
                <FileBarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{reportData.summary.totalExams}</div>
                <p className="text-xs text-muted-foreground mt-1">Solicitações de exames</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Consultas por Tipo</CardTitle>
                <CardDescription>Distribuição dos atendimentos realizados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Consulta</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.consultationsByType.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell className="font-medium">{item.type}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">
                          {((item.count / reportData.summary.totalConsultations) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diagnósticos Mais Frequentes</CardTitle>
                <CardDescription>Top 5 diagnósticos no período</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead className="text-right">Casos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.topDiagnoses.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.diagnosis}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{item.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medicamentos Mais Prescritos</CardTitle>
                <CardDescription>Top 5 medicamentos dispensados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicamento</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.medicationUsage.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.medication}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{item.quantity}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Faixa Etária</CardTitle>
                <CardDescription>Pacientes atendidos por idade</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa Etária</TableHead>
                      <TableHead className="text-right">Pacientes</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.ageDistribution.map((item) => (
                      <TableRow key={item.range}>
                        <TableCell className="font-medium">{item.range}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">
                          {((item.count / reportData.summary.totalPatients) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
