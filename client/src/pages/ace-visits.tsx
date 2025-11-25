import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAceVisitSchema, type AceVisit } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, MapPin, Activity } from "lucide-react";
import { format } from "date-fns";

// Helper to create optional numeric field that treats "" as undefined
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().min(min).max(max).optional()
  );

// Form schema with validation
const visitFormSchema = insertAceVisitSchema.extend({
  visitDate: z.string().min(1, "Data é obrigatória"),
  dwellingId: z.string().uuid("Selecione um imóvel"),
  professionalId: z.string().uuid("Selecione um profissional"),
  unitId: z.string().uuid("Selecione uma unidade"),
  temperature: optionalNumber(0, 50),
  bloodPressureSystolic: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(0).max(300).optional()
  ),
  bloodPressureDiastolic: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(0).max(200).optional()
  ),
  heartRate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(0).max(250).optional()
  ),
  respiratoryRate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(0).max(100).optional()
  ),
  bloodGlucose: optionalNumber(0, 600),
  weight: optionalNumber(0, 500),
  height: optionalNumber(0, 300),
});

type VisitFormData = z.infer<typeof visitFormSchema>;

export default function AceVisitsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<AceVisit | null>(null);

  // Fetch visits
  const { data: visits = [], isLoading: visitsLoading } = useQuery<AceVisit[]>({
    queryKey: ["/api/ace/visits"],
  });

  // Fetch dwellings for selection
  const { data: dwellings = [], isLoading: dwellingsLoading } = useQuery<any[]>({
    queryKey: ["/api/ace/dwellings"],
  });

  // Fetch professionals for selection
  const { data: professionals = [], isLoading: professionalsLoading } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
  });

  // Fetch units for selection
  const { data: units = [], isLoading: unitsLoading } = useQuery<any[]>({
    queryKey: ["/api/units"],
  });

  const form = useForm<VisitFormData>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      visitDate: "",
      dwellingId: "",
      professionalId: "",
      unitId: "",
      visitType: "",
      visitMotive: "",
      latitude: "",
      longitude: "",
      temperature: "" as any,
      bloodPressureSystolic: "" as any,
      bloodPressureDiastolic: "" as any,
      heartRate: "" as any,
      respiratoryRate: "" as any,
      bloodGlucose: "" as any,
      weight: "" as any,
      height: "" as any,
      observations: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: VisitFormData) => {
      const response = await fetch("/api/ace/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar visita");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ace/visits"] });
      toast({
        title: "Visita criada",
        description: "Visita domiciliar registrada com sucesso.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar visita",
        description: error.message || "Ocorreu um erro ao criar a visita.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VisitFormData> }) => {
      const response = await fetch(`/api/ace/visits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar visita");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ace/visits"] });
      toast({
        title: "Visita atualizada",
        description: "Visita atualizada com sucesso.",
      });
      setOpen(false);
      setEditingVisit(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar visita",
        description: error.message || "Ocorreu um erro ao atualizar a visita.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ace/visits/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar visita");
      // DELETE returns 204 No Content, no body to parse
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ace/visits"] });
      toast({
        title: "Visita excluída",
        description: "Visita excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir visita",
        description: error.message || "Ocorreu um erro ao excluir a visita.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VisitFormData) => {
    // z.preprocess already converts empty strings to undefined
    if (editingVisit) {
      updateMutation.mutate({ id: editingVisit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (visit: AceVisit) => {
    setEditingVisit(visit);
    form.reset({
      visitDate: visit.visitDate ? new Date(Number(visit.visitDate) * 1000).toISOString().slice(0, 16) : "",
      dwellingId: visit.dwellingId,
      professionalId: visit.professionalId,
      unitId: visit.unitId,
      visitType: visit.visitType ?? "",
      visitMotive: visit.visitMotive ?? "",
      // Preserve zero values by converting to string (0 becomes "0", null/undefined becomes "")
      latitude: visit.latitude !== null && visit.latitude !== undefined ? visit.latitude.toString() : "",
      longitude: visit.longitude !== null && visit.longitude !== undefined ? visit.longitude.toString() : "",
      temperature: visit.temperature !== null && visit.temperature !== undefined ? visit.temperature.toString() : ("" as any),
      bloodPressureSystolic: visit.bloodPressureSystolic !== null && visit.bloodPressureSystolic !== undefined ? visit.bloodPressureSystolic.toString() : ("" as any),
      bloodPressureDiastolic: visit.bloodPressureDiastolic !== null && visit.bloodPressureDiastolic !== undefined ? visit.bloodPressureDiastolic.toString() : ("" as any),
      heartRate: visit.heartRate !== null && visit.heartRate !== undefined ? visit.heartRate.toString() : ("" as any),
      respiratoryRate: visit.respiratoryRate !== null && visit.respiratoryRate !== undefined ? visit.respiratoryRate.toString() : ("" as any),
      bloodGlucose: visit.bloodGlucose !== null && visit.bloodGlucose !== undefined ? visit.bloodGlucose.toString() : ("" as any),
      weight: visit.weight !== null && visit.weight !== undefined ? visit.weight.toString() : ("" as any),
      height: visit.height !== null && visit.height !== undefined ? visit.height.toString() : ("" as any),
      observations: visit.observations ?? "",
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta visita?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("latitude", position.coords.latitude.toString());
          form.setValue("longitude", position.coords.longitude.toString());
          toast({
            title: "Localização obtida",
            description: `Lat: ${position.coords.latitude.toFixed(6)}, Long: ${position.coords.longitude.toFixed(6)}`,
          });
        },
        (error) => {
          toast({
            title: "Erro ao obter localização",
            description: error.message,
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "GPS não suportado",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive",
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isAnyLoading = dwellingsLoading || professionalsLoading || unitsLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visitas ACE</h1>
          <p className="text-muted-foreground">Registro de visitas domiciliares para controle de endemias</p>
        </div>
        <Dialog open={open} onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            setEditingVisit(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-visit" disabled={isAnyLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Visita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title-visit">
                {editingVisit ? "Editar Visita" : "Nova Visita Domiciliar"}
              </DialogTitle>
              <DialogDescription>
                Registre uma visita domiciliar com sinais vitais e observações.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dwelling Selection */}
                  <FormField
                    control={form.control}
                    name="dwellingId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Imóvel *</FormLabel>
                        <FormControl>
                          <Combobox
                            value={field.value}
                            onValueChange={field.onChange}
                            options={dwellings.map((dwelling: any) => ({
                              value: dwelling.id,
                              label: `${dwelling.street} ${dwelling.number} - ${dwelling.neighborhood}`
                            }))}
                            placeholder="Selecione o imóvel"
                            searchPlaceholder="Buscar imóvel..."
                            emptyMessage="Nenhum imóvel encontrado"
                            data-testid="select-dwelling"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Professional Selection */}
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
                            options={professionals.map((prof: any) => ({
                              value: prof.id,
                              label: `${prof.name} - ${prof.specialty}`
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

                  {/* Unit Selection */}
                  <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade *</FormLabel>
                        <FormControl>
                          <Combobox
                            value={field.value}
                            onValueChange={field.onChange}
                            options={units.map((unit: any) => ({
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

                  {/* Visit Date */}
                  <FormField
                    control={form.control}
                    name="visitDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data e Hora *</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            data-testid="input-visit-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Visit Type */}
                  <FormField
                    control={form.control}
                    name="visitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Visita</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Rotina, Focal, etc."
                            data-testid="input-visit-type"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Visit Motive */}
                  <FormField
                    control={form.control}
                    name="visitMotive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo da Visita</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Motivo principal"
                            data-testid="input-visit-motive"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Geolocation Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Geolocalização
                    </CardTitle>
                    <CardDescription>Coordenadas GPS do local da visita</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetLocation}
                      data-testid="button-get-location"
                      className="w-full md:w-auto"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Obter Localização Atual
                    </Button>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="-12.345678"
                                data-testid="input-latitude"
                                {...field}
                                value={field.value || ""}
                              />
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
                              <Input
                                placeholder="-38.123456"
                                data-testid="input-longitude"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Vital Signs Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Sinais Vitais
                    </CardTitle>
                    <CardDescription>Medições realizadas durante a visita</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                              data-testid="input-temperature"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              data-testid="input-bp-systolic"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseInt(e.target.value))}
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
                              data-testid="input-bp-diastolic"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseInt(e.target.value))}
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
                              data-testid="input-heart-rate"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseInt(e.target.value))}
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
                              data-testid="input-respiratory-rate"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseInt(e.target.value))}
                            />
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
                          <FormLabel>Glicemia (mg/dL)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="100"
                              data-testid="input-blood-glucose"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
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
                              data-testid="input-weight"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
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
                              data-testid="input-height"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Observations */}
                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações gerais sobre a visita..."
                          className="min-h-[100px]"
                          data-testid="textarea-observations"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setEditingVisit(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending} data-testid="button-submit">
                    {isPending ? "Salvando..." : editingVisit ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Visitas</CardTitle>
          <CardDescription>
            Histórico de visitas domiciliares realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visitsLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="loading-visits">
              Carregando visitas...
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-visits">
              Nenhuma visita registrada ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sinais Vitais</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit: any) => (
                  <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                    <TableCell data-testid={`cell-date-${visit.id}`}>
                      {visit.visitDate ? format(new Date(visit.visitDate * 1000), "dd/MM/yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell data-testid={`cell-dwelling-${visit.id}`}>
                      {visit.dwelling_street} {visit.dwelling_number}
                    </TableCell>
                    <TableCell data-testid={`cell-professional-${visit.id}`}>
                      {visit.professional_name || "-"}
                    </TableCell>
                    <TableCell data-testid={`cell-type-${visit.id}`}>
                      {visit.visitType || "-"}
                    </TableCell>
                    <TableCell data-testid={`cell-vitals-${visit.id}`}>
                      {visit.temperature && `T: ${visit.temperature}°C `}
                      {visit.bloodPressureSystolic && visit.bloodPressureDiastolic && 
                        `PA: ${visit.bloodPressureSystolic}/${visit.bloodPressureDiastolic} `}
                      {visit.heartRate && `FC: ${visit.heartRate} `}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(visit)}
                          data-testid={`button-edit-${visit.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(visit.id)}
                          data-testid={`button-delete-${visit.id}`}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
