import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, User, Activity, Stethoscope, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const vitalSignsSchema = z.object({
  bloodPressureSystolic: z.coerce.number().min(0).optional(),
  bloodPressureDiastolic: z.coerce.number().min(0).optional(),
  heartRate: z.coerce.number().min(0).optional(),
  temperature: z.coerce.number().min(0).optional(),
  respiratoryRate: z.coerce.number().min(0).optional(),
  oxygenSaturation: z.coerce.number().min(0).max(100).optional(),
  weight: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  abdominalCircumference: z.coerce.number().min(0).optional(),
});

const consultationFormSchema = z.object({
  citizenId: z.string().min(1, "Selecione um paciente"),
  professionalId: z.string().min(1, "Profissional é obrigatório"),
  unitId: z.string().min(1, "Unidade de saúde é obrigatória"),
  consultationDate: z.string().min(1, "Data da consulta é obrigatória"),
  type: z.enum(["consulta_agendada", "consulta_demanda_espontanea", "atendimento_urgencia", "visita_domiciliar"]),
  
  // SOAP
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  
  // Códigos
  ciap2Codes: z.array(z.string()).optional(),
  cid10Codes: z.array(z.string()).optional(),
  
  // Sinais vitais
  vitalSigns: vitalSignsSchema.optional(),
  
  // Campos legados
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
});

type ConsultationFormData = z.infer<typeof consultationFormSchema>;

interface Consultation {
  id: string;
  citizenId: string;
  consultationDate: string;
  type: string;
  chiefComplaint?: string;
  diagnosis?: string;
  citizen?: {
    name: string;
    cns?: string;
  };
  professional?: {
    name: string;
  };
}

// Códigos CIAP-2 mais comuns na Atenção Primária
const CIAP2_CODES = [
  { code: "A03", description: "Febre" },
  { code: "A78", description: "Doença infecciosa NE/outra" },
  { code: "D70", description: "Infecção gastrointestinal" },
  { code: "K86", description: "Hipertensão sem complicação" },
  { code: "K87", description: "Hipertensão complicada" },
  { code: "R05", description: "Tosse" },
  { code: "R74", description: "Infecção respiratória aguda superior" },
  { code: "R78", description: "Bronquite/bronquiolite aguda" },
  { code: "R96", description: "Asma" },
  { code: "T90", description: "Diabetes não-insulino dependente" },
  { code: "T89", description: "Diabetes insulino-dependente" },
  { code: "W85", description: "Gravidez" },
  { code: "L86", description: "Dorsalgia sem irradiação" },
  { code: "P76", description: "Transtorno depressivo" },
  { code: "P74", description: "Transtorno ansioso/estado ansioso" },
];

// Códigos CID-10 mais comuns
const CID10_CODES = [
  { code: "I10", description: "Hipertensão essencial (primária)" },
  { code: "E11", description: "Diabetes mellitus não-insulino-dependente" },
  { code: "E10", description: "Diabetes mellitus insulino-dependente" },
  { code: "J00", description: "Nasofaringite aguda (resfriado comum)" },
  { code: "J06", description: "Infecção aguda das vias aéreas superiores" },
  { code: "J20", description: "Bronquite aguda" },
  { code: "J45", description: "Asma" },
  { code: "A09", description: "Diarreia e gastroenterite de origem infecciosa" },
  { code: "K29", description: "Gastrite e duodenite" },
  { code: "M54", description: "Dorsalgia" },
  { code: "F32", description: "Episódio depressivo" },
  { code: "F41", description: "Outros transtornos ansiosos" },
  { code: "Z00", description: "Exame médico geral" },
  { code: "O00", description: "Gravidez ectópica" },
];

export default function ConsultationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCiap2, setSelectedCiap2] = useState<string[]>([]);
  const [selectedCid10, setSelectedCid10] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: citizens = [] } = useQuery<Array<{ id: string; name: string; cns?: string }>>({
    queryKey: ['/api/citizens'],
  });

  const { data: professionals = [] } = useQuery<Array<{ id: string; name: string; role: string }>>({
    queryKey: ['/api/professionals'],
  });

  const { data: units = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/units'],
  });

  const { data: consultations, isLoading } = useQuery<Consultation[]>({
    queryKey: ['/api/consultations'],
  });

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      citizenId: "",
      professionalId: "",
      unitId: "",
      consultationDate: new Date().toISOString().split('T')[0],
      type: "consulta_agendada",
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      ciap2Codes: [],
      cid10Codes: [],
      vitalSigns: {
        bloodPressureSystolic: undefined,
        bloodPressureDiastolic: undefined,
        heartRate: undefined,
        temperature: undefined,
        respiratoryRate: undefined,
        oxygenSaturation: undefined,
        weight: undefined,
        height: undefined,
        abdominalCircumference: undefined,
      },
      chiefComplaint: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ConsultationFormData) => {
      const payload = {
        ...data,
        consultationDate: new Date(data.consultationDate).toISOString(),
        ciap2Codes: selectedCiap2,
        cid10Codes: selectedCid10,
      };
      return await apiRequest('POST', '/api/consultations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/consultations'] });
      setDialogOpen(false);
      form.reset();
      setSelectedCiap2([]);
      setSelectedCid10([]);
      toast({
        title: "Atendimento registrado",
        description: "A consulta foi registrada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar atendimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConsultationFormData) => {
    createMutation.mutate(data);
  };

  const toggleCiap2 = (code: string) => {
    setSelectedCiap2(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleCid10 = (code: string) => {
    setSelectedCid10(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const getConsultationTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      consulta_agendada: { label: "Agendada", variant: "default" },
      consulta_demanda_espontanea: { label: "Demanda Espontânea", variant: "secondary" },
      atendimento_urgencia: { label: "Urgência", variant: "destructive" },
      visita_domiciliar: { label: "Visita Domiciliar", variant: "outline" },
    };
    const typeInfo = types[type] || { label: type, variant: "default" as const };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atendimentos</h1>
          <p className="text-muted-foreground">
            Registro de consultas e atendimentos (Método SOAP)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-consultation">
              <Plus className="mr-2 h-4 w-4" />
              Novo Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Atendimento</DialogTitle>
              <DialogDescription>
                Preencha os campos do atendimento usando o método SOAP (Subjetivo, Objetivo, Avaliação, Plano)
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Dados Básicos */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="citizenId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paciente *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-citizen">
                              <SelectValue placeholder="Selecione o paciente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {citizens.map((citizen) => (
                              <SelectItem key={citizen.id} value={citizen.id}>
                                {citizen.name} {citizen.cns && `- CNS: ${citizen.cns}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissional *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-professional">
                              <SelectValue placeholder="Selecione o profissional" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {professionals.map((prof) => (
                              <SelectItem key={prof.id} value={prof.id}>
                                {prof.name} - {prof.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade de Saúde *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit">
                              <SelectValue placeholder="Selecione a unidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consultationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Consulta *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-consultation-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Atendimento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-consultation-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="consulta_agendada">Consulta Agendada</SelectItem>
                            <SelectItem value="consulta_demanda_espontanea">Demanda Espontânea</SelectItem>
                            <SelectItem value="atendimento_urgencia">Atendimento de Urgência</SelectItem>
                            <SelectItem value="visita_domiciliar">Visita Domiciliar</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chiefComplaint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Queixa Principal</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Dor de cabeça há 3 dias" {...field} data-testid="input-chief-complaint" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Método SOAP - Abas */}
                <Tabs defaultValue="subjective" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="subjective" data-testid="tab-subjective">
                      <User className="mr-2 h-4 w-4" />
                      Subjetivo (S)
                    </TabsTrigger>
                    <TabsTrigger value="objective" data-testid="tab-objective">
                      <Activity className="mr-2 h-4 w-4" />
                      Objetivo (O)
                    </TabsTrigger>
                    <TabsTrigger value="assessment" data-testid="tab-assessment">
                      <Stethoscope className="mr-2 h-4 w-4" />
                      Avaliação (A)
                    </TabsTrigger>
                    <TabsTrigger value="plan" data-testid="tab-plan">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Plano (P)
                    </TabsTrigger>
                  </TabsList>

                  {/* S - Subjetivo */}
                  <TabsContent value="subjective" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subjective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subjetivo - Anamnese</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva a história clínica do paciente, queixas, sintomas, duração, fatores de melhora/piora..."
                              className="min-h-[200px]"
                              {...field}
                              data-testid="textarea-subjective"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* O - Objetivo */}
                  <TabsContent value="objective" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="objective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivo - Exame Físico</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva os achados do exame físico, inspeção, palpação, ausculta, percussão..."
                              className="min-h-[150px]"
                              {...field}
                              data-testid="textarea-objective"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Sinais Vitais */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <h3 className="font-semibold">Sinais Vitais</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="vitalSigns.bloodPressureSystolic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PA Sistólica (mmHg)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="120" {...field} data-testid="input-bp-systolic" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.bloodPressureDiastolic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PA Diastólica (mmHg)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="80" {...field} data-testid="input-bp-diastolic" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.heartRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Freq. Cardíaca (bpm)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="72" {...field} data-testid="input-heart-rate" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperatura (°C)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" placeholder="36.5" {...field} data-testid="input-temperature" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.respiratoryRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Freq. Respiratória (rpm)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="16" {...field} data-testid="input-respiratory-rate" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.oxygenSaturation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SpO2 (%)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="98" {...field} data-testid="input-oxygen-saturation" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Peso (kg)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" placeholder="70" {...field} data-testid="input-weight" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Altura (cm)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="170" {...field} data-testid="input-height" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitalSigns.abdominalCircumference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Circ. Abdominal (cm)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="90" {...field} data-testid="input-abdominal-circ" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* A - Avaliação */}
                  <TabsContent value="assessment" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="assessment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avaliação - Raciocínio Clínico</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva sua avaliação clínica, hipóteses diagnósticas, diagnóstico diferencial..."
                              className="min-h-[150px]"
                              {...field}
                              data-testid="textarea-assessment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* CIAP-2 */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Códigos CIAP-2</h3>
                        <Badge variant="outline">{selectedCiap2.length} selecionados</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                        {CIAP2_CODES.map((item) => (
                          <Button
                            key={item.code}
                            type="button"
                            variant={selectedCiap2.includes(item.code) ? "default" : "outline"}
                            size="sm"
                            className="justify-start text-left h-auto py-2"
                            onClick={() => toggleCiap2(item.code)}
                            data-testid={`button-ciap2-${item.code}`}
                          >
                            <span className="font-semibold mr-2">{item.code}</span>
                            <span className="text-xs">{item.description}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* CID-10 */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Códigos CID-10</h3>
                        <Badge variant="outline">{selectedCid10.length} selecionados</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                        {CID10_CODES.map((item) => (
                          <Button
                            key={item.code}
                            type="button"
                            variant={selectedCid10.includes(item.code) ? "default" : "outline"}
                            size="sm"
                            className="justify-start text-left h-auto py-2"
                            onClick={() => toggleCid10(item.code)}
                            data-testid={`button-cid10-${item.code}`}
                          >
                            <span className="font-semibold mr-2">{item.code}</span>
                            <span className="text-xs">{item.description}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* P - Plano */}
                  <TabsContent value="plan" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plano - Condutas</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva o plano terapêutico: prescrições, orientações, encaminhamentos, solicitação de exames, retornos..."
                              className="min-h-[200px]"
                              {...field}
                              data-testid="textarea-plan"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações Adicionais</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notas complementares..."
                              className="min-h-[100px]"
                              {...field}
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-save-consultation"
                  >
                    {createMutation.isPending ? "Salvando..." : "Salvar Atendimento"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Listagem de Consultas */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas Registradas</CardTitle>
          <CardDescription>
            Histórico de atendimentos realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : consultations && consultations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Queixa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((consultation) => (
                  <TableRow key={consultation.id} data-testid={`row-consultation-${consultation.id}`}>
                    <TableCell>
                      {format(new Date(consultation.consultationDate), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{consultation.citizen?.name || "N/A"}</div>
                      {consultation.citizen?.cns && (
                        <div className="text-xs text-muted-foreground">CNS: {consultation.citizen.cns}</div>
                      )}
                    </TableCell>
                    <TableCell>{consultation.professional?.name || "N/A"}</TableCell>
                    <TableCell>{getConsultationTypeBadge(consultation.type)}</TableCell>
                    <TableCell className="max-w-xs truncate">{consultation.chiefComplaint || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" data-testid={`button-view-${consultation.id}`}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma consulta registrada</p>
              <p className="text-sm">Clique em "Novo Atendimento" para registrar a primeira consulta</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
