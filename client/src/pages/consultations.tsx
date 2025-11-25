import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, User, Activity, Stethoscope, ClipboardList, Pill, Trash2, Edit, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AIAssistantButton } from "@/components/AIAssistantButton";
import { 
  useAIDiagnosis, 
  useAIGeneratePlan, 
  useAIDrugInteractions, 
  useAIValidatePrescription,
  type DiagnosisSuggestion,
  type DrugInteraction,
  type DosageAlert
} from "@/hooks/use-ai-assistant";

// Tipo para prescrição temporária (antes de salvar)
interface PrescriptionDraft {
  id: string; // ID temporário
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

// Schema de validação para prescrição
const prescriptionSchema = z.object({
  medication: z.string().min(1, "Nome do medicamento é obrigatório"),
  dosage: z.string().min(1, "Posologia é obrigatória"),
  frequency: z.string().min(1, "Frequência é obrigatória"),
  duration: z.string().min(1, "Duração do tratamento é obrigatória"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
  instructions: z.string().optional(),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

// Componente de Dialog para Adicionar/Editar Prescrição
function PrescriptionDialog({
  open,
  onOpenChange,
  prescription,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: PrescriptionDraft | null;
  onSave: (data: Omit<PrescriptionDraft, 'id'>) => void;
}) {
  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      medication: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: 1,
      instructions: "",
    },
  });

  // Atualizar valores do form quando a prescrição ou dialog mudar (useEffect evita re-renders)
  useEffect(() => {
    if (open) {
      form.reset({
        medication: prescription?.medication || "",
        dosage: prescription?.dosage || "",
        frequency: prescription?.frequency || "",
        duration: prescription?.duration || "",
        quantity: prescription?.quantity || 1,
        instructions: prescription?.instructions || "",
      });
    }
  }, [prescription, open, form]);

  const onSubmit = (data: PrescriptionFormData) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {prescription ? "Editar Prescrição" : "Nova Prescrição"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da prescrição médica
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="medication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicamento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Losartana Potássica 50mg"
                      {...field}
                      data-testid="input-medication"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posologia</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 1 comprimido"
                        {...field}
                        data-testid="input-dosage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 1x ao dia, 8/8h, 2x ao dia"
                        {...field}
                        data-testid="input-frequency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração do Tratamento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 30 dias, Uso contínuo"
                        {...field}
                        data-testid="input-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Ex: 30"
                        {...field}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções Adicionais (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Tomar em jejum, Evitar exposição ao sol, etc."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-instructions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                data-testid="button-cancel-prescription"
              >
                Cancelar
              </Button>
              <Button type="submit" data-testid="button-save-prescription">
                {prescription ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
  const [prescriptions, setPrescriptions] = useState<PrescriptionDraft[]>([]);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<PrescriptionDraft | null>(null);
  const [deletingPrescription, setDeletingPrescription] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [aiInteractions, setAiInteractions] = useState<DrugInteraction[]>([]);
  const [aiAlerts, setAiAlerts] = useState<DosageAlert[]>([]);
  const { toast } = useToast();
  
  const diagnosisMutation = useAIDiagnosis();
  const generatePlanMutation = useAIGeneratePlan();
  const interactionsMutation = useAIDrugInteractions();
  const validatePrescriptionMutation = useAIValidatePrescription();

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
      // Preparar payload com consulta + prescrições (endpoint transacional)
      const payload = {
        consultation: {
          ...data,
          consultationDate: new Date(data.consultationDate).toISOString(),
          ciap2Codes: selectedCiap2,
          cid10Codes: selectedCid10,
        },
        prescriptions: prescriptions.map(p => ({
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          quantity: p.quantity,
          instructions: p.instructions || "",
        })),
      };

      // Chamar endpoint transacional que garante atomicidade
      const result: any = await apiRequest('POST', '/api/consultations-with-prescriptions', payload);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/consultations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      setDialogOpen(false);
      form.reset();
      setSelectedCiap2([]);
      setSelectedCid10([]);
      setPrescriptions([]);
      
      const prescriptionCount = result.prescriptions?.length || 0;
      toast({
        title: "Atendimento registrado",
        description: prescriptionCount > 0 
          ? `Consulta salva com sucesso com ${prescriptionCount} prescrição(ões).`
          : "Consulta salva com sucesso.",
      });
    },
    onError: (error: Error) => {
      // Não limpar prescrições em caso de erro - permitir retry
      toast({
        title: "Erro ao registrar atendimento",
        description: error.message || "Ocorreu um erro ao salvar. Por favor, tente novamente.",
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

  const addPrescription = (prescription: Omit<PrescriptionDraft, 'id'>) => {
    const newPrescription: PrescriptionDraft = {
      ...prescription,
      id: `temp-${Date.now()}-${Math.random()}`, // ID temporário
    };
    setPrescriptions(prev => [...prev, newPrescription]);
    setPrescriptionDialogOpen(false);
    setEditingPrescription(null);
    toast({
      title: "Prescrição adicionada",
      description: "A prescrição será salva junto com o atendimento.",
    });
  };

  const updatePrescription = (id: string, updated: Omit<PrescriptionDraft, 'id'>) => {
    setPrescriptions(prev =>
      prev.map(p => (p.id === id ? { ...updated, id } : p))
    );
    setPrescriptionDialogOpen(false);
    setEditingPrescription(null);
    toast({
      title: "Prescrição atualizada",
      description: "As alterações foram salvas.",
    });
  };

  const deletePrescription = (id: string) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
    setDeletingPrescription(null);
    toast({
      title: "Prescrição removida",
      description: "A prescrição foi removida da lista.",
    });
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
                        <FormControl>
                          <Combobox
                            value={field.value}
                            onValueChange={field.onChange}
                            options={citizens.map(citizen => ({
                              value: citizen.id,
                              label: `${citizen.name}${citizen.cns ? ` - CNS: ${citizen.cns}` : ''}`
                            }))}
                            placeholder="Selecione o paciente"
                            searchPlaceholder="Buscar paciente..."
                            emptyMessage="Nenhum paciente encontrado"
                            data-testid="select-citizen"
                          />
                        </FormControl>
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
                        <FormControl>
                          <Combobox
                            value={field.value}
                            onValueChange={field.onChange}
                            options={professionals.map(prof => ({
                              value: prof.id,
                              label: `${prof.name} - ${prof.role}`
                            }))}
                            placeholder="Selecione o profissional"
                            searchPlaceholder="Buscar profissional..."
                            emptyMessage="Nenhum profissional encontrado"
                            data-testid="select-professional"
                          />
                        </FormControl>
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
                        <FormControl>
                          <Combobox
                            value={field.value}
                            onValueChange={field.onChange}
                            options={units.map(unit => ({
                              value: unit.id,
                              label: unit.name
                            }))}
                            placeholder="Selecione a unidade"
                            searchPlaceholder="Buscar unidade..."
                            emptyMessage="Nenhuma unidade encontrada"
                            data-testid="select-unit"
                          />
                        </FormControl>
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

                    {/* Botão de IA para Sugestão de Diagnósticos */}
                    <div className="flex items-center gap-2">
                      <AIAssistantButton
                        onClick={() => {
                          const subjective = form.getValues("subjective");
                          const objective = form.getValues("objective");
                          const vitalSigns = form.getValues("vitalSigns");
                          
                          if (!subjective || subjective.trim().length < 10) {
                            toast({
                              variant: "destructive",
                              title: "Dados Insuficientes",
                              description: "O campo Subjetivo precisa ter pelo menos 10 caracteres.",
                            });
                            return;
                          }

                          diagnosisMutation.mutate(
                            {
                              subjective,
                              objective: objective || undefined,
                              vitalSigns: {
                                heartRate: vitalSigns?.heartRate ? Number(vitalSigns.heartRate) : undefined,
                                temperature: vitalSigns?.temperature ? Number(vitalSigns.temperature) : undefined,
                                respiratoryRate: vitalSigns?.respiratoryRate ? Number(vitalSigns.respiratoryRate) : undefined,
                                oxygenSaturation: vitalSigns?.oxygenSaturation ? Number(vitalSigns.oxygenSaturation) : undefined,
                                weight: vitalSigns?.weight ? Number(vitalSigns.weight) : undefined,
                                height: vitalSigns?.height ? Number(vitalSigns.height) : undefined,
                              },
                            },
                            {
                              onSuccess: (data) => {
                                if (data.success && data.suggestions) {
                                  setAiSuggestions(data.suggestions);
                                  toast({
                                    title: "Sugestões Geradas",
                                    description: `${data.suggestions.length} hipótese(s) diagnóstica(s) sugerida(s) pela IA.`,
                                  });
                                }
                              },
                              onError: (error: Error) => {
                                toast({
                                  variant: "destructive",
                                  title: "Erro na IA",
                                  description: error.message || "Não foi possível gerar sugestões.",
                                });
                              },
                            }
                          );
                        }}
                        loading={diagnosisMutation.isPending}
                        data-testid="button-ai-diagnose"
                      >
                        Sugerir Diagnósticos com IA
                      </AIAssistantButton>
                      {diagnosisMutation.isPending && (
                        <span className="text-sm text-muted-foreground">Analisando dados clínicos...</span>
                      )}
                    </div>

                    {/* Exibição das Sugestões de IA */}
                    {aiSuggestions.length > 0 && (
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold">Sugestões de Diagnóstico (IA)</h3>
                        </div>
                        <div className="space-y-2">
                          {aiSuggestions.map((suggestion, idx) => {
                            const alreadyApplied = selectedCiap2.includes(suggestion.ciap2Code) && selectedCid10.includes(suggestion.cid10Code);
                            return (
                              <Card key={idx} className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={
                                        suggestion.confidence === "high" ? "default" :
                                        suggestion.confidence === "medium" ? "secondary" : "outline"
                                      }>
                                        {suggestion.confidence === "high" ? "Alta" : 
                                         suggestion.confidence === "medium" ? "Média" : "Baixa"}
                                      </Badge>
                                      <span className="font-semibold text-sm">
                                        {suggestion.ciap2Code} / {suggestion.cid10Code}
                                      </span>
                                    </div>
                                    <p className="text-sm">{suggestion.ciap2Description}</p>
                                    <p className="text-xs text-muted-foreground italic">{suggestion.reasoning}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={alreadyApplied ? "secondary" : "outline"}
                                      disabled={alreadyApplied}
                                      onClick={() => {
                                        const newCiap2 = selectedCiap2.includes(suggestion.ciap2Code) 
                                          ? selectedCiap2 
                                          : [...selectedCiap2, suggestion.ciap2Code];
                                        const newCid10 = selectedCid10.includes(suggestion.cid10Code)
                                          ? selectedCid10
                                          : [...selectedCid10, suggestion.cid10Code];
                                        
                                        setSelectedCiap2(newCiap2);
                                        setSelectedCid10(newCid10);
                                        toast({
                                          title: "Códigos Aplicados",
                                          description: `${suggestion.ciap2Code} e ${suggestion.cid10Code} adicionados.`,
                                        });
                                      }}
                                      data-testid={`button-apply-suggestion-${idx}`}
                                    >
                                      {alreadyApplied ? "Aplicado" : "Aplicar"}
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200 font-semibold">
                            ⚠️ AVISO IMPORTANTE: As sugestões da IA são apenas auxiliares para apoio à decisão clínica. 
                            A responsabilidade pelo diagnóstico e tratamento é exclusivamente do profissional de saúde.
                          </p>
                        </div>
                      </div>
                    )}

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

                    {/* Botão de IA para Gerar Plano */}
                    <div className="flex items-center gap-2">
                      <AIAssistantButton
                        onClick={() => {
                          const subjective = form.getValues("subjective") || "";
                          const objective = form.getValues("objective") || "";
                          const assessment = form.getValues("assessment") || "";
                          
                          if (subjective.trim().length < 10 || objective.trim().length < 10 || assessment.trim().length < 10) {
                            toast({
                              variant: "destructive",
                              title: "Dados Insuficientes",
                              description: "Preencha Subjetivo, Objetivo e Avaliação (mínimo 10 caracteres cada).",
                            });
                            return;
                          }

                          generatePlanMutation.mutate(
                            { subjective, objective, assessment },
                            {
                              onSuccess: (data) => {
                                if (data.success && data.plan) {
                                  const currentPlan = form.getValues("plan") || "";
                                  const separator = currentPlan.trim() ? "\n\n---\n\n" : "";
                                  form.setValue("plan", currentPlan + separator + data.plan, { shouldValidate: true });
                                  toast({
                                    title: "Plano Gerado pela IA",
                                    description: "Revise o texto gerado antes de salvar a consulta.",
                                  });
                                }
                              },
                              onError: (error: Error) => {
                                toast({
                                  variant: "destructive",
                                  title: "Erro ao Gerar Plano",
                                  description: error.message || "Não foi possível conectar ao serviço de IA.",
                                });
                              },
                            }
                          );
                        }}
                        loading={generatePlanMutation.isPending}
                        data-testid="button-ai-generate-plan"
                      >
                        Gerar Plano com IA
                      </AIAssistantButton>
                      {generatePlanMutation.isPending && (
                        <span className="text-sm text-muted-foreground">Gerando plano terapêutico...</span>
                      )}
                    </div>

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

                    {/* Seção de Prescrições */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pill className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Prescrições Médicas</h3>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setEditingPrescription(null);
                            setPrescriptionDialogOpen(true);
                          }}
                          data-testid="button-add-prescription"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Prescrição
                        </Button>
                      </div>

                      {prescriptions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Pill className="mx-auto h-12 w-12 mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma prescrição adicionada</p>
                          <p className="text-xs">Clique em "Adicionar Prescrição" para prescrever medicamentos</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {prescriptions.map((prescription) => (
                            <div key={prescription.id} className="space-y-2">
                              <Card className="p-4" data-testid={`prescription-card-${prescription.id}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-1">
                                    <div className="font-semibold text-base">{prescription.medication}</div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Posologia:</span>{" "}
                                        <span className="font-medium">{prescription.dosage}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Frequência:</span>{" "}
                                        <span className="font-medium">{prescription.frequency}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Duração:</span>{" "}
                                        <span className="font-medium">{prescription.duration}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Quantidade:</span>{" "}
                                        <span className="font-medium">{prescription.quantity}</span>
                                      </div>
                                    </div>
                                    {prescription.instructions && (
                                      <div className="text-sm pt-1">
                                        <span className="text-muted-foreground">Instruções:</span>{" "}
                                        <span className="italic">{prescription.instructions}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1 ml-4">
                                    <AIAssistantButton
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        const vitalSigns = form.getValues("vitalSigns");
                                        validatePrescriptionMutation.mutate(
                                          {
                                            medication: prescription.medication,
                                            dosage: prescription.dosage,
                                            frequency: prescription.frequency,
                                            patientWeight: vitalSigns?.weight ? Number(vitalSigns.weight) : undefined,
                                          },
                                          {
                                            onSuccess: (data) => {
                                              if (data.success) {
                                                setAiAlerts(data.alerts || []);
                                                toast({
                                                  title: data.alerts && data.alerts.length > 0
                                                    ? `${data.alerts.length} alerta(s) encontrado(s)`
                                                    : "Prescrição validada",
                                                  description: data.alerts && data.alerts.length > 0 
                                                    ? "Revise os alertas abaixo." 
                                                    : "Nenhum problema detectado.",
                                                });
                                              }
                                            },
                                            onError: (error: Error) => {
                                              toast({
                                                variant: "destructive",
                                                title: "Erro ao Validar",
                                                description: error.message || "Não foi possível validar a prescrição.",
                                              });
                                            },
                                          }
                                        );
                                      }}
                                      loading={validatePrescriptionMutation.isPending}
                                      data-testid={`button-validate-prescription-${prescription.id}`}
                                    >
                                      Validar com IA
                                    </AIAssistantButton>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingPrescription(prescription);
                                        setPrescriptionDialogOpen(true);
                                      }}
                                      data-testid={`button-edit-prescription-${prescription.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeletingPrescription(prescription.id)}
                                      data-testid={`button-delete-prescription-${prescription.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                              
                              {/* Alertas de Validação Individual */}
                              {aiAlerts.length > 0 && validatePrescriptionMutation.isSuccess && (
                                <div className="border rounded-lg p-3 space-y-2 bg-red-50 dark:bg-red-950/20 ml-4">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-red-600" />
                                    <h5 className="font-semibold text-sm">Alertas de Segurança</h5>
                                  </div>
                                  {aiAlerts.map((alert, idx) => (
                                    <div key={idx} className="border-l-4 pl-2 py-1" style={{
                                      borderColor:
                                        alert.type === "dosage_error" ? "#dc2626" :
                                        alert.type === "contraindication" ? "#ea580c" :
                                        alert.type === "warning" ? "#f59e0b" : "#3b82f6"
                                    }}>
                                      <div className="flex items-start gap-2">
                                        <Badge variant={
                                          alert.type === "dosage_error" ? "destructive" :
                                          alert.type === "contraindication" ? "destructive" :
                                          alert.type === "warning" ? "secondary" : "outline"
                                        } className="text-xs">
                                          {alert.type === "dosage_error" ? "ERRO DOSAGEM" :
                                           alert.type === "contraindication" ? "CONTRAINDICAÇÃO" :
                                           alert.type === "warning" ? "ATENÇÃO" : "INFO"}
                                        </Badge>
                                        <div className="flex-1 text-xs">
                                          <p className="font-semibold">{alert.medication}</p>
                                          <p className="text-muted-foreground">{alert.message}</p>
                                          {alert.suggestion && (
                                            <p className="italic mt-1">💡 {alert.suggestion}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2">
                                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                      ⚠️ Alertas são sugestões. Sempre use seu julgamento clínico.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botões de IA para Prescrições */}
                      {prescriptions.length >= 2 && (
                        <div className="pt-2 space-y-3">
                          <div className="flex items-center gap-2">
                            <AIAssistantButton
                              onClick={() => {
                                const medications = prescriptions.map(p => ({
                                  medication: p.medication,
                                  dosage: p.dosage,
                                  frequency: p.frequency,
                                }));

                                interactionsMutation.mutate(
                                  { medications },
                                  {
                                    onSuccess: (data) => {
                                      if (data.success) {
                                        setAiInteractions(data.interactions || []);
                                        toast({
                                          title: data.interactions && data.interactions.length > 0 
                                            ? `${data.interactions.length} interação(ões) detectada(s)` 
                                            : "Nenhuma interação detectada",
                                          description: "Revise as interações abaixo.",
                                        });
                                      }
                                    },
                                    onError: (error: Error) => {
                                      toast({
                                        variant: "destructive",
                                        title: "Erro ao Verificar Interações",
                                        description: error.message || "Não foi possível conectar à IA.",
                                      });
                                    },
                                  }
                                );
                              }}
                              loading={interactionsMutation.isPending}
                              data-testid="button-ai-check-interactions"
                            >
                              Verificar Interações com IA
                            </AIAssistantButton>
                            {interactionsMutation.isPending && (
                              <span className="text-sm text-muted-foreground">Analisando combinações...</span>
                            )}
                          </div>

                          {/* Exibição de Interações */}
                          {aiInteractions.length > 0 && (
                            <div className="border rounded-lg p-3 space-y-2 bg-orange-50 dark:bg-orange-950/20">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-orange-600" />
                                <h4 className="font-semibold text-sm">Interações Detectadas</h4>
                              </div>
                              {aiInteractions.map((interaction, idx) => (
                                <div key={idx} className="border-l-4 pl-3 py-2" style={{
                                  borderColor: 
                                    interaction.severity === "critical" ? "#dc2626" :
                                    interaction.severity === "major" ? "#ea580c" :
                                    interaction.severity === "moderate" ? "#f59e0b" : "#84cc16"
                                }}>
                                  <div className="flex items-start gap-2">
                                    <Badge variant={
                                      interaction.severity === "critical" ? "destructive" :
                                      interaction.severity === "major" ? "destructive" :
                                      interaction.severity === "moderate" ? "secondary" : "outline"
                                    }>
                                      {interaction.severity === "critical" ? "CRÍTICA" :
                                       interaction.severity === "major" ? "MAIOR" :
                                       interaction.severity === "moderate" ? "MODERADA" : "MENOR"}
                                    </Badge>
                                    <div className="flex-1 text-sm">
                                      <p className="font-semibold">{interaction.drug1} + {interaction.drug2}</p>
                                      <p className="text-muted-foreground">{interaction.interaction}</p>
                                      <p className="text-xs italic mt-1">💡 {interaction.recommendation}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2 mt-2">
                                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                  ⚠️ As interações são sugestões. Sempre verifique em fontes confiáveis.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

        {/* Dialog de Prescrição */}
        <PrescriptionDialog
          open={prescriptionDialogOpen}
          onOpenChange={setPrescriptionDialogOpen}
          prescription={editingPrescription}
          onSave={(data) => {
            if (editingPrescription) {
              updatePrescription(editingPrescription.id, data);
            } else {
              addPrescription(data);
            }
          }}
        />

        {/* Alert Dialog de Confirmação de Exclusão */}
        <AlertDialog open={!!deletingPrescription} onOpenChange={() => setDeletingPrescription(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta prescrição? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingPrescription && deletePrescription(deletingPrescription)}
                data-testid="button-confirm-delete"
              >
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
