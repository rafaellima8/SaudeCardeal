import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { ReferralForm, type ReferralFormData } from "@/components/ReferralForm";
import { MedicalHistory } from "@/components/MedicalHistory";

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
  ArrowRightLeft,
  TestTube,
  ClipboardList,
  History,
  Printer,
  FileCheck,
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

const examFormSchema = z.object({
  examType: z.string().min(3, "Tipo de exame é obrigatório"),
  observations: z.string().optional(),
  status: z.enum(["requested", "scheduled", "completed", "cancelled"]).default("requested"),
});

type ExamFormData = z.infer<typeof examFormSchema>;

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

  // Estados para encaminhamentos
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<any>(null);
  const [deleteReferralId, setDeleteReferralId] = useState<string | null>(null);

  // Estados para exames
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);

  // Estados para procedimentos (armazenados em JSON na consulta)
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [procedures, setProcedures] = useState<Array<{code?: string; description: string; observations?: string}>>([]);

  // Estados para impressão de documentos
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [certificateType, setCertificateType] = useState<'trabalho' | 'escola' | 'outros'>('trabalho');
  const [certificateStartDate, setCertificateStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [certificateEndDate, setCertificateEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [certificateReason, setCertificateReason] = useState<string>('');

  // Buscar dados da consulta
  const { data: consultation, isLoading: loadingConsultation } = useQuery({
    queryKey: ["/api/consultations", consultationId],
    queryFn: () => apiRequest("GET", `/api/consultations/${consultationId}`),
    enabled: !!consultationId,
  });

  // Buscar histórico do paciente
  const { data: patientHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["/api/citizens", consultation?.citizenId, "medical-history"],
    queryFn: () => apiRequest("GET", `/api/citizens/${consultation.citizenId}/medical-history`),
    enabled: !!consultation?.citizenId,
  });

  // Buscar problemas ativos do cidadão
  const { data: citizenProblems = [], isLoading: loadingProblems } = useQuery({
    queryKey: ["/api/citizens", consultation?.citizenId, "problems"],
    queryFn: () => apiRequest("GET", `/api/citizens/${consultation.citizenId}/problems`),
    enabled: !!consultation?.citizenId,
  });

  // Buscar prescrições da consulta
  const { data: prescriptions = [], isLoading: loadingPrescriptions } = useQuery({
    queryKey: ["/api/prescriptions", consultationId],
    queryFn: () => apiRequest("GET", `/api/prescriptions?consultationId=${consultationId}`),
    enabled: !!consultationId,
  });

  // Buscar encaminhamentos da consulta
  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ["/api/medical-referrals", consultationId],
    queryFn: () => apiRequest("GET", `/api/medical-referrals?consultationId=${consultationId}`),
    enabled: !!consultationId,
  });

  // Buscar exames da consulta
  const { data: exams = [], isLoading: loadingExams } = useQuery({
    queryKey: ["/api/exams", consultationId],
    queryFn: () => apiRequest("GET", `/api/exams?consultationId=${consultationId}`),
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

  const examForm = useForm<ExamFormData>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      examType: "",
      observations: "",
      status: "requested",
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
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
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
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
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
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
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

  // Mutations para encaminhamentos
  const createReferralMutation = useMutation({
    mutationFn: async (data: ReferralFormData) => {
      if (!consultationId) {
        throw new Error("ID da consulta não encontrado");
      }
      // Enviar apenas campos permitidos - servidor deriva cidadão/profissional/unidade da consulta
      const result: any = await apiRequest("POST", "/api/medical-referrals", {
        ...data,
        consultationId: consultationId,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-referrals", consultationId] });
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
      setReferralDialogOpen(false);
      setEditingReferral(null);
      toast({
        title: "Encaminhamento Criado",
        description: "O encaminhamento foi registrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Criar Encaminhamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReferralMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReferralFormData> }) => {
      const result: any = await apiRequest("PATCH", `/api/medical-referrals/${id}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-referrals", consultationId] });
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
      setReferralDialogOpen(false);
      setEditingReferral(null);
      toast({
        title: "Encaminhamento Atualizado",
        description: "O encaminhamento foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Atualizar Encaminhamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReferralMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/medical-referrals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-referrals", consultationId] });
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
      setDeleteReferralId(null);
      toast({
        title: "Encaminhamento Removido",
        description: "O encaminhamento foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Remover Encaminhamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutations para exames
  const createExamMutation = useMutation({
    mutationFn: async (data: ExamFormData) => {
      if (!consultation?.citizenId || !consultation?.professionalId) {
        throw new Error("Dados da consulta incompletos");
      }
      const result: any = await apiRequest("POST", "/api/exams", {
        ...data,
        consultationId: consultationId,
        citizenId: consultation.citizenId,
        professionalId: consultation.professionalId,
        requestDate: new Date(),
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", consultationId] });
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
      setExamDialogOpen(false);
      setEditingExam(null);
      examForm.reset();
      toast({
        title: "Exame Solicitado",
        description: "O exame foi registrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Solicitar Exame",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExamFormData> }) => {
      const result: any = await apiRequest("PATCH", `/api/exams/${id}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", consultationId] });
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
      setExamDialogOpen(false);
      setEditingExam(null);
      examForm.reset();
      toast({
        title: "Exame Atualizado",
        description: "O exame foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Atualizar Exame",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/exams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", consultationId] });
      if (consultation?.citizenId) {
        queryClient.invalidateQueries({ queryKey: ["/api/citizens", consultation.citizenId, "medical-history"] });
      }
      setDeleteExamId(null);
      toast({
        title: "Exame Removido",
        description: "O exame foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Remover Exame",
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

  const onSubmitExam = (data: ExamFormData) => {
    if (editingExam) {
      updateExamMutation.mutate({ id: editingExam.id, data });
    } else {
      createExamMutation.mutate(data);
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

  // Handlers para encaminhamentos
  const handleSaveReferral = (data: ReferralFormData) => {
    if (editingReferral) {
      updateReferralMutation.mutate({ id: editingReferral.id, data });
    } else {
      createReferralMutation.mutate(data);
    }
  };

  const handleEditReferral = (referral: any) => {
    setEditingReferral(referral);
    setReferralDialogOpen(true);
  };

  const handleAddReferral = () => {
    setEditingReferral(null);
    setReferralDialogOpen(true);
  };

  // Handlers para exames
  const handleEditExam = (exam: any) => {
    setEditingExam(exam);
    examForm.reset({
      examType: exam.examType,
      observations: exam.observations || "",
      status: exam.status,
    });
    setExamDialogOpen(true);
  };

  const handleAddExam = () => {
    setEditingExam(null);
    examForm.reset({
      examType: "",
      observations: "",
      status: "requested",
    });
    setExamDialogOpen(true);
  };

  // Handlers para impressão de documentos
  const handlePrintPrescription = () => {
    if (!consultationId) return;
    
    // Abrir PDF em nova aba
    window.open(`/api/consultations/${consultationId}/print-prescription`, '_blank');
  };

  const handleOpenCertificateDialog = () => {
    // Resetar valores padrão
    const today = new Date().toISOString().split('T')[0];
    setCertificateStartDate(today);
    setCertificateEndDate(today);
    setCertificateReason('');
    setCertificateType('trabalho');
    setCertificateDialogOpen(true);
  };

  const handlePrintCertificate = async () => {
    if (!consultationId) return;
    
    try {
      const response = await fetch(`/api/consultations/${consultationId}/print-medical-certificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: certificateType,
          startDate: certificateStartDate,
          endDate: certificateEndDate,
          reason: certificateReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar atestado');
      }

      // Criar URL do blob e abrir em nova aba
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setCertificateDialogOpen(false);
      toast({
        title: "Atestado Gerado",
        description: "O atestado médico foi gerado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao Gerar Atestado",
        description: error.message,
        variant: "destructive",
      });
    }
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
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="soap" data-testid="tab-soap">SOAP</TabsTrigger>
                      <TabsTrigger value="vitals" data-testid="tab-vitals">Sinais Vitais</TabsTrigger>
                      <TabsTrigger value="notes" data-testid="tab-notes">Observações</TabsTrigger>
                      <TabsTrigger value="history" data-testid="tab-history">
                        <History className="h-4 w-4 mr-2" />
                        Histórico
                      </TabsTrigger>
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

                    <TabsContent value="history" className="mt-4">
                      {consultation?.citizenId ? (
                        <MedicalHistory citizenId={consultation.citizenId} />
                      ) : (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Carregando informações do paciente...
                        </div>
                      )}
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

              <div className="space-y-2">
                <p className="text-sm font-medium">Documentos</p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleOpenCertificateDialog}
                  data-testid="button-generate-certificate"
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Gerar Atestado Médico
                </Button>
              </div>

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
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePrintPrescription}
                    disabled={prescriptions.length === 0}
                    title="Imprimir Receita Médica"
                    data-testid="button-print-prescription"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAddPrescription}
                    data-testid="button-add-prescription"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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

          {/* Encaminhamentos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Encaminhamentos
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddReferral}
                  data-testid="button-add-referral"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {referrals.length} {referrals.length === 1 ? "encaminhamento" : "encaminhamentos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                {loadingReferrals ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando encaminhamentos...
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum encaminhamento adicionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referrals.map((referral: any) => (
                      <Card key={referral.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{referral.destination}</p>
                                <Badge 
                                  variant={
                                    referral.priority === "emergency" 
                                      ? "destructive" 
                                      : referral.priority === "urgent" 
                                      ? "default" 
                                      : "secondary"
                                  }
                                  className="text-xs"
                                  data-testid={`badge-referral-priority-${referral.id}`}
                                >
                                  {referral.priority === "emergency" && "Emergência"}
                                  {referral.priority === "urgent" && "Urgente"}
                                  {referral.priority === "normal" && "Normal"}
                                </Badge>
                              </div>
                              {referral.specialty && (
                                <p className="text-xs text-muted-foreground">
                                  <strong>Especialidade:</strong> {referral.specialty}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>Motivo:</strong> {referral.reason}
                              </p>
                              {referral.observations && (
                                <p className="text-xs text-muted-foreground">
                                  <strong>Obs:</strong> {referral.observations}
                                </p>
                              )}
                              <Badge 
                                variant={
                                  referral.status === "completed" 
                                    ? "default" 
                                    : referral.status === "cancelled" 
                                    ? "destructive" 
                                    : "secondary"
                                }
                                className="mt-2"
                                data-testid={`badge-referral-status-${referral.id}`}
                              >
                                {referral.status === "pending" && "Pendente"}
                                {referral.status === "scheduled" && "Agendado"}
                                {referral.status === "in_progress" && "Em Andamento"}
                                {referral.status === "completed" && "Concluído"}
                                {referral.status === "cancelled" && "Cancelado"}
                              </Badge>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditReferral(referral)}
                                data-testid={`button-edit-referral-${referral.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteReferralId(referral.id)}
                                data-testid={`button-delete-referral-${referral.id}`}
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

          {/* Exames */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Exames
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddExam}
                  data-testid="button-add-exam"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {exams.length} {exams.length === 1 ? "exame" : "exames"} solicitado{exams.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] pr-4">
                {loadingExams ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando exames...
                  </div>
                ) : exams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum exame solicitado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exams.map((exam: any) => (
                      <Card key={exam.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{exam.examType}</p>
                              {exam.observations && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {exam.observations}
                                </p>
                              )}
                              <Badge 
                                variant={
                                  exam.status === "completed" 
                                    ? "default" 
                                    : exam.status === "cancelled" 
                                    ? "destructive" 
                                    : "secondary"
                                }
                                className="mt-2"
                                data-testid={`badge-exam-status-${exam.id}`}
                              >
                                {exam.status === "requested" && "Solicitado"}
                                {exam.status === "scheduled" && "Agendado"}
                                {exam.status === "completed" && "Concluído"}
                                {exam.status === "cancelled" && "Cancelado"}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditExam(exam)}
                                data-testid={`button-edit-exam-${exam.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteExamId(exam.id)}
                                data-testid={`button-delete-exam-${exam.id}`}
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

          {/* Procedimentos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Procedimentos
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setProcedureDialogOpen(true)}
                  data-testid="button-add-procedure"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {procedures.length} {procedures.length === 1 ? "procedimento" : "procedimentos"} realizado{procedures.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                {procedures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum procedimento registrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {procedures.map((procedure, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{procedure.description}</p>
                              {procedure.code && (
                                <p className="text-xs text-muted-foreground">Código: {procedure.code}</p>
                              )}
                              {procedure.observations && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {procedure.observations}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setProcedures(procedures.filter((_, i) => i !== index));
                              }}
                              data-testid={`button-delete-procedure-${index}`}
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

      {/* Dialog para Adicionar/Editar Encaminhamento */}
      <ReferralForm
        open={referralDialogOpen}
        onOpenChange={setReferralDialogOpen}
        referral={editingReferral}
        onSave={handleSaveReferral}
        isLoading={createReferralMutation.isPending || updateReferralMutation.isPending}
      />

      {/* AlertDialog para Confirmar Exclusão de Encaminhamento */}
      <AlertDialog 
        open={!!deleteReferralId} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteReferralId(null);
          }
        }}
      >
        <AlertDialogContent data-testid="alert-delete-referral">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este encaminhamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeleteReferralId(null)}
              data-testid="alert-cancel-referral"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteReferralId) {
                  deleteReferralMutation.mutate(deleteReferralId);
                }
              }}
              disabled={deleteReferralMutation.isPending}
              data-testid="alert-confirm-referral"
            >
              {deleteReferralMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Adicionar/Editar Exame */}
      <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent data-testid="dialog-exam">
          <DialogHeader>
            <DialogTitle>
              {editingExam ? "Editar Exame" : "Solicitar Exame"}
            </DialogTitle>
            <DialogDescription>
              Registre um exame solicitado para o paciente
            </DialogDescription>
          </DialogHeader>
          <Form {...examForm}>
            <form onSubmit={examForm.handleSubmit(onSubmitExam)} className="space-y-4">
              <FormField
                control={examForm.control}
                name="examType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Exame *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Hemograma Completo"
                        {...field}
                        data-testid="input-exam-type"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={examForm.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre o exame..."
                        rows={3}
                        {...field}
                        data-testid="textarea-exam-observations"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={examForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-exam-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="requested">Solicitado</SelectItem>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setExamDialogOpen(false);
                    setEditingExam(null);
                    examForm.reset();
                  }}
                  data-testid="dialog-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createExamMutation.isPending || updateExamMutation.isPending}
                  data-testid="dialog-submit"
                >
                  {editingExam ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Gerar Atestado Médico */}
      <Dialog open={certificateDialogOpen} onOpenChange={setCertificateDialogOpen}>
        <DialogContent data-testid="dialog-medical-certificate">
          <DialogHeader>
            <DialogTitle>Gerar Atestado Médico</DialogTitle>
            <DialogDescription>
              Preencha os dados para gerar o atestado médico do paciente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="certificate-type">Tipo de Atestado</Label>
              <Select
                value={certificateType}
                onValueChange={(value: any) => setCertificateType(value)}
              >
                <SelectTrigger id="certificate-type" data-testid="select-certificate-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trabalho">Trabalho</SelectItem>
                  <SelectItem value="escola">Escola</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={certificateStartDate}
                  onChange={(e) => setCertificateStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={certificateEndDate}
                  onChange={(e) => setCertificateEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (Opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo do afastamento..."
                value={certificateReason}
                onChange={(e) => setCertificateReason(e.target.value)}
                rows={3}
                data-testid="textarea-certificate-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCertificateDialogOpen(false)}
              data-testid="dialog-cancel-certificate"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePrintCertificate}
              data-testid="dialog-generate-certificate"
            >
              <Printer className="mr-2 h-4 w-4" />
              Gerar Atestado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Confirmar Exclusão de Exame */}
      <AlertDialog 
        open={!!deleteExamId} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteExamId(null);
          }
        }}
      >
        <AlertDialogContent data-testid="alert-delete-exam">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exame? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeleteExamId(null)}
              data-testid="alert-cancel-exam"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteExamId) {
                  deleteExamMutation.mutate(deleteExamId);
                }
              }}
              disabled={deleteExamMutation.isPending}
              data-testid="alert-confirm-exam"
            >
              {deleteExamMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
