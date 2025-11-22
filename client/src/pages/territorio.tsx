import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Users, Calendar, Plus, MapPin, Search, Pencil, Trash2, UserPlus, ArrowRightLeft, BarChart3, Filter, UserCheck, UserMinus, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { insertDwellingSchema, insertHomeVisitSchema, insertFamilyMemberSchema } from "@shared/schema";

const dwellingFormSchema = insertDwellingSchema.extend({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  familiesCount: z.coerce.number().default(1),
});

const homeVisitFormSchema = z.object({
  dwellingId: z.string().min(1, "Selecione um domicílio"),
  familyId: z.string().optional(),
  professionalId: z.string().min(1, "Profissional é obrigatório"),
  visitDate: z.string().min(1, "Data da visita é obrigatória"),
  visitType: z.enum(["rotina", "busca_ativa", "acompanhamento", "urgencia"]),
  visitMotive: z.enum(["gestante", "crianca", "idoso", "doenca_cronica", "controle_ambiental", "outro"]).optional(),
  findings: z.string().optional(),
  actions: z.string().optional(),
  referrals: z.string().optional(),
});

const familyMemberFormSchema = insertFamilyMemberSchema.extend({
  citizenId: z.string().min(1, "Selecione um cidadão"),
  relationshipType: z.enum(["responsavel_familiar", "conjuge", "filho", "neto", "pai_mae", "avo", "irmao", "outro"]),
  isHeadOfFamily: z.boolean().default(false),
  notes: z.string().optional(),
});

const transferMemberSchema = z.object({
  memberId: z.string().min(1),
  newFamilyId: z.string().min(1, "Selecione a família de destino"),
  relationshipType: z.enum(["responsavel_familiar", "conjuge", "filho", "neto", "pai_mae", "avo", "irmao", "outro"]),
  notes: z.string().optional(),
});

type DwellingFormData = z.infer<typeof dwellingFormSchema>;
type HomeVisitFormData = z.infer<typeof homeVisitFormSchema>;
type FamilyMemberFormData = z.infer<typeof familyMemberFormSchema>;
type TransferMemberFormData = z.infer<typeof transferMemberSchema>;

interface Dwelling {
  id: string;
  unitId: string;
  microarea: string;
  address: string;
  number?: string | null;
  complement?: string | null;
  neighborhood: string;
  zipCode?: string | null;
  dwellingType: string;
  sanitation?: string | null;
  waterSupply?: string | null;
  familiesCount: number;
  hasElectricity?: boolean | null;
  hasAnimals?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface HomeVisit {
  id: string;
  dwellingId: string;
  familyId?: string | null;
  visitDate: string;
  visitType: string;
  visitMotive?: string;
  professionalId: string;
  findings?: string;
  actions?: string | null;
  referrals?: string | null;
}

interface Family {
  id: string;
  name: string;
  dwellingId: string;
  membersCount: number;
  isRegistered: boolean;
}

interface Citizen {
  id: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
}

interface FamilyMember {
  id: string;
  familyId: string;
  citizenId: string;
  relationshipType: string;
  isHeadOfFamily: boolean;
  joinedAt: Date;
  leftAt?: Date;
  notes?: string;
  citizen?: Citizen;
}

interface FamilyHierarchy {
  family: Family;
  dwelling: Dwelling | null;
  members: FamilyMember[];
}

interface TerritorialHierarchy {
  dwelling: Dwelling;
  families: Array<{
    family: Family;
    members: Citizen[];
  }>;
}

export default function TerritoryPage() {
  const [dwellingDialogOpen, setDwellingDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMicroarea, setSelectedMicroarea] = useState<string>("all");
  const [editingDwelling, setEditingDwelling] = useState<Dwelling | null>(null);
  const [editingVisit, setEditingVisit] = useState<HomeVisit | null>(null);
  const [deletingDwelling, setDeletingDwelling] = useState<string | null>(null);
  const [deletingVisit, setDeletingVisit] = useState<string | null>(null);
  
  // Family management states
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  
  // Territorial hierarchy state
  const [selectedDwellingForHierarchy, setSelectedDwellingForHierarchy] = useState<string | undefined>(undefined);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [relationshipFilter, setRelationshipFilter] = useState<string>("all");
  const [showStats, setShowStats] = useState(false);
  
  const { toast } = useToast();

  const { data: units = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/units'],
  });

  const { data: professionals = [] } = useQuery<Array<{ id: string; name: string; role: string }>>({
    queryKey: ['/api/professionals'],
  });

  const { data: dwellings, isLoading: dwellingsLoading } = useQuery<Dwelling[]>({
    queryKey: ['/api/dwellings', selectedMicroarea, searchTerm],
  });

  const { data: homeVisits, isLoading: visitsLoading } = useQuery<HomeVisit[]>({
    queryKey: ['/api/home-visits'],
  });
  
  // Territorial hierarchy query
  const { data: hierarchyData, isLoading: territorialHierarchyLoading, error: hierarchyError } = useQuery<TerritorialHierarchy>({
    queryKey: ['/api/dwellings', selectedDwellingForHierarchy, 'hierarchy'],
    enabled: !!selectedDwellingForHierarchy,
  });

  const dwellingForm = useForm<DwellingFormData>({
    resolver: zodResolver(dwellingFormSchema),
    defaultValues: {
      unitId: "",
      microarea: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      zipCode: "",
      dwellingType: "casa",
      sanitation: undefined,
      waterSupply: undefined,
      hasElectricity: true,
      hasAnimals: false,
      latitude: undefined,
      longitude: undefined,
      familiesCount: 1,
    },
  });

  const visitForm = useForm<HomeVisitFormData>({
    resolver: zodResolver(homeVisitFormSchema),
    defaultValues: {
      dwellingId: "",
      familyId: "",
      professionalId: "",
      visitDate: "",
      visitType: "rotina",
      visitMotive: "outro",
      findings: "",
      actions: "",
      referrals: "",
    },
  });

  const createDwellingMutation = useMutation({
    mutationFn: async (data: DwellingFormData) => {
      const payload = {
        ...data,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      };
      return await apiRequest("POST", "/api/dwellings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dwellings'] });
      toast({
        title: "Domicílio cadastrado",
        description: "Domicílio cadastrado com sucesso.",
      });
      setDwellingDialogOpen(false);
      dwellingForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cadastrar o domicílio.",
      });
    },
  });

  const updateDwellingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DwellingFormData> }) => {
      const payload = {
        ...data,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      };
      return await apiRequest("PATCH", `/api/dwellings/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dwellings'] });
      toast({
        title: "Domicílio atualizado",
        description: "Domicílio atualizado com sucesso.",
      });
      setDwellingDialogOpen(false);
      setEditingDwelling(null);
      dwellingForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o domicílio.",
      });
    },
  });

  const deleteDwellingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/dwellings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dwellings'] });
      toast({
        title: "Domicílio excluído",
        description: "Domicílio excluído com sucesso.",
      });
      setDeletingDwelling(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o domicílio.",
      });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: async (data: HomeVisitFormData) => {
      const payload = {
        ...data,
        visitDate: new Date(data.visitDate).getTime() / 1000,
      };
      return await apiRequest("POST", "/api/home-visits", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home-visits'] });
      toast({
        title: "Visita registrada",
        description: "Visita domiciliar registrada com sucesso.",
      });
      setVisitDialogOpen(false);
      visitForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a visita.",
      });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HomeVisitFormData> }) => {
      const payload = {
        ...data,
        visitDate: data.visitDate ? new Date(data.visitDate).getTime() / 1000 : undefined,
      };
      return await apiRequest("PATCH", `/api/home-visits/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home-visits'] });
      toast({
        title: "Visita atualizada",
        description: "Visita atualizada com sucesso.",
      });
      setVisitDialogOpen(false);
      setEditingVisit(null);
      visitForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a visita.",
      });
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/home-visits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home-visits'] });
      toast({
        title: "Visita excluída",
        description: "Visita excluída com sucesso.",
      });
      setDeletingVisit(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a visita.",
      });
    },
  });

  const onDwellingSubmit = (data: DwellingFormData) => {
    if (editingDwelling) {
      updateDwellingMutation.mutate({ id: editingDwelling.id, data });
    } else {
      createDwellingMutation.mutate(data);
    }
  };

  const onVisitSubmit = (data: HomeVisitFormData) => {
    if (editingVisit) {
      updateVisitMutation.mutate({ id: editingVisit.id, data });
    } else {
      createVisitMutation.mutate(data);
    }
  };

  const handleEditDwelling = (dwelling: Dwelling) => {
    setEditingDwelling(dwelling);
    dwellingForm.reset({
      unitId: dwelling.unitId,
      microarea: dwelling.microarea,
      address: dwelling.address,
      number: dwelling.number || "",
      complement: dwelling.complement || "",
      neighborhood: dwelling.neighborhood,
      zipCode: dwelling.zipCode || "",
      dwellingType: dwelling.dwellingType as any,
      sanitation: dwelling.sanitation as any,
      waterSupply: dwelling.waterSupply as any,
      hasElectricity: dwelling.hasElectricity || false,
      hasAnimals: dwelling.hasAnimals || false,
      latitude: dwelling.latitude || undefined,
      longitude: dwelling.longitude || undefined,
      familiesCount: dwelling.familiesCount,
    });
    setDwellingDialogOpen(true);
  };

  const handleEditVisit = (visit: HomeVisit) => {
    setEditingVisit(visit);
    visitForm.reset({
      dwellingId: visit.dwellingId,
      familyId: visit.familyId || "",
      professionalId: visit.professionalId,
      visitDate: new Date(visit.visitDate).toISOString().split('T')[0],
      visitType: visit.visitType as any,
      visitMotive: visit.visitMotive as any,
      findings: visit.findings || "",
      actions: visit.actions || "",
      referrals: visit.referrals || "",
    });
    setVisitDialogOpen(true);
  };

  const handleCloseDwellingDialog = () => {
    setDwellingDialogOpen(false);
    setEditingDwelling(null);
    dwellingForm.reset();
  };

  const handleCloseVisitDialog = () => {
    setVisitDialogOpen(false);
    setEditingVisit(null);
    visitForm.reset();
  };

  // Family Management Queries and Mutations
  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ['/api/families'],
  });

  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ['/api/citizens'],
  });

  const { data: familyHierarchy, isLoading: hierarchyLoading } = useQuery<FamilyHierarchy>({
    queryKey: ['/api/families', selectedFamilyId, 'hierarchy'],
    queryFn: async () => {
      if (!selectedFamilyId) return null;
      const response = await fetch(`/api/families/${selectedFamilyId}/hierarchy`);
      if (!response.ok) throw new Error("Failed to fetch hierarchy");
      return response.json();
    },
    enabled: !!selectedFamilyId,
  });

  const memberForm = useForm<FamilyMemberFormData>({
    resolver: zodResolver(familyMemberFormSchema),
    defaultValues: {
      familyId: "",
      citizenId: "",
      relationshipType: "outro",
      isHeadOfFamily: false,
      notes: "",
    },
  });

  const transferForm = useForm<TransferMemberFormData>({
    resolver: zodResolver(transferMemberSchema),
    defaultValues: {
      memberId: "",
      newFamilyId: "",
      relationshipType: "outro",
      notes: "",
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: FamilyMemberFormData) => {
      return await apiRequest("POST", `/api/families/${data.familyId}/members`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      if (selectedFamilyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/families', selectedFamilyId, 'hierarchy'] });
      }
      toast({
        title: "Membro adicionado",
        description: "Membro adicionado à família com sucesso.",
      });
      setMemberDialogOpen(false);
      memberForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o membro.",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FamilyMemberFormData> }) => {
      return await apiRequest("PATCH", `/api/family-members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      if (selectedFamilyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/families', selectedFamilyId, 'hierarchy'] });
      }
      toast({
        title: "Membro atualizado",
        description: "Dados do membro atualizados com sucesso.",
      });
      setMemberDialogOpen(false);
      setEditingMember(null);
      memberForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o membro.",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/family-members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      if (selectedFamilyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/families', selectedFamilyId, 'hierarchy'] });
      }
      toast({
        title: "Membro removido",
        description: "Membro removido da família com sucesso.",
      });
      setDeletingMember(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o membro.",
      });
    },
  });

  const transferMemberMutation = useMutation({
    mutationFn: async (data: TransferMemberFormData) => {
      if (!editingMember?.citizenId) {
        throw new Error("Cidadão não identificado");
      }
      
      // Prepare transfer notes preserving history
      const transferNotes = [
        editingMember.notes,
        data.notes,
        `Transferido de ${familyHierarchy?.family.name || 'outra família'} em ${new Date().toLocaleDateString('pt-BR')}`
      ].filter(Boolean).join(' | ');
      
      // First, create member in new family preserving metadata
      const newMember = await apiRequest("POST", `/api/families/${data.newFamilyId}/members`, {
        familyId: data.newFamilyId,
        citizenId: editingMember.citizenId,
        relationshipType: data.relationshipType,
        isHeadOfFamily: editingMember.isHeadOfFamily,
        notes: transferNotes,
      });
      
      // Only delete from old family if creation succeeded
      await apiRequest("DELETE", `/api/family-members/${data.memberId}`);
      
      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      if (selectedFamilyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/families', selectedFamilyId, 'hierarchy'] });
      }
      // Also invalidate the destination family's hierarchy
      const destFamilyId = transferForm.getValues('newFamilyId');
      if (destFamilyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/families', destFamilyId, 'hierarchy'] });
      }
      toast({
        title: "Transferência realizada",
        description: "Membro transferido para nova família com sucesso.",
      });
      setTransferDialogOpen(false);
      setEditingMember(null);
      transferForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível transferir o membro.",
      });
    },
  });

  const onMemberSubmit = (data: FamilyMemberFormData) => {
    if (!selectedFamilyId && !editingMember) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione uma família primeiro.",
      });
      return;
    }
    
    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, data });
    } else {
      addMemberMutation.mutate({ ...data, familyId: selectedFamilyId! });
    }
  };

  const onTransferSubmit = (data: TransferMemberFormData) => {
    transferMemberMutation.mutate(data);
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    memberForm.reset({
      familyId: member.familyId,
      citizenId: member.citizenId,
      relationshipType: member.relationshipType as any,
      isHeadOfFamily: member.isHeadOfFamily,
      notes: member.notes || "",
    });
    setMemberDialogOpen(true);
  };

  const handleTransferMember = (member: FamilyMember) => {
    setEditingMember(member);
    transferForm.reset({
      memberId: member.id,
      newFamilyId: "",
      relationshipType: member.relationshipType as any,
      notes: "",
    });
    setTransferDialogOpen(true);
  };

  const getRelationshipLabel = (type: string): string => {
    const labels: Record<string, string> = {
      responsavel_familiar: "Responsável Familiar",
      conjuge: "Cônjuge",
      filho: "Filho(a)",
      neto: "Neto(a)",
      pai_mae: "Pai/Mãe",
      avo: "Avô/Avó",
      irmao: "Irmão/Irmã",
      outro: "Outro",
    };
    return labels[type] || type;
  };

  const filteredMembers = familyHierarchy?.members.filter((member) =>
    relationshipFilter === "all" || member.relationshipType === relationshipFilter
  ) || [];

  const microareas = Array.from(new Set(dwellings?.map(d => d.microarea) || []));

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Gestão Territorial</h1>
          <p className="text-muted-foreground">Cadastro e acompanhamento de domicílios e famílias</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-new-visit">
                <Calendar className="mr-2 h-4 w-4" />
                Nova Visita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Visita Domiciliar</DialogTitle>
                <DialogDescription>
                  Registre uma visita realizada a um domicílio
                </DialogDescription>
              </DialogHeader>
              <Form {...visitForm}>
                <form onSubmit={visitForm.handleSubmit(onVisitSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={visitForm.control}
                      name="dwellingId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domicílio</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-dwelling">
                                <SelectValue placeholder="Selecione o domicílio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dwellings?.map((dwelling) => (
                                <SelectItem key={dwelling.id} value={dwelling.id}>
                                  {dwelling.address} {dwelling.number} - {dwelling.neighborhood}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="professionalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profissional</FormLabel>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={visitForm.control}
                      name="visitDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Visita</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-visit-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="visitType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Visita</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-visit-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rotina">Rotina</SelectItem>
                              <SelectItem value="busca_ativa">Busca Ativa</SelectItem>
                              <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                              <SelectItem value="urgencia">Urgência</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={visitForm.control}
                    name="visitMotive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo da Visita</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-visit-motive">
                              <SelectValue placeholder="Selecione o motivo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gestante">Gestante</SelectItem>
                            <SelectItem value="crianca">Criança</SelectItem>
                            <SelectItem value="idoso">Idoso</SelectItem>
                            <SelectItem value="doenca_cronica">Doença Crônica</SelectItem>
                            <SelectItem value="controle_ambiental">Controle Ambiental</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={visitForm.control}
                    name="findings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Achados/Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva os achados durante a visita..." {...field} data-testid="textarea-findings" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={visitForm.control}
                    name="actions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ações Realizadas</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva as ações tomadas..." {...field} data-testid="textarea-actions" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleCloseVisitDialog} data-testid="button-cancel-visit">
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createVisitMutation.isPending || updateVisitMutation.isPending} 
                      data-testid="button-submit-visit"
                    >
                      {editingVisit
                        ? (updateVisitMutation.isPending ? "Atualizando..." : "Atualizar")
                        : (createVisitMutation.isPending ? "Registrando..." : "Registrar Visita")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={dwellingDialogOpen} onOpenChange={setDwellingDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-dwelling">
                <Plus className="mr-2 h-4 w-4" />
                Novo Domicílio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDwelling ? "Editar Domicílio" : "Cadastrar Domicílio"}</DialogTitle>
                <DialogDescription>
                  {editingDwelling ? "Atualize as informações do domicílio" : "Cadastre um novo domicílio no território"}
                </DialogDescription>
              </DialogHeader>
              <Form {...dwellingForm}>
                <form onSubmit={dwellingForm.handleSubmit(onDwellingSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={dwellingForm.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade de Saúde</FormLabel>
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
                      control={dwellingForm.control}
                      name="microarea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Microárea</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 01" {...field} data-testid="input-microarea" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={dwellingForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, Avenida..." {...field} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={dwellingForm.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} value={field.value ?? ""} data-testid="input-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dwellingForm.control}
                      name="complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apt 201" {...field} value={field.value ?? ""} data-testid="input-complement" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dwellingForm.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="48340-000" {...field} value={field.value ?? ""} data-testid="input-zipcode" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={dwellingForm.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} data-testid="input-neighborhood" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={dwellingForm.control}
                      name="dwellingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Imóvel</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-dwelling-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="casa">Casa</SelectItem>
                              <SelectItem value="apartamento">Apartamento</SelectItem>
                              <SelectItem value="comodo">Cômodo</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dwellingForm.control}
                      name="sanitation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Saneamento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-sanitation">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rede_esgoto">Rede de Esgoto</SelectItem>
                              <SelectItem value="fossa_septica">Fossa Séptica</SelectItem>
                              <SelectItem value="ceu_aberto">Céu Aberto</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dwellingForm.control}
                      name="waterSupply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Abastecimento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-water">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rede_publica">Rede Pública</SelectItem>
                              <SelectItem value="poco">Poço</SelectItem>
                              <SelectItem value="cisterna">Cisterna</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={dwellingForm.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude (Opcional)</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" placeholder="-12.345678" {...field} data-testid="input-latitude" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dwellingForm.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude (Opcional)</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" placeholder="-38.123456" {...field} data-testid="input-longitude" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-6">
                    <FormField
                      control={dwellingForm.control}
                      name="hasElectricity"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value ?? true}
                              onCheckedChange={field.onChange}
                              data-testid="switch-electricity"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Possui Energia Elétrica</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dwellingForm.control}
                      name="hasAnimals"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              data-testid="switch-animals"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Possui Animais</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDwellingDialog} data-testid="button-cancel-dwelling">
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createDwellingMutation.isPending || updateDwellingMutation.isPending} 
                      data-testid="button-submit-dwelling"
                    >
                      {editingDwelling 
                        ? (updateDwellingMutation.isPending ? "Atualizando..." : "Atualizar") 
                        : (createDwellingMutation.isPending ? "Cadastrando..." : "Cadastrar")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-dwellings">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domicílios</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-dwellings">
              {dwellings?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total cadastrados
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-families">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Famílias</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-families">
              {dwellings?.reduce((sum, d) => sum + (d.familiesCount || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Em {dwellings?.length || 0} domicílios
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-visits">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-visits">
              {homeVisits?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registradas
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dwellings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dwellings" data-testid="tab-dwellings">Domicílios</TabsTrigger>
          <TabsTrigger value="families" data-testid="tab-families">Famílias</TabsTrigger>
          <TabsTrigger value="visits" data-testid="tab-visits">Visitas</TabsTrigger>
          <TabsTrigger value="hierarchy" data-testid="tab-hierarchy">Hierarquia Territorial</TabsTrigger>
        </TabsList>

        <TabsContent value="dwellings">
          <Card>
            <CardHeader>
              <CardTitle>Domicílios Cadastrados</CardTitle>
              <CardDescription>Gerencie os domicílios do território</CardDescription>
              <div className="flex gap-2 pt-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por endereço ou bairro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-dwelling"
                  />
                </div>
                <Select value={selectedMicroarea} onValueChange={setSelectedMicroarea}>
                  <SelectTrigger className="w-40" data-testid="select-filter-microarea">
                    <SelectValue placeholder="Microárea" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {microareas.map((ma) => (
                      <SelectItem key={ma} value={ma}>
                        Microárea {ma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {dwellingsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : dwellings && dwellings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Microárea</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Bairro</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Famílias</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dwellings.map((dwelling) => (
                      <TableRow key={dwelling.id} data-testid={`row-dwelling-${dwelling.id}`}>
                        <TableCell>
                          <Badge variant="outline">{dwelling.microarea}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {dwelling.address} {dwelling.number}
                        </TableCell>
                        <TableCell>{dwelling.neighborhood}</TableCell>
                        <TableCell className="capitalize">{dwelling.dwellingType}</TableCell>
                        <TableCell>{dwelling.familiesCount}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {dwelling.hasElectricity && <Badge variant="secondary" className="text-xs">Energia</Badge>}
                            {dwelling.hasAnimals && <Badge variant="secondary" className="text-xs">Animais</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditDwelling(dwelling)}
                              data-testid={`button-edit-dwelling-${dwelling.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingDwelling(dwelling.id)}
                              data-testid={`button-delete-dwelling-${dwelling.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Home className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">Nenhum domicílio cadastrado</p>
                  <p className="text-sm">
                    Clique em "Novo Domicílio" para começar o cadastro territorial
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="families">
          <div className="space-y-4">
            {/* Family Selector and Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>Hierarquia Familiar</CardTitle>
                    <CardDescription>Visualize e gerencie a composição das famílias cadastradas</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStats(!showStats)}
                      data-testid="button-toggle-stats"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {showStats ? "Ocultar" : "Estatísticas"}
                    </Button>
                    {selectedFamilyId && (
                      <Button
                        onClick={() => {
                          memberForm.reset({ familyId: selectedFamilyId, citizenId: "", relationshipType: "outro", isHeadOfFamily: false, notes: "" });
                          setEditingMember(null);
                          setMemberDialogOpen(true);
                        }}
                        data-testid="button-add-member"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Membro
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Select value={selectedFamilyId || ""} onValueChange={setSelectedFamilyId}>
                      <SelectTrigger className="flex-1" data-testid="select-family">
                        <SelectValue placeholder="Selecione uma família" />
                      </SelectTrigger>
                      <SelectContent>
                        {families.map((family) => (
                          <SelectItem key={family.id} value={family.id}>
                            {family.name} ({family.membersCount} {family.membersCount === 1 ? "membro" : "membros"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedFamilyId && (
                      <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                        <SelectTrigger className="w-48" data-testid="select-filter-relationship">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4" />
                              <span>Todos</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="responsavel_familiar">Responsável Familiar</SelectItem>
                          <SelectItem value="conjuge">Cônjuge</SelectItem>
                          <SelectItem value="filho">Filho(a)</SelectItem>
                          <SelectItem value="neto">Neto(a)</SelectItem>
                          <SelectItem value="pai_mae">Pai/Mãe</SelectItem>
                          <SelectItem value="avo">Avô/Avó</SelectItem>
                          <SelectItem value="irmao">Irmão/Irmã</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Dashboard */}
            {showStats && selectedFamilyId && familyHierarchy && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Membros</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{familyHierarchy.members.length}</div>
                    <p className="text-xs text-muted-foreground">Membros cadastrados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Responsável</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {familyHierarchy.members.filter(m => m.isHeadOfFamily).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Chefe de família</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {familyHierarchy.members.filter(m => !m.leftAt).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Membros ativos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inativos</CardTitle>
                    <UserMinus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {familyHierarchy.members.filter(m => m.leftAt).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Saíram da família</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Family Hierarchy Visualization */}
            {selectedFamilyId && (
              <Card>
                <CardHeader>
                  <CardTitle>Estrutura Familiar</CardTitle>
                  <CardDescription>
                    {familyHierarchy?.dwelling && `${familyHierarchy.dwelling.address}, ${familyHierarchy.dwelling.neighborhood}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hierarchyLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : familyHierarchy && filteredMembers.length > 0 ? (
                    <div className="space-y-3">
                      {filteredMembers.map((member) => (
                        <Card key={member.id} className={member.leftAt ? "opacity-60" : ""} data-testid={`card-member-${member.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-lg">
                                    {member.citizen?.name || "Nome não disponível"}
                                  </h4>
                                  {member.isHeadOfFamily && (
                                    <Badge variant="default">
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Responsável
                                    </Badge>
                                  )}
                                  <Badge variant="secondary">
                                    {getRelationshipLabel(member.relationshipType)}
                                  </Badge>
                                  {member.leftAt && (
                                    <Badge variant="outline" className="text-destructive">
                                      <UserMinus className="h-3 w-3 mr-1" />
                                      Inativo
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                  {member.citizen?.cpf && (
                                    <div>
                                      <span className="font-medium">CPF:</span> {member.citizen.cpf}
                                    </div>
                                  )}
                                  {member.citizen?.birthDate && (
                                    <div>
                                      <span className="font-medium">Nascimento:</span>{" "}
                                      {new Date(member.citizen.birthDate).toLocaleDateString('pt-BR')}
                                    </div>
                                  )}
                                  {member.citizen?.gender && (
                                    <div>
                                      <span className="font-medium">Sexo:</span>{" "}
                                      {member.citizen.gender === 'M' ? 'Masculino' : member.citizen.gender === 'F' ? 'Feminino' : 'Outro'}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">Desde:</span>{" "}
                                    {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                                  </div>
                                </div>
                                {member.notes && (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">Observações:</span> {member.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditMember(member)}
                                  data-testid={`button-edit-member-${member.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleTransferMember(member)}
                                  data-testid={`button-transfer-member-${member.id}`}
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeletingMember(member.id)}
                                  data-testid={`button-delete-member-${member.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium mb-2">Nenhum membro encontrado</p>
                      <p className="text-sm mb-4">
                        {relationshipFilter !== "all" 
                          ? "Nenhum membro com este tipo de relacionamento"
                          : "Adicione membros à família para começar"}
                      </p>
                      {relationshipFilter === "all" && (
                        <Button onClick={() => {
                          memberForm.reset({ familyId: selectedFamilyId, citizenId: "", relationshipType: "outro", isHeadOfFamily: false, notes: "" });
                          setEditingMember(null);
                          setMemberDialogOpen(true);
                        }}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Adicionar Primeiro Membro
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedFamilyId && (
              <Card>
                <CardContent className="pt-12 pb-12">
                  <div className="text-center text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-2">Selecione uma Família</p>
                    <p className="text-sm">
                      Escolha uma família acima para visualizar sua hierarquia e gerenciar membros
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add/Edit Member Dialog */}
          <Dialog open={memberDialogOpen} onOpenChange={(open) => {
            setMemberDialogOpen(open);
            if (!open) {
              setEditingMember(null);
              memberForm.reset();
            }
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingMember ? "Editar Membro" : "Adicionar Membro à Família"}</DialogTitle>
                <DialogDescription>
                  {editingMember ? "Atualize as informações do membro" : "Vincule um cidadão a esta família"}
                </DialogDescription>
              </DialogHeader>
              <Form {...memberForm}>
                <form onSubmit={memberForm.handleSubmit(onMemberSubmit)} className="space-y-4">
                  <FormField
                    control={memberForm.control}
                    name="citizenId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidadão</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!editingMember}>
                          <FormControl>
                            <SelectTrigger data-testid="select-citizen">
                              <SelectValue placeholder="Selecione o cidadão" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {citizens.map((citizen) => (
                              <SelectItem key={citizen.id} value={citizen.id}>
                                {citizen.name} {citizen.cpf && `- CPF: ${citizen.cpf}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="relationshipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Relacionamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-relationship">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="responsavel_familiar">Responsável Familiar</SelectItem>
                            <SelectItem value="conjuge">Cônjuge</SelectItem>
                            <SelectItem value="filho">Filho(a)</SelectItem>
                            <SelectItem value="neto">Neto(a)</SelectItem>
                            <SelectItem value="pai_mae">Pai/Mãe</SelectItem>
                            <SelectItem value="avo">Avô/Avó</SelectItem>
                            <SelectItem value="irmao">Irmão/Irmã</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="isHeadOfFamily"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-head-of-family"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Responsável pela Família (Chefe de Família)</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Informações adicionais sobre o membro"
                            rows={3}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setMemberDialogOpen(false);
                        setEditingMember(null);
                        memberForm.reset();
                      }}
                      data-testid="button-cancel-member"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addMemberMutation.isPending || updateMemberMutation.isPending}
                      data-testid="button-submit-member"
                    >
                      {editingMember
                        ? (updateMemberMutation.isPending ? "Atualizando..." : "Atualizar")
                        : (addMemberMutation.isPending ? "Adicionando..." : "Adicionar")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Transfer Member Dialog */}
          <Dialog open={transferDialogOpen} onOpenChange={(open) => {
            setTransferDialogOpen(open);
            if (!open) {
              setEditingMember(null);
              transferForm.reset();
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transferir Membro para Outra Família</DialogTitle>
                <DialogDescription>
                  Remova {editingMember?.citizen?.name} desta família e adicione a outra
                </DialogDescription>
              </DialogHeader>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4">
                  <FormField
                    control={transferForm.control}
                    name="newFamilyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Família de Destino</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-new-family">
                              <SelectValue placeholder="Selecione a família" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {families.filter(f => f.id !== selectedFamilyId).map((family) => (
                              <SelectItem key={family.id} value={family.id}>
                                {family.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferForm.control}
                    name="relationshipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Novo Relacionamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-new-relationship">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="responsavel_familiar">Responsável Familiar</SelectItem>
                            <SelectItem value="conjuge">Cônjuge</SelectItem>
                            <SelectItem value="filho">Filho(a)</SelectItem>
                            <SelectItem value="neto">Neto(a)</SelectItem>
                            <SelectItem value="pai_mae">Pai/Mãe</SelectItem>
                            <SelectItem value="avo">Avô/Avó</SelectItem>
                            <SelectItem value="irmao">Irmão/Irmã</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo da Transferência (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Justificativa ou observações"
                            rows={2}
                            data-testid="input-transfer-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTransferDialogOpen(false);
                        setEditingMember(null);
                        transferForm.reset();
                      }}
                      data-testid="button-cancel-transfer"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={transferMemberMutation.isPending}
                      data-testid="button-submit-transfer"
                    >
                      {transferMemberMutation.isPending ? "Transferindo..." : "Transferir"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Member Confirmation */}
          <AlertDialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover este membro da família? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete-member">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingMember && removeMemberMutation.mutate(deletingMember)}
                  className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
                  data-testid="button-confirm-delete-member"
                >
                  {removeMemberMutation.isPending ? "Removendo..." : "Remover"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardHeader>
              <CardTitle>Visitas Domiciliares</CardTitle>
              <CardDescription>Histórico de visitas realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : homeVisits && homeVisits.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {homeVisits.map((visit) => (
                      <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                        <TableCell>
                          {new Date(visit.visitDate).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="capitalize">{visit.visitType.replace('_', ' ')}</TableCell>
                        <TableCell className="capitalize">{visit.visitMotive?.replace('_', ' ') || '-'}</TableCell>
                        <TableCell>{visit.professionalId.substring(0, 8)}...</TableCell>
                        <TableCell className="max-w-xs truncate">{visit.findings || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditVisit(visit)}
                              data-testid={`button-edit-visit-${visit.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingVisit(visit.id)}
                              data-testid={`button-delete-visit-${visit.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">Nenhuma visita registrada</p>
                  <p className="text-sm">
                    Clique em "Nova Visita" para registrar uma visita domiciliar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Hierarquia Territorial</CardTitle>
              <CardDescription>
                Visualize a hierarquia completa: Domicílio → Famílias → Cidadãos
              </CardDescription>
              <div className="flex gap-2 pt-4">
                <Select value={selectedDwellingForHierarchy} onValueChange={setSelectedDwellingForHierarchy}>
                  <SelectTrigger className="w-full max-w-md" data-testid="select-dwelling-hierarchy">
                    <SelectValue placeholder="Selecione um domicílio" />
                  </SelectTrigger>
                  <SelectContent>
                    {dwellings && dwellings.map((dwelling) => (
                      <SelectItem key={dwelling.id} value={dwelling.id}>
                        {dwelling.address}, {dwelling.number || "S/N"} - {dwelling.neighborhood} (Microárea {dwelling.microarea})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDwellingForHierarchy ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Home className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">Selecione um domicílio</p>
                  <p className="text-sm">
                    Escolha um domicílio acima para visualizar sua hierarquia territorial completa
                  </p>
                </div>
              ) : territorialHierarchyLoading ? (
                <div className="text-center py-8" data-testid="loading-hierarchy">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-4">Carregando hierarquia...</p>
                </div>
              ) : hierarchyError ? (
                <div className="text-center py-12 text-destructive" data-testid="error-hierarchy">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Erro ao carregar hierarquia</p>
                  <p className="text-sm text-muted-foreground">
                    {hierarchyError instanceof Error ? hierarchyError.message : 'Erro desconhecido'}
                  </p>
                </div>
              ) : hierarchyData ? (
                <div className="space-y-6">
                  <Card className="bg-muted/50" data-testid={`card-dwelling-${hierarchyData.dwelling.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Domicílio</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div data-testid="text-dwelling-address">
                          <span className="font-medium">Endereço:</span> {hierarchyData.dwelling.address}, {hierarchyData.dwelling.number || "S/N"}
                        </div>
                        <div data-testid="text-dwelling-neighborhood">
                          <span className="font-medium">Bairro:</span> {hierarchyData.dwelling.neighborhood}
                        </div>
                        <div data-testid="text-dwelling-microarea">
                          <span className="font-medium">Microárea:</span> {hierarchyData.dwelling.microarea}
                        </div>
                        <div data-testid="text-dwelling-type">
                          <span className="font-medium">Tipo:</span> {hierarchyData.dwelling.dwellingType}
                        </div>
                        <div data-testid="text-dwelling-families-count">
                          <span className="font-medium">Famílias:</span> {hierarchyData.families.length}
                        </div>
                        <div data-testid="text-dwelling-members-total">
                          <span className="font-medium">Total Membros:</span> {hierarchyData.families.reduce((sum, f) => sum + f.members.length, 0)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {hierarchyData.families.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Famílias ({hierarchyData.families.length})
                      </h3>
                      {hierarchyData.families.map((familyData) => (
                        <Card key={familyData.family.id} className="border-l-4 border-l-primary" data-testid={`card-family-${familyData.family.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base" data-testid={`text-family-code-${familyData.family.id}`}>
                                Família {(familyData.family as any).familyCode || familyData.family.id.substring(0, 8)}
                              </CardTitle>
                              <Badge variant="secondary" data-testid={`badge-family-members-count-${familyData.family.id}`}>
                                {familyData.members.length} membros
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {familyData.members.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>Data Nasc.</TableHead>
                                    <TableHead>Sexo</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {familyData.members.map((citizen) => (
                                    <TableRow key={citizen.id} data-testid={`row-citizen-${citizen.id}`}>
                                      <TableCell className="font-medium">{citizen.name}</TableCell>
                                      <TableCell>{citizen.cpf || "N/A"}</TableCell>
                                      <TableCell>
                                        {citizen.birthDate ? new Date(citizen.birthDate).toLocaleDateString("pt-BR") : "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline">
                                          {citizen.gender === "M" ? "Masculino" : citizen.gender === "F" ? "Feminino" : "Outro"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground text-sm" data-testid={`empty-family-members-${familyData.family.id}`}>
                                Nenhum membro cadastrado nesta família
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground" data-testid="empty-families">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium mb-2">Nenhuma família cadastrada</p>
                      <p className="text-sm">
                        Este domicílio ainda não possui famílias cadastradas
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dwelling Confirmation Dialog */}
      <AlertDialog open={!!deletingDwelling} onOpenChange={() => setDeletingDwelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este domicílio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-dwelling">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDwelling && deleteDwellingMutation.mutate(deletingDwelling)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-dwelling"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Visit Confirmation Dialog */}
      <AlertDialog open={!!deletingVisit} onOpenChange={() => setDeletingVisit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta visita domiciliar? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-visit">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVisit && deleteVisitMutation.mutate(deletingVisit)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-visit"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
