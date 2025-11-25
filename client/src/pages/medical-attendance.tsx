import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PrescriptionForm, type PrescriptionFormData } from "@/components/PrescriptionForm";

// Icons
import {
  User,
  Calendar,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Pill,
  Save,
  ArrowLeft,
  Clock,
  Stethoscope,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";

// Helper para converter string vazia em undefined e strings numéricas em números
// Usa preprocess para evitar que undefined passe por coerce (que resulta em NaN)
const optionalNumber = () =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return typeof val === "string" ? Number(val) : val;
    },
    z.number().positive().optional()
  );

const optionalNumberRange = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return typeof val === "string" ? Number(val) : val;
    },
    z.number().min(min).max(max).optional()
  );

// Schema validation
const soapFormSchema = z.object({
  subjective: z.string().min(10, "Mínimo de 10 caracteres"),
  objective: z.string().optional(),
  assessment: z.string().min(10, "Mínimo de 10 caracteres"),
  plan: z.string().min(10, "Mínimo de 10 caracteres"),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
  // Sinais vitais - transformar string vazia em undefined antes da coerção
  bloodPressureSystolic: optionalNumber(),
  bloodPressureDiastolic: optionalNumber(),
  heartRate: optionalNumber(),
  temperature: optionalNumber(),
  respiratoryRate: optionalNumber(),
  oxygenSaturation: optionalNumberRange(0, 100),
  weight: optionalNumber(),
  height: optionalNumber(),
});

type SOAPFormData = z.infer<typeof soapFormSchema>;

const problemFormSchema = z.object({
  description: z.string().min(3, "Mínimo de 3 caracteres"),
  ciap2Code: z.string().optional(),
  cid10Code: z.string().optional(),
  status: z.enum(["active", "resolved", "inactive"]).default("active"),
});

type ProblemFormData = z.infer<typeof problemFormSchema>;

export default function MedicalAttendance() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [problemDialogOpen, setProblemDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<any>(null);
  
  // Estados para prescrições
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<any>(null);
  const [deletePrescriptionId, setDeletePrescriptionId] = useState<string | null>(null);

  // Buscar dados da consulta
  const { data: consultation, isLoading: loadingConsultation } = useQuery({
    queryKey: ["/api/consultations", consultationId],
    queryFn: async () => {
      const response = await fetch(`/api/consultations/${consultationId}`);
      if (!response.ok) throw new Error("Erro ao carregar consulta");
      return response.json();
    },
    enabled: !!consultationId,
  });

  // Buscar histórico do paciente
  const { data: patientHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["/api/citizens", consultation?.citizenId, "history"],
    queryFn: async () => {
      if (!consultation?.citizenId) return null;
      const response = await fetch(`/api/citizens/${consultation.citizenId}/history`);
      if (!response.ok) throw new Error("Erro ao carregar histórico");
      return response.json();
    },
    enabled: !!consultation?.citizenId,
  });

  // Buscar problemas ativos do cidadão
  const { data: citizenProblems = [], isLoading: loadingProblems } = useQuery({
    queryKey: ["/api/citizens", consultation?.citizenId, "problems"],
    queryFn: async () => {
      if (!consultation?.citizenId) return [];
      const response = await fetch(`/api/citizens/${consultation.citizenId}/problems`);
      if (!response.ok) throw new Error("Erro ao carregar problemas");
      return response.json();
    },
    enabled: !!consultation?.citizenId,
  });

  // Buscar prescrições da consulta
  const { data: prescriptions = [], isLoading: loadingPrescriptions } = useQuery({
    queryKey: ["/api/prescriptions", consultationId],
    queryFn: async () => {
      if (!consultationId) return [];
      const response = await fetch(`/api/prescriptions?consultationId=${consultationId}`);
      if (!response.ok) throw new Error("Erro ao carregar prescrições");
      return response.json();
    },
    enabled: !!consultationId,
  });

  // Form setup
  const form = useForm<SOAPFormData>({
    resolver: zodResolver(soapFormSchema),
    defaultValues: {
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      chiefComplaint: "",
      notes: "",
    },
  });

  const problemForm = useForm<ProblemFormData>({
    resolver: zodResolver(problemFormSchema),
    defaultValues: {
      description: "",
      ciap2Code: "",
      cid10Code: "",
      status: "active",
    },
  });

  // Preencher formulário com dados existentes da consulta
  useEffect(() => {
    if (consultation) {
      form.reset({
        subjective: consultation.subjective || "",
        objective: consultation.objective || "",
        assessment: consultation.assessment || "",
        plan: consultation.plan || "",
        chiefComplaint: consultation.chiefComplaint || "",
        notes: consultation.notes || "",
        bloodPressureSystolic: consultation.vitalSigns?.bloodPressureSystolic,
        bloodPressureDiastolic: consultation.vitalSigns?.bloodPressureDiastolic,
        heartRate: consultation.vitalSigns?.heartRate,
        temperature: consultation.vitalSigns?.temperature,
        respiratoryRate: consultation.vitalSigns?.respiratoryRate,
        oxygenSaturation: consultation.vitalSigns?.oxygenSaturation,
        weight: consultation.vitalSigns?.weight,
        height: consultation.vitalSigns?.height,
      });
    }
  }, [consultation, form]);

  // Mutation para salvar consulta
  const saveConsultationMutation = useMutation({
    mutationFn: async (data: SOAPFormData) => {
      const payload = {
        subjective: data.subjective,
        objective: data.objective || "",
        assessment: data.assessment,
        plan: data.plan,
        chiefComplaint: data.chiefComplaint || "",
        notes: data.notes || "",
        vitalSigns: {
          bloodPressureSystolic: data.bloodPressureSystolic,
          bloodPressureDiastolic: data.bloodPressureDiastolic,
          heartRate: data.heartRate,
          temperature: data.temperature,
          respiratoryRate: data.respiratoryRate,
          oxygenSaturation: data.oxygenSaturation,
          weight: data.weight,
          height: data.height,
        },
      };

      const result: any = await apiRequest("PATCH", `/api/consultations/${consultationId}`, payload);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations", consultationId] });
      toast({
        title: "Consulta Salva",
        description: "Os dados do atendimento foram salvos com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para criar problema
  const createProblemMutation = useMutation({
    mutationFn: async (data: ProblemFormData) => {
      const result: any = await apiRequest("POST", "/api/citizen-problems", {
        ...data,
        citizenId: consultation?.citizenId,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation?.citizenId, "problems"] });
      setProblemDialogOpen(false);
      problemForm.reset();
      toast({
        title: "Problema Adicionado",
        description: "O problema foi registrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar problema
  const updateProblemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProblemFormData> }) => {
      const result: any = await apiRequest("PATCH", `/api/citizen-problems/${id}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation?.citizenId, "problems"] });
      setProblemDialogOpen(false);
      setEditingProblem(null);
      problemForm.reset();
      toast({
        title: "Problema Atualizado",
        description: "O problema foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar problema
  const deleteProblemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/citizen-problems/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation?.citizenId, "problems"] });
      toast({
        title: "Problema Removido",
        description: "O problema foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutations para prescrições
  const createPrescriptionMutation = useMutation({
    mutationFn: async (data: PrescriptionFormData) => {
      if (!consultation?.citizenId || !consultation?.professionalId) {
        throw new Error("Dados da consulta incompletos");
      }
      const result: any = await apiRequest("POST", "/api/prescriptions", {
        ...data,
        consultationId: consultationId,
        citizenId: consultation.citizenId,
        professionalId: consultation.professionalId,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", consultationId] });
      setPrescriptionDialogOpen(false);
      setEditingPrescription(null);
      toast({
        title: "Prescrição Adicionada",
        description: "A prescrição foi registrada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Adicionar Prescrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PrescriptionFormData> }) => {
      const result: any = await apiRequest("PATCH", `/api/prescriptions/${id}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", consultationId] });
      setPrescriptionDialogOpen(false);
      setEditingPrescription(null);
      toast({
        title: "Prescrição Atualizada",
        description: "A prescrição foi atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Atualizar Prescrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/prescriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", consultationId] });
      setDeletePrescriptionId(null);
      toast({
        title: "Prescrição Removida",
        description: "A prescrição foi removida com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Remover Prescrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SOAPFormData) => {
    saveConsultationMutation.mutate(data);
  };

  const onSubmitProblem = (data: ProblemFormData) => {
    if (editingProblem) {
      updateProblemMutation.mutate({ id: editingProblem.id, data });
    } else {
      createProblemMutation.mutate(data);
    }
  };

  const handleEditProblem = (problem: any) => {
    setEditingProblem(problem);
    problemForm.reset({
      description: problem.description,
      ciap2Code: problem.ciap2Code || "",
      cid10Code: problem.cid10Code || "",
      status: problem.status,
    });
    setProblemDialogOpen(true);
  };

  const handleAddProblem = () => {
    setEditingProblem(null);
    problemForm.reset({
      description: "",
      ciap2Code: "",
      cid10Code: "",
      status: "active",
    });
    setProblemDialogOpen(true);
  };

  // Handlers para prescrições
  const handleSavePrescription = (data: PrescriptionFormData) => {
    if (editingPrescription) {
      updatePrescriptionMutation.mutate({ id: editingPrescription.id, data });
    } else {
      createPrescriptionMutation.mutate(data);
    }
  };

  const handleEditPrescription = (prescription: any) => {
    setEditingPrescription(prescription);
    setPrescriptionDialogOpen(true);
  };

  const handleAddPrescription = () => {
    setEditingPrescription(null);
    setPrescriptionDialogOpen(true);
  };

  if (loadingConsultation || !consultation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando atendimento...</p>
        </div>
      </div>
    );
  }

  const citizen = patientHistory?.citizen;

  return (
    <div className="container mx-auto p-6 max-w-[1800px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/fila-atendimento")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Stethoscope className="w-8 h-8" />
              Atendimento Médico
            </h1>
            <p className="text-muted-foreground mt-1">
              {citizen?.name} - {format(new Date(consultation.consultationDate), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={saveConsultationMutation.isPending}
          data-testid="button-save"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveConsultationMutation.isPending ? "Salvando..." : "Salvar Atendimento"}
        </Button>
      </div>

      {/* Layout de 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA 1: Informações do Paciente (3/12) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Dados do Paciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{citizen?.name || "N/A"}</p>
              </div>
              {citizen?.cns && (
                <div>
                  <Label className="text-muted-foreground">CNS</Label>
                  <p className="font-mono text-sm">{citizen.cns}</p>
                </div>
              )}
              {citizen?.cpf && (
                <div>
                  <Label className="text-muted-foreground">CPF</Label>
                  <p className="font-mono text-sm">{citizen.cpf}</p>
                </div>
              )}
              {citizen?.birthDate && (
                <div>
                  <Label className="text-muted-foreground">Data de Nascimento</Label>
                  <p className="text-sm">{format(new Date(citizen.birthDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              )}
              {citizen?.phone && (
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p className="text-sm">{citizen.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Problemas Ativos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Problemas Ativos
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddProblem}
                  data-testid="button-add-problem"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {loadingProblems ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Carregando...
                  </div>
                ) : citizenProblems.filter((p: any) => p.status === "active").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhum problema ativo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {citizenProblems
                      .filter((p: any) => p.status === "active")
                      .map((problem: any) => (
                        <Card key={problem.id} className="p-3" data-testid={`problem-card-${problem.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{problem.description}</p>
                              {(problem.ciap2Code || problem.cid10Code) && (
                                <div className="flex gap-2 mt-1">
                                  {problem.ciap2Code && (
                                    <Badge variant="secondary" className="text-xs">
                                      CIAP-2: {problem.ciap2Code}
                                    </Badge>
                                  )}
                                  {problem.cid10Code && (
                                    <Badge variant="secondary" className="text-xs">
                                      CID-10: {problem.cid10Code}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditProblem(problem)}
                                data-testid={`button-edit-problem-${problem.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteProblemMutation.mutate(problem.id)}
                                data-testid={`button-delete-problem-${problem.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Histórico Resumido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {loadingHistory ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Carregando...
                  </div>
                ) : !patientHistory || patientHistory.consultations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Sem histórico anterior</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {patientHistory.consultations.slice(0, 5).map((cons: any) => (
                      <div key={cons.id} className="text-sm border-l-2 border-primary/30 pl-3 py-1">
                        <p className="font-medium">
                          {format(new Date(cons.consultationDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-muted-foreground text-xs line-clamp-2">
                          {cons.chiefComplaint || cons.subjective || "Sem queixa registrada"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA 2: Formulário SOAP (6/12) */}
        <div className="lg:col-span-6">
          <Card>
            <CardHeader>
              <CardTitle>Registro do Atendimento (SOAP)</CardTitle>
              <CardDescription>
                Preencha os campos do atendimento médico seguindo o método SOAP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs defaultValue="soap" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="soap" data-testid="tab-soap">SOAP</TabsTrigger>
                      <TabsTrigger value="vitals" data-testid="tab-vitals">Sinais Vitais</TabsTrigger>
                      <TabsTrigger value="notes" data-testid="tab-notes">Observações</TabsTrigger>
                    </TabsList>

                    <TabsContent value="soap" className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="chiefComplaint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Queixa Principal</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Dor de cabeça há 3 dias"
                                {...field}
                                data-testid="input-chief-complaint"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subjective"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subjetivo (S) *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Informações relatadas pelo paciente..."
                                rows={4}
                                {...field}
                                data-testid="textarea-subjective"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="objective"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Objetivo (O)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Achados do exame físico e resultados de exames..."
                                rows={4}
                                {...field}
                                data-testid="textarea-objective"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="assessment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Avaliação (A) *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Diagnóstico e avaliação clínica..."
                                rows={4}
                                {...field}
                                data-testid="textarea-assessment"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="plan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plano (P) *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Conduta terapêutica e orientações..."
                                rows={4}
                                {...field}
                                data-testid="textarea-plan"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="vitals" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bloodPressureSystolic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PA Sistólica (mmHg)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="120"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-bp-systolic"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bloodPressureDiastolic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PA Diastólica (mmHg)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="80"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-bp-diastolic"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="heartRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>FC (bpm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="72"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-heart-rate"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperatura (°C)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="36.5"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-temperature"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="respiratoryRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>FR (irpm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="16"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-respiratory-rate"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="oxygenSaturation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SpO2 (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="98"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-oxygen-saturation"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Peso (kg)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="70.5"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-weight"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Altura (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="170"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-height"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações Gerais</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Anotações adicionais, informações relevantes..."
                                rows={10}
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
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA 3: Ações e Prescrições (3/12) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={form.handleSubmit(onSubmit)}
                disabled={saveConsultationMutation.isPending}
                data-testid="button-save-sidebar"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Atendimento
              </Button>
              
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setLocation("/fila-atendimento")}
                data-testid="button-back-to-queue"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Fila
              </Button>

              <Separator />

              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(consultation.consultationDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{consultation.professional?.name || "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prescrições */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Prescrições
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddPrescription}
                  data-testid="button-add-prescription"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {prescriptions.length} {prescriptions.length === 1 ? "prescrição" : "prescrições"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {loadingPrescriptions ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando prescrições...
                  </div>
                ) : prescriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma prescrição adicionada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.map((prescription: any) => (
                      <Card key={prescription.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{prescription.medication}</p>
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                <p><strong>Posologia:</strong> {prescription.dosage}</p>
                                <p><strong>Frequência:</strong> {prescription.frequency}</p>
                                <p><strong>Duração:</strong> {prescription.duration}</p>
                                <p><strong>Quantidade:</strong> {prescription.quantity}</p>
                                {prescription.instructions && (
                                  <p><strong>Instruções:</strong> {prescription.instructions}</p>
                                )}
                              </div>
                              <Badge 
                                variant={
                                  prescription.status === "dispensed" 
                                    ? "default" 
                                    : prescription.status === "cancelled" 
                                    ? "destructive" 
                                    : "secondary"
                                }
                                className="mt-2"
                                data-testid={`badge-prescription-status-${prescription.id}`}
                              >
                                {prescription.status === "pending" && "Pendente"}
                                {prescription.status === "dispensed" && "Dispensado"}
                                {prescription.status === "cancelled" && "Cancelado"}
                              </Badge>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditPrescription(prescription)}
                                data-testid={`button-edit-prescription-${prescription.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletePrescriptionId(prescription.id)}
                                data-testid={`button-delete-prescription-${prescription.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para Adicionar/Editar Problema */}
      <Dialog open={problemDialogOpen} onOpenChange={setProblemDialogOpen}>
        <DialogContent data-testid="dialog-problem">
          <DialogHeader>
            <DialogTitle>
              {editingProblem ? "Editar Problema" : "Adicionar Problema"}
            </DialogTitle>
            <DialogDescription>
              Registre um problema de saúde ativo do paciente
            </DialogDescription>
          </DialogHeader>
          <Form {...problemForm}>
            <form onSubmit={problemForm.handleSubmit(onSubmitProblem)} className="space-y-4">
              <FormField
                control={problemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Hipertensão Arterial Sistêmica"
                        {...field}
                        data-testid="input-problem-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={problemForm.control}
                  name="ciap2Code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código CIAP-2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: K86"
                          {...field}
                          data-testid="input-problem-ciap2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={problemForm.control}
                  name="cid10Code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código CID-10</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: I10"
                          {...field}
                          data-testid="input-problem-cid10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setProblemDialogOpen(false);
                    setEditingProblem(null);
                    problemForm.reset();
                  }}
                  data-testid="dialog-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createProblemMutation.isPending || updateProblemMutation.isPending}
                  data-testid="dialog-submit"
                >
                  {editingProblem ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionar/Editar Prescrição */}
      <PrescriptionForm
        open={prescriptionDialogOpen}
        onOpenChange={setPrescriptionDialogOpen}
        prescription={editingPrescription}
        onSave={handleSavePrescription}
        isLoading={createPrescriptionMutation.isPending || updatePrescriptionMutation.isPending}
      />

      {/* AlertDialog para Confirmar Exclusão de Prescrição */}
      <AlertDialog 
        open={!!deletePrescriptionId} 
        onOpenChange={(open) => {
          if (!open) {
            setDeletePrescriptionId(null);
          }
        }}
      >
        <AlertDialogContent data-testid="alert-delete-prescription">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta prescrição? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeletePrescriptionId(null)}
              data-testid="alert-cancel"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletePrescriptionId) {
                  deletePrescriptionMutation.mutate(deletePrescriptionId);
                }
              }}
              disabled={deletePrescriptionMutation.isPending}
              data-testid="alert-confirm"
            >
              {deletePrescriptionMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
