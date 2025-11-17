import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Home, Users, ClipboardList, Plus, MapPin, Building2, Heart } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertDwellingSchema, insertFamilySchema, insertHomeVisitSchema } from "@shared/schema";
import type { Dwelling, Family, HomeVisit } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TerritoryPage() {
  const [activeTab, setActiveTab] = useState("dwellings");
  const [openDwellingDialog, setOpenDwellingDialog] = useState(false);
  const [openFamilyDialog, setOpenFamilyDialog] = useState(false);
  const [openVisitDialog, setOpenVisitDialog] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Gestão Territorial</h1>
          <p className="text-muted-foreground">Sistema inspirado no e-SUS Território</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dwellings" data-testid="tab-dwellings">
            <Home className="w-4 h-4 mr-2" />
            Imóveis
          </TabsTrigger>
          <TabsTrigger value="families" data-testid="tab-families">
            <Users className="w-4 h-4 mr-2" />
            Famílias
          </TabsTrigger>
          <TabsTrigger value="visits" data-testid="tab-visits">
            <ClipboardList className="w-4 h-4 mr-2" />
            Visitas Domiciliares
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dwellings" className="space-y-4">
          <DwellingsSection 
            openDialog={openDwellingDialog} 
            setOpenDialog={setOpenDwellingDialog} 
          />
        </TabsContent>

        <TabsContent value="families" className="space-y-4">
          <FamiliesSection 
            openDialog={openFamilyDialog} 
            setOpenDialog={setOpenFamilyDialog} 
          />
        </TabsContent>

        <TabsContent value="visits" className="space-y-4">
          <VisitsSection 
            openDialog={openVisitDialog} 
            setOpenDialog={setOpenVisitDialog} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DwellingsSection({ openDialog, setOpenDialog }: { openDialog: boolean; setOpenDialog: (v: boolean) => void }) {
  const { data: dwellings = [], isLoading } = useQuery<Dwelling[]>({
    queryKey: ["/api/dwellings"],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Cadastro de Imóveis</h2>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-dwelling">
              <Plus className="w-4 h-4 mr-2" />
              Novo Imóvel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Imóvel</DialogTitle>
              <DialogDescription>Registro de imóvel com geolocalização e características sociossanitárias</DialogDescription>
            </DialogHeader>
            <DwellingForm onSuccess={() => setOpenDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : dwellings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum imóvel cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {dwellings.map((dwelling) => (
            <Card key={dwelling.id} data-testid={`card-dwelling-${dwelling.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {dwelling.street}, {dwelling.number || "S/N"}
                </CardTitle>
                {dwelling.neighborhood && (
                  <CardDescription>{dwelling.neighborhood}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {dwelling.microarea && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" data-testid={`badge-microarea-${dwelling.id}`}>
                      Microárea {dwelling.microarea}
                    </Badge>
                  </div>
                )}
                {dwelling.latitude && dwelling.longitude && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {dwelling.latitude}, {dwelling.longitude}
                  </div>
                )}
                <div className="text-sm">
                  <p><strong>Tipo:</strong> {dwelling.dwellingType || "Não informado"}</p>
                  <p><strong>Moradores:</strong> {dwelling.householdMembers || 0}</p>
                  <p><strong>Saneamento:</strong> {dwelling.sanitation || "Não informado"}</p>
                  <p><strong>Água:</strong> {dwelling.waterSupply || "Não informado"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DwellingForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<z.infer<typeof insertDwellingSchema>>({
    resolver: zodResolver(insertDwellingSchema),
    defaultValues: {
      street: "",
      number: "",
      microarea: "",
      hasElectricity: true,
      hasAnimals: false,
      householdMembers: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertDwellingSchema>) =>
      apiRequest("POST", "/api/dwellings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dwellings"] });
      onSuccess();
      form.reset();
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unitId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Unidade de Saúde (ID)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="UUID da unidade" data-testid="input-unitId" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="microarea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Microárea</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Ex: 01" data-testid="input-microarea" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="00000-000" data-testid="input-zipCode" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Logradouro *</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Rua, Avenida, etc" data-testid="input-street" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="S/N" data-testid="input-number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Bairro" data-testid="input-neighborhood" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="-12.345678" data-testid="input-latitude" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="-38.123456" data-testid="input-longitude" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="householdMembers"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Número de Moradores</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-householdMembers" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar Imóvel"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function FamiliesSection({ openDialog, setOpenDialog }: { openDialog: boolean; setOpenDialog: (v: boolean) => void }) {
  const { data: families = [], isLoading } = useQuery<Family[]>({
    queryKey: ["/api/families"],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Cadastro de Famílias</h2>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-family">
              <Plus className="w-4 h-4 mr-2" />
              Nova Família
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Família</DialogTitle>
              <DialogDescription>Vincular família a um imóvel cadastrado</DialogDescription>
            </DialogHeader>
            <FamilyForm onSuccess={() => setOpenDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : families.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma família cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {families.map((family) => (
            <Card key={family.id} data-testid={`card-family-${family.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Família {family.familyCode || family.id.slice(0, 8)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p><strong>Membros:</strong> {family.memberCount || 0}</p>
                  {family.monthlyIncome && <p><strong>Renda:</strong> {family.monthlyIncome}</p>}
                  {family.notes && <p className="mt-2 text-muted-foreground">{family.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FamilyForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<z.infer<typeof insertFamilySchema>>({
    resolver: zodResolver(insertFamilySchema),
    defaultValues: {
      memberCount: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertFamilySchema>) =>
      apiRequest("POST", "/api/families", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      onSuccess();
      form.reset();
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="dwellingId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imóvel (ID) *</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="UUID do imóvel" data-testid="input-dwellingId" />
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
              <FormLabel>Unidade de Saúde (ID) *</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="UUID da unidade" data-testid="input-family-unitId" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="familyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código da Família</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Ex: FAM001" data-testid="input-familyCode" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="memberCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Membros</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  data-testid="input-memberCount" 
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
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} placeholder="Observações sobre a família" data-testid="input-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-family">
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar Família"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function VisitsSection({ openDialog, setOpenDialog }: { openDialog: boolean; setOpenDialog: (v: boolean) => void }) {
  const { data: visits = [], isLoading } = useQuery<HomeVisit[]>({
    queryKey: ["/api/home-visits"],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Visitas Domiciliares</h2>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-visit">
              <Plus className="w-4 h-4 mr-2" />
              Nova Visita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Visita Domiciliar</DialogTitle>
              <DialogDescription>Registro de visita com dados de saúde e geolocalização</DialogDescription>
            </DialogHeader>
            <VisitForm onSuccess={() => setOpenDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma visita registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visits.map((visit) => (
            <Card key={visit.id} data-testid={`card-visit-${visit.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    Visita {visit.visitType}
                  </CardTitle>
                  <Badge variant={visit.wasSuccessful ? "default" : "destructive"}>
                    {visit.wasSuccessful ? "Realizada" : "Recusada"}
                  </Badge>
                </div>
                <CardDescription>
                  {format(new Date(visit.visitDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p><strong>Motivo:</strong> {visit.visitMotive}</p>
                  {visit.bloodPressure && <p><strong>PA:</strong> {visit.bloodPressure}</p>}
                  {visit.temperature && <p><strong>Temp:</strong> {visit.temperature}°C</p>}
                  {visit.bloodGlucose && <p><strong>Glicemia:</strong> {visit.bloodGlucose} mg/dL</p>}
                  {visit.observations && (
                    <p className="mt-2 text-muted-foreground">{visit.observations}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VisitForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<z.infer<typeof insertHomeVisitSchema>>({
    resolver: zodResolver(insertHomeVisitSchema),
    defaultValues: {
      wasSuccessful: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertHomeVisitSchema>) =>
      apiRequest("POST", "/api/home-visits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-visits"] });
      onSuccess();
      form.reset();
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="visitType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Visita *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-visitType">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="familiar">Familiar</SelectItem>
                    <SelectItem value="imovel">Imóvel</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visitMotive"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-visitMotive">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="busca_ativa">Busca Ativa</SelectItem>
                    <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                    <SelectItem value="periodica">Periódica</SelectItem>
                    <SelectItem value="controle_ambiental">Controle Ambiental</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Agente (ID) *</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="UUID do profissional" data-testid="input-agentId" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Unidade (ID) *</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="UUID da unidade" data-testid="input-visit-unitId" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bloodPressure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pressão Arterial</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="120/80" data-testid="input-bloodPressure" />
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
                <FormLabel>Temperatura</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="36.5" data-testid="input-temperature" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bloodGlucose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Glicemia</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="100" data-testid="input-bloodGlucose" />
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
                  <Input {...field} value={field.value || ""} placeholder="70" data-testid="input-weight" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value || ""} placeholder="Observações da visita" data-testid="input-observations" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-visit">
            {createMutation.isPending ? "Registrando..." : "Registrar Visita"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
