import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Plus,
  Search,
  FileText,
  Download,
  ClipboardList,
  CalendarIcon,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Upload,
  Bug,
  Syringe,
  Thermometer,
  Activity,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { SinanNotification, Citizen } from "@shared/schema";

const AGRAVO_LABELS: Record<string, string> = {
  dengue: "Dengue",
  chikungunya: "Chikungunya",
  zika: "Zika",
  leishmaniose_visceral: "Leishmaniose Visceral",
  leishmaniose_tegumentar: "Leishmaniose Tegumentar",
  hanseniase: "Hanseníase",
  tuberculose: "Tuberculose",
  malaria: "Malária",
  covid19: "COVID-19",
  hepatite_a: "Hepatite A",
  hepatite_b: "Hepatite B",
  hepatite_c: "Hepatite C",
  meningite: "Meningite",
  tetano: "Tétano",
  coqueluche: "Coqueluche",
  difteria: "Difteria",
  poliomielite: "Poliomielite",
  sarampo: "Sarampo",
  rubeola: "Rubéola",
  varicela: "Varicela",
  febre_amarela: "Febre Amarela",
  raiva_humana: "Raiva Humana",
  leptospirose: "Leptospirose",
  esquistossomose: "Esquistossomose",
  doenca_chagas: "Doença de Chagas",
  hantavirose: "Hantavirose",
  febre_maculosa: "Febre Maculosa",
  botulismo: "Botulismo",
  colera: "Cólera",
  febre_tifoide: "Febre Tifoide",
  antraz: "Antraz",
  peste: "Peste",
  tularemia: "Tularemia",
  acidentes_animais: "Acidentes por Animais Peçonhentos",
  intoxicacao_exogena: "Intoxicação Exógena",
  violencia_domestica: "Violência Doméstica",
  acidente_trabalho: "Acidente de Trabalho",
  outros: "Outros Agravos",
};

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  confirmado: { label: "Confirmado", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
  provavel: { label: "Provável", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" },
  descartado: { label: "Descartado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  inconclusivo: { label: "Inconclusivo", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100" },
  em_investigacao: { label: "Em Investigação", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
};

const STATUS_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  rascunho: { label: "Rascunho", icon: Edit, color: "text-gray-500" },
  preenchida: { label: "Preenchida", icon: FileText, color: "text-blue-500" },
  validada: { label: "Validada", icon: CheckCircle, color: "text-green-500" },
  exportada: { label: "Exportada", icon: Upload, color: "text-purple-500" },
  cancelada: { label: "Cancelada", icon: XCircle, color: "text-red-500" },
};

const notificationSchema = z.object({
  agravo: z.string().min(1, "Selecione o agravo"),
  cidPrimary: z.string().min(1, "CID obrigatório"),
  cidSecondary: z.string().optional(),
  citizenId: z.string().optional(),
  patientName: z.string().min(2, "Nome obrigatório"),
  patientBirthDate: z.date().optional(),
  patientSex: z.enum(["M", "F", "I"]),
  patientPregnant: z.string().optional(),
  patientRace: z.string().optional(),
  patientCpf: z.string().optional(),
  patientCns: z.string().optional(),
  patientMotherName: z.string().optional(),
  patientPhone: z.string().optional(),
  patientAddress: z.string().optional(),
  patientNeighborhood: z.string().optional(),
  patientMunicipalityName: z.string().optional(),
  patientState: z.string().optional(),
  patientCep: z.string().optional(),
  patientZone: z.string().optional(),
  symptomStartDate: z.date().optional(),
  hospitalization: z.boolean().optional(),
  observations: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

export default function Sinan() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgravo, setFilterAgravo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<SinanNotification | null>(null);
  const [citizenSearch, setCitizenSearch] = useState("");

  const { data: notifications = [], isLoading } = useQuery<SinanNotification[]>({
    queryKey: ["/api/sinan/notifications"],
  });

  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ["/api/citizens"],
  });

  const { data: stats } = useQuery<{
    total: number;
    byStatus: Record<string, number>;
    byAgravo: Record<string, number>;
    byClassification: Record<string, number>;
  }>({
    queryKey: ["/api/sinan/stats"],
  });

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      agravo: "",
      cidPrimary: "",
      patientName: "",
      patientSex: "M",
      hospitalization: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      return apiRequest("POST", "/api/sinan/notifications", {
        ...data,
        notificationDate: new Date(),
        notificationWeek: getEpidemiologicalWeek(new Date()),
        notificationYear: new Date().getFullYear(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sinan/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sinan/stats"] });
      setIsNewDialogOpen(false);
      form.reset();
      toast({
        title: "Notificação criada",
        description: "A ficha de notificação foi registrada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar notificação",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const getEpidemiologicalWeek = (date: Date): number => {
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Math.ceil(dayOfYear / 7);
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.notificationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.patientCpf && n.patientCpf.includes(searchTerm));

    const matchesAgravo = filterAgravo === "all" || n.agravo === filterAgravo;
    const matchesStatus = filterStatus === "all" || n.status === filterStatus;

    return matchesSearch && matchesAgravo && matchesStatus;
  });

  const handleCitizenSelect = (citizen: Citizen) => {
    form.setValue("patientName", citizen.name);
    form.setValue("patientCpf", citizen.cpf || "");
    form.setValue("patientCns", citizen.cns || "");
    form.setValue("patientBirthDate", citizen.birthDate ? new Date(citizen.birthDate) : undefined);
    const sex = citizen.gender === "M" ? "M" : citizen.gender === "F" ? "F" : "I";
    form.setValue("patientSex", sex);
    form.setValue("patientMotherName", citizen.motherName || "");
    form.setValue("patientPhone", citizen.phone || "");
    form.setValue("patientAddress", citizen.address || "");
    form.setValue("patientNeighborhood", citizen.neighborhood || "");
    form.setValue("patientMunicipalityName", citizen.city || "");
    form.setValue("patientState", citizen.state || "");
    form.setValue("patientCep", "");
    setCitizenSearch("");
  };

  const onSubmit = (data: NotificationFormData) => {
    createMutation.mutate(data);
  };

  const filteredCitizens = citizens.filter(
    (c) =>
      citizenSearch.length >= 3 &&
      (c.name.toLowerCase().includes(citizenSearch.toLowerCase()) ||
        (c.cpf && c.cpf.includes(citizenSearch)))
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            SINAN - Notificações Compulsórias
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema de Informação de Agravos de Notificação
          </p>
        </div>
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-notification">
              <Plus className="h-4 w-4 mr-2" />
              Nova Notificação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Nova Ficha de Notificação Individual
              </DialogTitle>
              <DialogDescription>
                Preencha os dados obrigatórios da ficha de notificação compulsória
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Dados do Agravo
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="agravo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agravo/Doença *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-agravo">
                                  <SelectValue placeholder="Selecione o agravo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <ScrollArea className="h-60">
                                  {Object.entries(AGRAVO_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </ScrollArea>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cidPrimary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CID-10 Principal *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ex: A90"
                                data-testid="input-cid-primary"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="symptomStartDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data Início dos Sintomas</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                                    : "Selecione a data"}
                                  <CalendarIcon className="ml-auto h-4 w-4" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Dados do Paciente
                    </h3>
                    
                    <div className="space-y-2">
                      <Label>Buscar Cidadão Cadastrado</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Digite nome ou CPF (mín. 3 caracteres)"
                          value={citizenSearch}
                          onChange={(e) => setCitizenSearch(e.target.value)}
                          className="pl-9"
                          data-testid="input-citizen-search"
                        />
                      </div>
                      {filteredCitizens.length > 0 && (
                        <div className="border rounded-md max-h-40 overflow-auto">
                          {filteredCitizens.map((citizen) => (
                            <div
                              key={citizen.id}
                              className="p-2 hover-elevate cursor-pointer border-b last:border-b-0"
                              onClick={() => handleCitizenSelect(citizen)}
                            >
                              <div className="font-medium">{citizen.name}</div>
                              <div className="text-sm text-muted-foreground">
                                CPF: {citizen.cpf || "N/I"} | CNS: {citizen.cns || "N/I"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="patientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-patient-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientSex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sexo *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-patient-sex">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Feminino</SelectItem>
                                <SelectItem value="I">Ignorado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="patientCpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="000.000.000-00" data-testid="input-patient-cpf" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientCns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNS</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="000000000000000" data-testid="input-patient-cns" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientBirthDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data de Nascimento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value
                                      ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                                      : "Selecione"}
                                    <CalendarIcon className="ml-auto h-4 w-4" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="patientMotherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Mãe</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-patient-mother" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientRace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Raça/Cor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-patient-race">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="branca">Branca</SelectItem>
                                <SelectItem value="preta">Preta</SelectItem>
                                <SelectItem value="parda">Parda</SelectItem>
                                <SelectItem value="amarela">Amarela</SelectItem>
                                <SelectItem value="indigena">Indígena</SelectItem>
                                <SelectItem value="ignorado">Ignorado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      Endereço
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="patientAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-patient-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientNeighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-patient-neighborhood" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="patientMunicipalityName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Município</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-patient-municipality" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UF</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={2} data-testid="input-patient-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientCep"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="00000-000" data-testid="input-patient-cep" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="patientZone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zona</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-[200px]" data-testid="select-patient-zone">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="urbana">Urbana</SelectItem>
                              <SelectItem value="rural">Rural</SelectItem>
                              <SelectItem value="periurbana">Periurbana</SelectItem>
                              <SelectItem value="ignorado">Ignorado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Informações adicionais relevantes"
                            rows={3}
                            data-testid="textarea-observations"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-notification">
                      {createMutation.isPending ? "Salvando..." : "Salvar Notificação"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Notificações</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Registradas no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.byClassification?.confirmado || 0}
            </div>
            <p className="text-xs text-muted-foreground">Casos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Investigação</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.byClassification?.em_investigacao || 0}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando conclusão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exportadas</CardTitle>
            <Upload className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.byStatus?.exportada || 0}
            </div>
            <p className="text-xs text-muted-foreground">Enviadas ao SINAN</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, número ou CPF"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-notifications"
              />
            </div>
            <Select value={filterAgravo} onValueChange={setFilterAgravo}>
              <SelectTrigger data-testid="select-filter-agravo">
                <SelectValue placeholder="Todos os agravos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os agravos</SelectItem>
                <ScrollArea className="h-60">
                  {Object.entries(AGRAVO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="select-filter-status">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" data-testid="button-export-sinan">
              <Download className="h-4 w-4 mr-2" />
              Exportar DBF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Notificações</CardTitle>
          <CardDescription>
            {filteredNotifications.length} notificação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Nenhuma notificação encontrada</p>
              <p className="text-sm mt-2">
                {searchTerm || filterAgravo !== "all" || filterStatus !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Clique em 'Nova Notificação' para registrar um agravo"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Agravo</TableHead>
                  <TableHead>CID</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((notification) => {
                  const statusKey = notification.status || "rascunho";
                  const classKey = notification.classification || "em_investigacao";
                  const StatusIcon = STATUS_LABELS[statusKey]?.icon || Clock;
                  const classInfo = CLASSIFICATION_LABELS[classKey] || CLASSIFICATION_LABELS.em_investigacao;
                  
                  return (
                    <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                      <TableCell className="font-mono text-sm">
                        {notification.notificationNumber}
                      </TableCell>
                      <TableCell>
                        {notification.notificationDate
                          ? format(new Date(notification.notificationDate), "dd/MM/yyyy", { locale: ptBR })
                          : "N/I"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{notification.patientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {notification.patientCpf || "CPF não informado"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {AGRAVO_LABELS[notification.agravo] || notification.agravo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{notification.cidPrimary}</TableCell>
                      <TableCell>
                        <Badge className={classInfo.color}>{classInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusIcon className={cn("h-4 w-4", STATUS_LABELS[statusKey]?.color)} />
                          <span className="text-sm">
                            {STATUS_LABELS[statusKey]?.label || statusKey}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedNotification(notification)}
                            data-testid={`button-view-${notification.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-edit-${notification.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedNotification}
        onOpenChange={() => setSelectedNotification(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Notificação</DialogTitle>
            <DialogDescription>
              {selectedNotification?.notificationNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Agravo</Label>
                  <p className="font-medium">
                    {AGRAVO_LABELS[selectedNotification.agravo] || selectedNotification.agravo}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CID-10</Label>
                  <p className="font-medium font-mono">{selectedNotification.cidPrimary}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Paciente</Label>
                  <p className="font-medium">{selectedNotification.patientName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sexo</Label>
                  <p className="font-medium">
                    {selectedNotification.patientSex === "M"
                      ? "Masculino"
                      : selectedNotification.patientSex === "F"
                      ? "Feminino"
                      : "Ignorado"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CPF</Label>
                  <p className="font-medium">{selectedNotification.patientCpf || "N/I"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CNS</Label>
                  <p className="font-medium">{selectedNotification.patientCns || "N/I"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Classificação</Label>
                  <Badge
                    className={
                      CLASSIFICATION_LABELS[selectedNotification.classification || "em_investigacao"]
                        .color
                    }
                  >
                    {CLASSIFICATION_LABELS[selectedNotification.classification || "em_investigacao"].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium">
                    {STATUS_LABELS[selectedNotification.status || "rascunho"]?.label || selectedNotification.status}
                  </p>
                </div>
              </div>
              {selectedNotification.observations && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1">{selectedNotification.observations}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNotification(null)}>
              Fechar
            </Button>
            <Button data-testid="button-print-notification">
              <FileCheck className="h-4 w-4 mr-2" />
              Imprimir Ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
