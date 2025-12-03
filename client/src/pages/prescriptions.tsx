import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileDown, Search, Pill, CalendarIcon, Plus, AlertCircle, CheckCircle, Package, Store, Lightbulb, AlertTriangle, Stethoscope } from "lucide-react";
import { useState, useEffect } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateLogoSvg } from "@/lib/logo-svg";

interface CidSuggestion {
  cid: string;
  description: string;
  medications: {
    renameId: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    indication: string;
  }[];
}

const CID_MEDICATION_MAP: CidSuggestion[] = [
  {
    cid: "J00",
    description: "Resfriado comum (nasofaringite aguda)",
    medications: [
      { renameId: "", name: "Paracetamol 500mg", dosage: "500mg", frequency: "6/6 horas", duration: "5 dias", indication: "Alívio de dor e febre" },
      { renameId: "", name: "Dipirona 500mg", dosage: "500mg", frequency: "6/6 horas", duration: "5 dias", indication: "Alívio de dor e febre" },
      { renameId: "", name: "Loratadina 10mg", dosage: "10mg", frequency: "1x ao dia", duration: "7 dias", indication: "Controle de sintomas alérgicos" },
    ]
  },
  {
    cid: "J06",
    description: "Infecções agudas das vias aéreas superiores",
    medications: [
      { renameId: "", name: "Amoxicilina 500mg", dosage: "500mg", frequency: "8/8 horas", duration: "7 dias", indication: "Antibiótico de primeira linha" },
      { renameId: "", name: "Ibuprofeno 400mg", dosage: "400mg", frequency: "8/8 horas", duration: "5 dias", indication: "Anti-inflamatório" },
      { renameId: "", name: "Prednisolona 20mg", dosage: "20mg", frequency: "1x ao dia", duration: "5 dias", indication: "Redução de inflamação" },
    ]
  },
  {
    cid: "I10",
    description: "Hipertensão essencial (primária)",
    medications: [
      { renameId: "", name: "Losartana 50mg", dosage: "50mg", frequency: "1x ao dia", duration: "Uso contínuo", indication: "Controle pressórico" },
      { renameId: "", name: "Hidroclorotiazida 25mg", dosage: "25mg", frequency: "1x ao dia", duration: "Uso contínuo", indication: "Diurético" },
      { renameId: "", name: "Anlodipino 5mg", dosage: "5mg", frequency: "1x ao dia", duration: "Uso contínuo", indication: "Vasodilatador" },
    ]
  },
  {
    cid: "E11",
    description: "Diabetes mellitus tipo 2",
    medications: [
      { renameId: "", name: "Metformina 850mg", dosage: "850mg", frequency: "12/12 horas", duration: "Uso contínuo", indication: "Controle glicêmico" },
      { renameId: "", name: "Glibenclamida 5mg", dosage: "5mg", frequency: "1x ao dia", duration: "Uso contínuo", indication: "Hipoglicemiante" },
    ]
  },
  {
    cid: "K29",
    description: "Gastrite e duodenite",
    medications: [
      { renameId: "", name: "Omeprazol 20mg", dosage: "20mg", frequency: "1x ao dia (jejum)", duration: "30 dias", indication: "Proteção gástrica" },
      { renameId: "", name: "Ranitidina 150mg", dosage: "150mg", frequency: "12/12 horas", duration: "14 dias", indication: "Redução de acidez" },
    ]
  },
  {
    cid: "M54",
    description: "Dorsalgia (dor nas costas)",
    medications: [
      { renameId: "", name: "Ibuprofeno 600mg", dosage: "600mg", frequency: "8/8 horas", duration: "7 dias", indication: "Anti-inflamatório" },
      { renameId: "", name: "Ciclobenzaprina 10mg", dosage: "10mg", frequency: "12/12 horas", duration: "7 dias", indication: "Relaxante muscular" },
      { renameId: "", name: "Paracetamol 750mg", dosage: "750mg", frequency: "6/6 horas", duration: "7 dias", indication: "Analgésico" },
    ]
  },
];

export default function Prescriptions() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCitizen, setSelectedCitizen] = useState("all");
  const [selectedProfessional, setSelectedProfessional] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newPrescription, setNewPrescription] = useState({
    citizenId: "",
    professionalId: "",
    medication: "",
    genericName: "",
    dosage: "",
    dosageUnit: "mg",
    frequency: "",
    frequencyUnit: "daily",
    duration: "",
    durationDays: 0,
    quantity: 0,
    administrationRoute: "oral",
    instructions: "",
    specialInstructions: "",
    useContinuous: false,
    isControlled: false,
    controlType: "",
    requiresSpecialForm: false,
    dispensationType: "farmacia_publica" as "farmacia_publica" | "farmacia_privada",
    cidCode: "",
    renameId: "",
  });

  const [cidSearch, setCidSearch] = useState("");
  const [selectedCidSuggestion, setSelectedCidSuggestion] = useState<CidSuggestion | null>(null);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: citizens = [] } = useQuery<any[]>({
    queryKey: ["/api/citizens"],
  });

  const { data: professionals = [] } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
  });

  const { data: renameCatalog = [] } = useQuery<any[]>({
    queryKey: ["/api/rename-catalog"],
  });

  const { data: medicationStock = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/stock"],
  });

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

  const createPrescriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/prescriptions", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({
        title: "Prescrição criada",
        description: "A prescrição foi registrada com sucesso.",
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar prescrição",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentUser && professionals.length > 0) {
      const matchingProfessional = professionals.find(
        (p: any) => p.cpf === currentUser.cpf || p.email === currentUser.email
      );
      if (matchingProfessional) {
        setNewPrescription(prev => ({ ...prev, professionalId: matchingProfessional.id }));
      }
    }
  }, [currentUser, professionals]);

  const resetForm = () => {
    setNewPrescription({
      citizenId: "",
      professionalId: currentUser ? professionals.find((p: any) => p.cpf === currentUser.cpf)?.id || "" : "",
      medication: "",
      genericName: "",
      dosage: "",
      dosageUnit: "mg",
      frequency: "",
      frequencyUnit: "daily",
      duration: "",
      durationDays: 0,
      quantity: 0,
      administrationRoute: "oral",
      instructions: "",
      specialInstructions: "",
      useContinuous: false,
      isControlled: false,
      controlType: "",
      requiresSpecialForm: false,
      dispensationType: "farmacia_publica",
      cidCode: "",
      renameId: "",
    });
    setCidSearch("");
    setSelectedCidSuggestion(null);
  };

  const filteredCidSuggestions = cidSearch.length >= 2
    ? CID_MEDICATION_MAP.filter(
        cid => cid.cid.toLowerCase().includes(cidSearch.toLowerCase()) ||
               cid.description.toLowerCase().includes(cidSearch.toLowerCase())
      )
    : [];

  const checkStockAvailability = (medicationName: string): { available: boolean; quantity: number } => {
    const stockItem = medicationStock.find(
      (item: any) => item.name?.toLowerCase().includes(medicationName.toLowerCase()) ||
                     item.genericName?.toLowerCase().includes(medicationName.toLowerCase())
    );
    if (stockItem) {
      return { available: stockItem.currentQuantity > 0, quantity: stockItem.currentQuantity };
    }
    return { available: false, quantity: 0 };
  };

  const applySuggestion = (suggestion: CidSuggestion["medications"][0]) => {
    const stockStatus = checkStockAvailability(suggestion.name);
    setNewPrescription(prev => ({
      ...prev,
      medication: suggestion.name,
      dosage: suggestion.dosage,
      frequency: suggestion.frequency,
      duration: suggestion.duration,
      instructions: suggestion.indication,
      dispensationType: stockStatus.available ? "farmacia_publica" : "farmacia_privada",
    }));
  };

  const handleSubmit = () => {
    if (!newPrescription.citizenId || !newPrescription.professionalId || !newPrescription.medication) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha paciente, profissional e medicamento.",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...newPrescription,
      unitId: currentUser?.unitId,
    };

    createPrescriptionMutation.mutate(submitData);
  };

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

  const generatePrescriptionPDF = (prescription: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const logoSvg = generateLogoSvg({ width: 32, height: 32, variant: 'color' });
    const logoDataUri = `data:image/svg+xml;base64,${btoa(logoSvg)}`;
    doc.addImage(logoDataUri, 'SVG', 15, 10, 16, 16);
    
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

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, 42, pageWidth - 15, 42);

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

    currentY += 3;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PRESCRIÇÃO MEDICAMENTOSA", 15, currentY);
    currentY += 5;

    const tableData = [];
    tableData.push(["Medicamento", prescription.medication || "-"]);
    if (prescription.dosage) tableData.push(["Dosagem", prescription.dosage]);
    if (prescription.frequency) tableData.push(["Frequência", prescription.frequency]);
    if (prescription.duration) tableData.push(["Duração do Tratamento", prescription.duration]);
    if (prescription.quantity) tableData.push(["Quantidade a Dispensar", String(prescription.quantity)]);
    if (prescription.instructions) tableData.push(["Instruções de Uso", prescription.instructions]);

    autoTable(doc, {
      startY: currentY,
      head: [],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 'auto' } },
      margin: { left: 15, right: 15 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(pageWidth - 95, finalY, pageWidth - 15, finalY);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(prescription.professional?.name || "Profissional não informado", pageWidth / 2, finalY + 5, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (prescription.professional?.councilType && prescription.professional?.councilNumber) {
      doc.text(
        `${prescription.professional.councilType}: ${prescription.professional.councilNumber}`,
        pageWidth / 2,
        finalY + 10,
        { align: "center" }
      );
    }

    const footerY = pageHeight - 25;
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

    const fileName = `receituario_${prescription.citizen?.name?.replace(/\s+/g, "_")}_${format(new Date(prescription.createdAt), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
  };

  const stockStatus = newPrescription.medication ? checkStockAvailability(newPrescription.medication) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Pill className="h-8 w-8" />
            Prescrições Médicas
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie receituários médicos
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-new-prescription">
              <Plus className="h-5 w-5 mr-2" />
              Nova Prescrição
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Nova Prescrição Médica
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da prescrição. Sugestões de medicamentos baseadas no CID são exibidas automaticamente.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados" data-testid="tab-dados">Dados Básicos</TabsTrigger>
                <TabsTrigger value="medicamento" data-testid="tab-medicamento">Medicamento</TabsTrigger>
                <TabsTrigger value="sugestoes" data-testid="tab-sugestoes">
                  <Lightbulb className="h-4 w-4 mr-1" />
                  Sugestões por CID
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient">Paciente *</Label>
                    <Combobox
                      value={newPrescription.citizenId}
                      onValueChange={(value) => setNewPrescription(prev => ({ ...prev, citizenId: value }))}
                      options={citizens.map((c: any) => ({ value: c.id, label: `${c.name} - CPF: ${c.cpf || 'N/I'}` }))}
                      placeholder="Selecione o paciente"
                      searchPlaceholder="Buscar paciente..."
                      emptyMessage="Nenhum paciente encontrado."
                      data-testid="select-patient"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="professional">Profissional Prescritor *</Label>
                    <Combobox
                      value={newPrescription.professionalId}
                      onValueChange={(value) => setNewPrescription(prev => ({ ...prev, professionalId: value }))}
                      options={professionals.map((p: any) => ({ 
                        value: p.id, 
                        label: `${p.name} - ${p.councilType} ${p.councilNumber}` 
                      }))}
                      placeholder="Selecione o profissional"
                      searchPlaceholder="Buscar profissional..."
                      emptyMessage="Nenhum profissional encontrado."
                      data-testid="select-professional"
                    />
                    {currentUser && (
                      <p className="text-xs text-muted-foreground">
                        Logado como: {currentUser.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cid">Código CID (opcional)</Label>
                  <Input
                    id="cid"
                    placeholder="Ex: J00, I10, E11..."
                    value={newPrescription.cidCode}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, cidCode: e.target.value.toUpperCase() }))}
                    data-testid="input-cid"
                  />
                  <p className="text-xs text-muted-foreground">
                    O código CID ajuda a sugerir medicamentos apropriados
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="medicamento" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medication">Medicamento *</Label>
                    <Combobox
                      value={newPrescription.medication}
                      onValueChange={(value) => {
                        const med = renameCatalog.find((m: any) => m.commercialName === value);
                        setNewPrescription(prev => ({
                          ...prev,
                          medication: value,
                          genericName: med?.activeIngredient || "",
                          renameId: med?.id || "",
                          isControlled: med?.isControlled || false,
                          controlType: med?.controlType || "",
                        }));
                      }}
                      options={renameCatalog.map((m: any) => ({
                        value: m.commercialName,
                        label: `${m.commercialName} (${m.activeIngredient}) - ${m.presentation}`
                      }))}
                      placeholder="Buscar no catálogo RENAME"
                      searchPlaceholder="Digite o nome do medicamento..."
                      emptyMessage="Medicamento não encontrado no RENAME."
                      data-testid="select-medication"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosagem *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dosage"
                        placeholder="Ex: 500"
                        value={newPrescription.dosage}
                        onChange={(e) => setNewPrescription(prev => ({ ...prev, dosage: e.target.value }))}
                        data-testid="input-dosage"
                        className="flex-1"
                      />
                      <Select
                        value={newPrescription.dosageUnit}
                        onValueChange={(value) => setNewPrescription(prev => ({ ...prev, dosageUnit: value }))}
                      >
                        <SelectTrigger className="w-24" data-testid="select-dosage-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="UI">UI</SelectItem>
                          <SelectItem value="mcg">mcg</SelectItem>
                          <SelectItem value="comprimido">comp</SelectItem>
                          <SelectItem value="gota">gotas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequência *</Label>
                    <Input
                      id="frequency"
                      placeholder="Ex: 8/8 horas"
                      value={newPrescription.frequency}
                      onChange={(e) => setNewPrescription(prev => ({ ...prev, frequency: e.target.value }))}
                      data-testid="input-frequency"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração *</Label>
                    <Input
                      id="duration"
                      placeholder="Ex: 7 dias"
                      value={newPrescription.duration}
                      onChange={(e) => setNewPrescription(prev => ({ ...prev, duration: e.target.value }))}
                      data-testid="input-duration"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Ex: 21"
                      value={newPrescription.quantity || ""}
                      onChange={(e) => setNewPrescription(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      data-testid="input-quantity"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="route">Via de Administração</Label>
                  <Select
                    value={newPrescription.administrationRoute}
                    onValueChange={(value) => setNewPrescription(prev => ({ ...prev, administrationRoute: value }))}
                  >
                    <SelectTrigger data-testid="select-route">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oral">Oral</SelectItem>
                      <SelectItem value="topical">Tópica</SelectItem>
                      <SelectItem value="injectable">Injetável</SelectItem>
                      <SelectItem value="inhalation">Inalatória</SelectItem>
                      <SelectItem value="sublingual">Sublingual</SelectItem>
                      <SelectItem value="rectal">Retal</SelectItem>
                      <SelectItem value="ophthalmic">Oftálmica</SelectItem>
                      <SelectItem value="nasal">Nasal</SelectItem>
                      <SelectItem value="auricular">Auricular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instruções de Uso</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Instruções adicionais para o paciente..."
                    value={newPrescription.instructions}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, instructions: e.target.value }))}
                    data-testid="textarea-instructions"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="continuous"
                    checked={newPrescription.useContinuous}
                    onCheckedChange={(checked) => setNewPrescription(prev => ({ ...prev, useContinuous: checked }))}
                    data-testid="switch-continuous"
                  />
                  <Label htmlFor="continuous">Uso Contínuo</Label>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Disponibilidade e Dispensação</Label>
                  
                  {stockStatus && (
                    <div className={cn(
                      "p-4 rounded-lg border",
                      stockStatus.available ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
                    )}>
                      <div className="flex items-center gap-2">
                        {stockStatus.available ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <span className="font-medium text-green-800 dark:text-green-200">
                              Disponível na Farmácia Municipal
                            </span>
                            <Badge variant="secondary">{stockStatus.quantity} unidades</Badge>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <span className="font-medium text-amber-800 dark:text-amber-200">
                              Indisponível na Farmácia Municipal
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        newPrescription.dispensationType === "farmacia_publica"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/50"
                      )}
                      onClick={() => setNewPrescription(prev => ({ ...prev, dispensationType: "farmacia_publica" }))}
                      data-testid="option-farmacia-publica"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-semibold">Farmácia Municipal</p>
                          <p className="text-sm text-muted-foreground">
                            Dispensação gratuita pelo SUS
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        newPrescription.dispensationType === "farmacia_privada"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/50"
                      )}
                      onClick={() => setNewPrescription(prev => ({ ...prev, dispensationType: "farmacia_privada" }))}
                      data-testid="option-farmacia-privada"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">Farmácia Privada</p>
                          <p className="text-sm text-muted-foreground">
                            Compra em rede particular
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sugestoes" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="cid-search">Buscar por CID ou Diagnóstico</Label>
                  <Input
                    id="cid-search"
                    placeholder="Digite o código CID ou descrição..."
                    value={cidSearch}
                    onChange={(e) => setCidSearch(e.target.value)}
                    data-testid="input-cid-search"
                  />
                </div>

                {cidSearch.length >= 2 && (
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    {filteredCidSuggestions.length > 0 ? (
                      <div className="space-y-4">
                        {filteredCidSuggestions.map((cid) => (
                          <Card key={cid.cid} className="hover-elevate">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Badge variant="outline">{cid.cid}</Badge>
                                    {cid.description}
                                  </CardTitle>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCidSuggestion(cid);
                                    setNewPrescription(prev => ({ ...prev, cidCode: cid.cid }));
                                  }}
                                  data-testid={`button-select-cid-${cid.cid}`}
                                >
                                  Selecionar
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-3">Medicamentos sugeridos:</p>
                              <div className="space-y-2">
                                {cid.medications.map((med, idx) => {
                                  const stock = checkStockAvailability(med.name);
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                                      onClick={() => applySuggestion(med)}
                                      data-testid={`suggestion-${cid.cid}-${idx}`}
                                    >
                                      <div className="flex-1">
                                        <p className="font-medium">{med.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {med.dosage} - {med.frequency} por {med.duration}
                                        </p>
                                        <p className="text-xs text-muted-foreground italic">
                                          {med.indication}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {stock.available ? (
                                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            {stock.quantity} un.
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Indisponível
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Nenhuma sugestão encontrada para "{cidSearch}"
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Tente outro código CID ou digite manualmente
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                )}

                {!cidSearch && (
                  <div className="text-center py-12">
                    <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Digite um código CID para ver sugestões de medicamentos
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Exemplos: J00 (Resfriado), I10 (Hipertensão), E11 (Diabetes)
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createPrescriptionMutation.isPending}
                data-testid="button-submit-prescription"
              >
                {createPrescriptionMutation.isPending ? "Salvando..." : "Criar Prescrição"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
                data-testid="button-create-first-prescription"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira prescrição
              </Button>
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
                    <TableHead>Dispensação</TableHead>
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
                      <TableCell>
                        <Badge variant={prescription.dispensationType === "farmacia_publica" ? "default" : "secondary"}>
                          {prescription.dispensationType === "farmacia_publica" ? "Farmácia Municipal" : "Privada"}
                        </Badge>
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
