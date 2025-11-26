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
import { FileText, Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

const templateSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  careLineId: z.string().optional(),
  specialtyId: z.string().optional(),
  active: z.boolean().default(true),
  matchRules: z.object({
    ciap2Codes: z.array(z.string()).optional(),
    cid10Codes: z.array(z.string()).optional(),
    ageRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    gender: z.enum(["M", "F", "outro"]).optional(),
  }).optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function DynamicFormsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/consultation-templates"],
  });

  const { data: templateFields = [] } = useQuery({
    queryKey: ["/api/consultation-templates", selectedTemplate, "fields"],
    enabled: !!selectedTemplate,
  });

  const { data: careLines = [] } = useQuery({
    queryKey: ["/api/care-lines"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest("POST", "/api/consultation-templates", data);
    },
    onSuccess: () => {
      toast({ title: "Template criado", description: "Formulário dinâmico criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-templates"] });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      return apiRequest("PATCH", `/api/consultation-templates/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Template atualizado" });
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/consultation-templates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Template excluído" });
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-templates"] });
    },
  });

  const handleSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      careLineId: template.careLineId || undefined,
      specialtyId: template.specialtyId || undefined,
      active: template.active,
      matchRules: template.matchRules || {},
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este template? Os campos também serão excluídos.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Formulários Dinâmicos</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTemplate(null); form.reset(); }} data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Formulário"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Template</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Pré-natal 1º Trimestre" data-testid="input-template-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Descrição do formulário" rows={2} data-testid="textarea-description" />
                      </FormControl>
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
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-care-line">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {careLines.map((line: any) => (
                            <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        O formulário será exibido automaticamente quando a linha de cuidado for selecionada
                      </FormDescription>
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
                        <FormLabel>Template Ativo</FormLabel>
                        <p className="text-sm text-muted-foreground">Disponível para uso nos atendimentos</p>
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
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-template">
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingTemplate ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">Nenhum template cadastrado</p>
              <p className="text-sm text-muted-foreground">Clique em "Novo Template" para começar</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template: any) => (
            <Card
              key={template.id}
              className={selectedTemplate === template.id ? "border-primary" : ""}
              data-testid={`card-template-${template.id}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  {!template.active && <Badge variant="outline">Inativo</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(template.id === selectedTemplate ? null : template.id)}
                    data-testid={`button-view-fields-${template.id}`}
                  >
                    {template.fieldCount || 0} campos
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} data-testid={`button-edit-${template.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${template.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {template.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardContent>
              )}

              {selectedTemplate === template.id && templateFields.length > 0 && (
                <CardContent className="border-t">
                  <h4 className="font-semibold mb-2">Campos do formulário:</h4>
                  <div className="space-y-2">
                    {templateFields.map((field: any) => (
                      <div key={field.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{field.fieldLabel}</span>
                        <Badge variant="outline">{field.fieldType}</Badge>
                        {field.required && <Badge variant="secondary">Obrigatório</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
