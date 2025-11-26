import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const protocolSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  alertMessage: z.string().min(10, "Mensagem deve ter no mínimo 10 caracteres"),
  alertLevel: z.enum(["info", "warning", "critical"]),
  specialtyId: z.string().optional(),
  careLineId: z.string().optional(),
  active: z.boolean().default(true),
  triggerCondition: z.array(z.object({
    field: z.string(),
    operator: z.enum(["eq", "gt", "lt", "gte", "lte", "contains"]),
    value: z.any(),
  })).optional(),
  action: z.string().optional(),
});

type ProtocolFormData = z.infer<typeof protocolSchema>;

export default function ClinicalProtocols() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<any>(null);

  const form = useForm<ProtocolFormData>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      name: "",
      alertMessage: "",
      alertLevel: "info",
      active: true,
      triggerCondition: [],
    },
  });

  const { data: protocols = [] } = useQuery<any[]>({
    queryKey: ["/api/clinical-protocols"],
  });

  const { data: careLines = [] } = useQuery<any[]>({
    queryKey: ["/api/care-lines"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProtocolFormData) => {
      return apiRequest("POST", "/api/clinical-protocols", data);
    },
    onSuccess: () => {
      toast({ title: "Protocolo criado", description: "Protocolo clínico criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar protocolo", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProtocolFormData> }) => {
      return apiRequest("PATCH", `/api/clinical-protocols/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Protocolo atualizado", description: "Protocolo clínico atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
      setIsDialogOpen(false);
      setEditingProtocol(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/clinical-protocols/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Protocolo excluído", description: "Protocolo clínico excluído com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/clinical-protocols/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
    },
  });

  const handleSubmit = (data: ProtocolFormData) => {
    if (editingProtocol) {
      updateMutation.mutate({ id: editingProtocol.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (protocol: any) => {
    setEditingProtocol(protocol);
    form.reset({
      name: protocol.name,
      alertMessage: protocol.alertMessage,
      alertLevel: protocol.alertLevel,
      specialtyId: protocol.specialtyId || undefined,
      careLineId: protocol.careLineId || undefined,
      active: protocol.active,
      triggerCondition: protocol.triggerCondition || [],
      action: protocol.action || undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este protocolo?")) {
      deleteMutation.mutate(id);
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case "critical": return "destructive";
      case "warning": return "default";
      case "info": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Protocolos Clínicos</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingProtocol(null); form.reset(); }} data-testid="button-create-protocol">
              <Plus className="h-4 w-4 mr-2" />
              Novo Protocolo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProtocol ? "Editar Protocolo" : "Novo Protocolo Clínico"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Protocolo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Hipertensão Arterial Grave" data-testid="input-protocol-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem de Alerta</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Mensagem exibida ao profissional" rows={3} data-testid="textarea-alert-message" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="alertLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Alerta</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-alert-level">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="info">Informativo</SelectItem>
                            <SelectItem value="warning">Atenção</SelectItem>
                            <SelectItem value="critical">Crítico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="careLineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Linha de Cuidado (Opcional)</FormLabel>
                        <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                          <FormControl>
                            <SelectTrigger data-testid="select-care-line">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {careLines.map((line: any) => (
                              <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ação Recomendada (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Ex: Encaminhar para cardiologista" rows={2} data-testid="textarea-action" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Protocolo Ativo</FormLabel>
                        <p className="text-sm text-muted-foreground">Ativar verificações automáticas</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-protocol">
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingProtocol ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {protocols.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">Nenhum protocolo cadastrado</p>
              <p className="text-sm text-muted-foreground">Clique em "Novo Protocolo" para começar</p>
            </CardContent>
          </Card>
        ) : (
          protocols.map((protocol: any) => (
            <Card key={protocol.id} data-testid={`card-protocol-${protocol.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{protocol.name}</CardTitle>
                  <Badge variant={getAlertLevelColor(protocol.alertLevel) as any}>
                    {protocol.alertLevel === "critical" && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {protocol.alertLevel === "critical" ? "Crítico" : protocol.alertLevel === "warning" ? "Atenção" : "Info"}
                  </Badge>
                  {!protocol.active && <Badge variant="outline">Inativo</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={protocol.active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: protocol.id, active: checked })}
                    data-testid={`switch-active-${protocol.id}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(protocol)} data-testid={`button-edit-${protocol.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(protocol.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${protocol.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{protocol.alertMessage}</p>
                {protocol.action && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <p className="text-sm"><strong>Ação recomendada:</strong> {protocol.action}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
