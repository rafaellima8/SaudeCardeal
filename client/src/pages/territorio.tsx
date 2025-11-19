import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Users, Calendar, Plus, MapPin, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { insertDwellingSchema, insertHomeVisitSchema } from "@shared/schema";

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

type DwellingFormData = z.infer<typeof dwellingFormSchema>;
type HomeVisitFormData = z.infer<typeof homeVisitFormSchema>;

interface Dwelling {
  id: string;
  microarea: string;
  address: string;
  number?: string;
  neighborhood: string;
  dwellingType: string;
  familiesCount: number;
  hasElectricity: boolean;
  hasAnimals: boolean;
}

interface HomeVisit {
  id: string;
  visitDate: string;
  visitType: string;
  visitMotive?: string;
  professionalId: string;
  findings?: string;
}

export default function TerritoryPage() {
  const [dwellingDialogOpen, setDwellingDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMicroarea, setSelectedMicroarea] = useState<string>("all");
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
      sanitation: "rede_esgoto",
      waterSupply: "rede_publica",
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

  const onDwellingSubmit = (data: DwellingFormData) => {
    createDwellingMutation.mutate(data);
  };

  const onVisitSubmit = (data: HomeVisitFormData) => {
    createVisitMutation.mutate(data);
  };

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
                    <Button type="button" variant="outline" onClick={() => setVisitDialogOpen(false)} data-testid="button-cancel-visit">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createVisitMutation.isPending} data-testid="button-submit-visit">
                      {createVisitMutation.isPending ? "Registrando..." : "Registrar Visita"}
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
                <DialogTitle>Cadastrar Domicílio</DialogTitle>
                <DialogDescription>
                  Cadastre um novo domicílio no território
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
                            <Input placeholder="123" {...field} data-testid="input-number" />
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
                            <Input placeholder="Apt 201" {...field} data-testid="input-complement" />
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
                            <Input placeholder="48340-000" {...field} data-testid="input-zipcode" />
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                              checked={field.value}
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
                              checked={field.value}
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
                    <Button type="button" variant="outline" onClick={() => setDwellingDialogOpen(false)} data-testid="button-cancel-dwelling">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createDwellingMutation.isPending} data-testid="button-submit-dwelling">
                      {createDwellingMutation.isPending ? "Cadastrando..." : "Cadastrar"}
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
          <TabsTrigger value="visits" data-testid="tab-visits">Visitas</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
