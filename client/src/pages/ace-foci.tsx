import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAceFocusSchema, type AceFocus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MapPin, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

// Helper to create optional numeric field that treats "" as undefined
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(min).max(max).optional()
  );

// Form schema with validation (custom schema, não usa insertAceFocusSchema)
const focusFormSchema = z.object({
  visitId: z.string().uuid("Selecione uma visita"),
  dwellingId: z.string().uuid("Selecione um imóvel"),
  fociType: z.string().min(1, "Tipo de foco é obrigatório"),
  locationDescription: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  quantity: optionalNumber(0, 1000),
  actionTaken: z.string().optional(),
  status: z.enum(["active", "resolved", "monitoring"]).default("active"),
  notes: z.string().optional(),
});

type FocusFormData = z.infer<typeof focusFormSchema>;

const FOCI_TYPES = [
  { value: "A1", label: "A1 - Depósito elevado" },
  { value: "A2", label: "A2 - Depósito ao nível do solo" },
  { value: "B", label: "B - Depósitos móveis" },
  { value: "C", label: "C - Depósitos fixos" },
  { value: "D1", label: "D1 - Pneus e outros" },
  { value: "D2", label: "D2 - Lixo e entulhos" },
  { value: "E", label: "E - Naturais" },
];

const STATUS_CONFIG = {
  active: { label: "Ativo", icon: AlertCircle, color: "destructive" as const },
  monitoring: { label: "Monitoramento", icon: Clock, color: "default" as const },
  resolved: { label: "Resolvido", icon: CheckCircle, color: "default" as const },
};

export default function AceFociPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingFocus, setEditingFocus] = useState<AceFocus | null>(null);

  const form = useForm<FocusFormData>({
    resolver: zodResolver(focusFormSchema),
    defaultValues: {
      visitId: "",
      dwellingId: "",
      fociType: "",
      locationDescription: "",
      latitude: "",
      longitude: "",
      quantity: undefined,
      actionTaken: "",
      status: "active",
      notes: "",
    },
  });

  // Fetch visits for dropdown
  const { data: visits = [], isLoading: visitsLoading } = useQuery<any[]>({
    queryKey: ["/api/ace/visits"],
  });

  // Fetch dwellings for dropdown
  const { data: dwellings = [], isLoading: dwellingsLoading } = useQuery<any[]>({
    queryKey: ["/api/ace/dwellings"],
  });

  // Fetch foci list
  const { data: foci = [], isLoading: fociLoading } = useQuery<AceFocus[]>({
    queryKey: ["/api/ace/foci"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FocusFormData) => {
      const response = await fetch("/api/ace/foci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar foco");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ace/foci"] });
      toast({
        title: "Foco registrado",
        description: "Foco vetorial registrado com sucesso.",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar foco",
        description: error.message || "Ocorreu um erro ao registrar o foco.",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/ace/foci/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ace/foci"] });
      toast({
        title: "Status atualizado",
        description: "Status do foco atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FocusFormData) => {
    createMutation.mutate(data);
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

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">ACE Focos Vetoriais</h1>
          <p className="text-muted-foreground">Registro e monitoramento de focos de vetores</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={visitsLoading || dwellingsLoading}
          data-testid="button-new-focus"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Foco
        </Button>
      </div>

      {/* Foci Table */}
      <Card>
        <CardHeader>
          <CardTitle>Focos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {fociLoading ? (
            <p className="text-muted-foreground" data-testid="text-loading">Carregando focos...</p>
          ) : foci.length === 0 ? (
            <p className="text-muted-foreground" data-testid="text-empty">Nenhum foco registrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {foci.map((focus) => {
                  const statusConfig = STATUS_CONFIG[focus.status];
                  const StatusIcon = statusConfig.icon;
                  const fociTypeLabel = FOCI_TYPES.find(t => t.value === focus.fociType)?.label || focus.fociType;

                  return (
                    <TableRow key={focus.id} data-testid={`row-focus-${focus.id}`}>
                      <TableCell data-testid={`text-foci-type-${focus.id}`}>
                        <span className="font-medium">{fociTypeLabel}</span>
                      </TableCell>
                      <TableCell data-testid={`text-dwelling-${focus.id}`}>
                        {focus.dwellingId}
                      </TableCell>
                      <TableCell data-testid={`text-quantity-${focus.id}`}>
                        {focus.quantity}
                      </TableCell>
                      <TableCell data-testid={`badge-status-${focus.id}`}>
                        <Badge variant={statusConfig.color} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-location-${focus.id}`}>
                        {focus.latitude && focus.longitude ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {Number(focus.latitude).toFixed(6)}, {Number(focus.longitude).toFixed(6)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sem localização</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-date-${focus.id}`}>
                        {format(new Date(Number(focus.createdAt) * 1000), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={focus.status}
                          onValueChange={(value) => handleStatusChange(focus.id, value)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-[150px]" data-testid={`select-status-${focus.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active" data-testid={`option-active-${focus.id}`}>Ativo</SelectItem>
                            <SelectItem value="monitoring" data-testid={`option-monitoring-${focus.id}`}>Monitoramento</SelectItem>
                            <SelectItem value="resolved" data-testid={`option-resolved-${focus.id}`}>Resolvido</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingFocus ? "Editar Foco" : "Novo Foco Vetorial"}
            </DialogTitle>
            <DialogDescription>
              Registre um novo foco de vetor encontrado durante visita domiciliar
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visita *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={visitsLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-visit">
                            <SelectValue placeholder={visitsLoading ? "Carregando..." : "Selecione uma visita"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {visits.map((visit) => (
                            <SelectItem key={visit.id} value={visit.id} data-testid={`option-visit-${visit.id}`}>
                              {format(new Date(visit.visitDate * 1000), "dd/MM/yyyy HH:mm")}
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
                  name="dwellingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imóvel *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={dwellingsLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-dwelling">
                            <SelectValue placeholder={dwellingsLoading ? "Carregando..." : "Selecione um imóvel"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dwellings.map((dwelling) => (
                            <SelectItem key={dwelling.id} value={dwelling.id} data-testid={`option-dwelling-${dwelling.id}`}>
                              {dwelling.street}, {dwelling.number} - {dwelling.neighborhood}
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
                  control={form.control}
                  name="fociType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Foco *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-foci-type">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FOCI_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value} data-testid={`option-type-${type.value}`}>
                              {type.label}
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
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="1"
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
                name="locationDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição da Localização</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Quintal, cozinha, banheiro..."
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-location-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: -12.345678"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-latitude"
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
                          placeholder="Ex: -38.123456"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-longitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                className="w-full"
                data-testid="button-get-location"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Obter Localização Atual (GPS)
              </Button>

              <FormField
                control={form.control}
                name="actionTaken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ação Realizada</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva as ações tomadas para eliminar o foco..."
                        {...field}
                        value={field.value ?? ""}
                        data-testid="textarea-action-taken"
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
                      <Textarea
                        placeholder="Observações adicionais..."
                        {...field}
                        value={field.value ?? ""}
                        data-testid="textarea-notes"
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
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "Salvando..." : "Salvar Foco"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
