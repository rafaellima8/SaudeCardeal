import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileDown, Search, Pill, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateLogoSvg } from "@/lib/logo-svg";

export default function Prescriptions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCitizen, setSelectedCitizen] = useState("all");
  const [selectedProfessional, setSelectedProfessional] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Query de todos os cidadãos para filtro
  const { data: citizens = [] } = useQuery<any[]>({
    queryKey: ["/api/citizens"],
  });

  // Query de todos os profissionais para filtro
  const { data: professionals = [] } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
  });

  // Query de prescrições com filtros
  const { data: prescriptions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/prescriptions", selectedCitizen, selectedProfessional, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCitizen && selectedCitizen !== "all") {
        params.append("citizenId", selectedCitizen);
      }
      if (selectedProfessional && selectedProfessional !== "all") {
        params.append("professionalId", selectedProfessional);
      }
      if (dateFrom) {
        params.append("startDate", startOfDay(dateFrom).toISOString());
      }
      if (dateTo) {
        params.append("endDate", endOfDay(dateTo).toISOString());
      }
      const response = await fetch(`/api/prescriptions?${params}`);
      if (!response.ok) throw new Error("Erro ao carregar prescrições");
      return response.json();
    },
  });

  // Filtrar prescrições localmente apenas por termo de busca (período já vem filtrado do backend)
  const filteredPrescriptions = prescriptions.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        p.citizen?.name?.toLowerCase().includes(term) ||
        p.medication?.toLowerCase().includes(term) ||
        p.professional?.name?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Gerar PDF do receituário
  const generatePrescriptionPDF = (prescription: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ========== LOGO + CABEÇALHO INSTITUCIONAL ==========
    // Logo SVG no canto superior esquerdo
    const logoSvg = generateLogoSvg({ width: 32, height: 32, variant: 'color' });
    const logoDataUri = `data:image/svg+xml;base64,${btoa(logoSvg)}`;
    doc.addImage(logoDataUri, 'SVG', 15, 10, 16, 16);
    
    // Cabeçalho alinhado à direita do logo
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PREFEITURA MUNICIPAL DE CARDEAL DA SILVA", pageWidth / 2, 14, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Secretaria Municipal de Saúde", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(9);
    doc.text("Estado da Bahia - CNPJ: 14.105.349/0001-02", pageWidth / 2, 26, { align: "center" });
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("MuniSaúde Integrado - Sistema de Gestão em Saúde", pageWidth / 2, 30, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RECEITUÁRIO MÉDICO", pageWidth / 2, 38, { align: "center" });

    // Linha separadora
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, 42, pageWidth - 15, 42);

    // ========== DADOS DO PACIENTE ==========
    let currentY = 50;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("IDENTIFICAÇÃO DO PACIENTE", 15, currentY);
    currentY += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    doc.text(`Nome: ${prescription.citizen?.name || "Não informado"}`, 15, currentY);
    currentY += 5;
    
    if (prescription.citizen?.cns) {
      doc.text(`Cartão Nacional de Saúde (CNS): ${prescription.citizen.cns}`, 15, currentY);
      currentY += 5;
    }
    
    if (prescription.citizen?.birthDate) {
      const birthDate = new Date(prescription.citizen.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      doc.text(`Data de Nascimento: ${format(birthDate, "dd/MM/yyyy", { locale: ptBR })} - Idade: ${age} anos`, 15, currentY);
      currentY += 5;
    }

    if (prescription.consultation?.consultationDate) {
      doc.text(`Data da Consulta: ${format(new Date(prescription.consultation.consultationDate), "dd/MM/yyyy", { locale: ptBR })}`, 15, currentY);
      currentY += 8;
    } else {
      currentY += 3;
    }

    // ========== PRESCRIÇÃO (usando autoTable) ==========
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PRESCRIÇÃO MEDICAMENTOSA", 15, currentY);
    currentY += 5;

    // Preparar dados da tabela
    const tableData = [];
    tableData.push(["Medicamento", prescription.medication || "-"]);
    if (prescription.dosage) tableData.push(["Dosagem", prescription.dosage]);
    if (prescription.frequency) tableData.push(["Frequência", prescription.frequency]);
    if (prescription.duration) tableData.push(["Duração do Tratamento", prescription.duration]);
    if (prescription.quantity) tableData.push(["Quantidade a Dispensar", prescription.quantity]);
    if (prescription.instructions) tableData.push(["Instruções de Uso", prescription.instructions]);

    autoTable(doc, {
      startY: currentY,
      head: [],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 15, right: 15 },
    });

    // ========== ASSINATURA DO PROFISSIONAL ==========
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(pageWidth - 95, finalY, pageWidth - 15, finalY);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(prescription.professional?.name || "Profissional não informado", pageWidth / 2, finalY + 5, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (prescription.professional?.registrationType && prescription.professional?.registrationNumber) {
      doc.text(
        `${prescription.professional.registrationType}: ${prescription.professional.registrationNumber}`,
        pageWidth / 2,
        finalY + 10,
        { align: "center" }
      );
    }
    
    if (prescription.professional?.role) {
      doc.text(
        prescription.professional.role,
        pageWidth / 2,
        finalY + 14,
        { align: "center" }
      );
    }

    // ========== RODAPÉ INSTITUCIONAL ==========
    const footerY = pageHeight - 25;
    
    // Linha separadora do rodapé
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Prefeitura Municipal de Cardeal da Silva - Secretaria Municipal de Saúde",
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
    doc.text(
      "Endereço: Praça da Independência, s/n, Centro - Cardeal da Silva/BA - CEP: 48.390-000",
      pageWidth / 2,
      footerY + 4,
      { align: "center" }
    );
    doc.text(
      `Documento emitido eletronicamente em ${format(new Date(prescription.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      pageWidth / 2,
      footerY + 8,
      { align: "center" }
    );

    // Salvar PDF
    const fileName = `receituario_${prescription.citizen?.name?.replace(/\s+/g, "_")}_${format(new Date(prescription.createdAt), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Pill className="h-8 w-8" />
            Histórico de Prescrições
          </h1>
          <p className="text-muted-foreground mt-1">
            Consulte e imprima receituários médicos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busque prescrições por paciente ou medicamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  data-testid="input-search-prescription"
                  placeholder="Paciente ou medicamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="citizen">Paciente</Label>
              <Combobox
                value={selectedCitizen}
                onValueChange={setSelectedCitizen}
                options={[
                  { value: "all", label: "Todos" },
                  ...citizens.map((c: any) => ({ value: c.id, label: c.name }))
                ]}
                placeholder="Todos"
                searchPlaceholder="Buscar paciente..."
                emptyMessage="Nenhum paciente encontrado."
                data-testid="select-citizen-filter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="professional">Profissional</Label>
              <Combobox
                value={selectedProfessional}
                onValueChange={setSelectedProfessional}
                options={[
                  { value: "all", label: "Todos" },
                  ...professionals.map((p: any) => ({ value: p.id, label: p.name }))
                ]}
                placeholder="Todos"
                searchPlaceholder="Buscar profissional..."
                emptyMessage="Nenhum profissional encontrado."
                data-testid="select-professional-filter"
              />
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-testid="button-date-range-filter"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom || dateTo ? (
                      `${dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "..."} - ${dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "..."}`
                    ) : (
                      "Selecione o período"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Data inicial</Label>
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        data-testid="calendar-date-from"
                        locale={ptBR}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data final</Label>
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        data-testid="calendar-date-to"
                        locale={ptBR}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                      data-testid="button-clear-dates"
                      className="w-full"
                    >
                      Limpar datas
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prescrições Registradas</CardTitle>
          <CardDescription>
            {filteredPrescriptions.length} prescrição(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedCitizen || searchTerm
                  ? "Nenhuma prescrição encontrada com os filtros aplicados"
                  : "Nenhuma prescrição registrada"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Medicamento</TableHead>
                    <TableHead>Dosagem</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.map((prescription) => (
                    <TableRow key={prescription.id} data-testid={`row-prescription-${prescription.id}`}>
                      <TableCell>
                        {format(new Date(prescription.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {prescription.citizen?.name || "Não informado"}
                      </TableCell>
                      <TableCell>{prescription.medication}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {prescription.dosage} - {prescription.frequency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prescription.professional?.name || "Não informado"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-download-pdf-${prescription.id}`}
                          onClick={() => generatePrescriptionPDF(prescription)}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
