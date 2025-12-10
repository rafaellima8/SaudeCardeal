import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserCog, Edit, Plus, Trash2, Building2 } from "lucide-react";
import { z } from "zod";
import type { Professional, HealthUnit } from "@shared/schema";

const professionalSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cpf: z.string().min(11, "CPF obrigatório"),
  specialty: z.string().min(1, "Especialidade obrigatória"),
  cns: z.string().optional().or(z.literal("")),
  councilType: z.string().min(1, "Tipo de conselho obrigatório"),
  councilNumber: z.string().min(1, "Número do conselho obrigatório"),
  councilState: z.string().min(2, "UF do conselho obrigatória"),
  cboCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  unitId: z.string().uuid("Selecione uma unidade válida"),
  teamINE: z.string().optional(),
  active: z.boolean().default(true),
});

type ProfessionalForm = z.infer<typeof professionalSchema>;

export default function Professionals() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfessionalForm>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: "",
      cpf: "",
      specialty: "",
      cns: "",
      councilType: "CRM",
      councilNumber: "",
      councilState: "BA",
      cboCode: "",
      phone: "",
      email: "",
      unitId: "",
      teamINE: "",
      active: true,
    },
  });

  const { data: units = [] } = useQuery<HealthUnit[]>({
    queryKey: ["/api/health-units"],
  });

  const { data: professionals = [], isLoading } = useQuery<Professional[]>({
    queryKey: ["/api/professionals", selectedUnit !== "all" ? selectedUnit : undefined],
    queryFn: async () => {
      const url = selectedUnit !== "all" 
        ? `/api/professionals?unitId=${selectedUnit}` 
        : "/api/professionals";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar profissionais");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProfessionalForm) => {
      const response = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar profissional");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Profissional criado",
        description: "O profissional foi criado com sucesso",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProfessionalForm> }) => {
      const response = await fetch(`/api/professionals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar profissional");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Profissional atualizado",
        description: "O profissional foi atualizado com sucesso",
      });
      setIsDialogOpen(false);
      setEditingProfessional(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/professionals/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir profissional");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Profissional excluído",
        description: "O profissional foi excluído com sucesso",
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

  const onSubmit = (data: ProfessionalForm) => {
    if (editingProfessional) {
      updateMutation.mutate({ id: editingProfessional.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    form.reset({
      name: professional.name,
      cpf: professional.cpf || "",
      specialty: professional.specialty || "",
      cns: professional.cns || "",
      councilType: professional.councilType || "CRM",
      councilNumber: professional.councilNumber || "",
      councilState: professional.councilState || "BA",
      cboCode: professional.cboCode || "",
      phone: professional.phone || "",
      email: professional.email || "",
      unitId: professional.unitId || "",
      teamINE: professional.teamINE || "",
      active: professional.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este profissional?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProfessional(null);
    form.reset();
  };

  const getUnitName = (unitId: string | null) => {
    if (!unitId) return "Sem unidade";
    const unit = units.find(u => u.id === unitId);
    return unit?.name || "Unidade desconhecida";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profissionais de Saúde</h1>
          <p className="text-muted-foreground">Gerencie os profissionais cadastrados no sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (open) {
            setEditingProfessional(null);
            form.reset();
            setIsDialogOpen(true);
          } else {
            handleDialogClose();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-professional">
              <Plus className="mr-2 h-4 w-4" />
              Novo Profissional
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingProfessional ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
              <DialogDescription>
                {editingProfessional ? "Atualize as informações do profissional" : "Preencha os dados do novo profissional"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Médico Clínico Geral" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNS (Cartão Nacional de Saúde)</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789012345" maxLength={15} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="councilType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Conselho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o conselho" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CRM">CRM - Conselho Regional de Medicina</SelectItem>
                          <SelectItem value="COREN">COREN - Conselho Regional de Enfermagem</SelectItem>
                          <SelectItem value="CRF">CRF - Conselho Regional de Farmácia</SelectItem>
                          <SelectItem value="CRO">CRO - Conselho Regional de Odontologia</SelectItem>
                          <SelectItem value="CREFITO">CREFITO - Conselho de Fisioterapia</SelectItem>
                          <SelectItem value="CRP">CRP - Conselho Regional de Psicologia</SelectItem>
                          <SelectItem value="CRESS">CRESS - Conselho de Serviço Social</SelectItem>
                          <SelectItem value="CRN">CRN - Conselho de Nutricionistas</SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="councilNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Conselho</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="councilState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF do Conselho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
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
                      <FormLabel>Unidade de Saúde</FormLabel>
                      <FormControl>
                        <Combobox
                          value={field.value}
                          onValueChange={field.onChange}
                          options={units.map((unit) => ({
                            value: unit.id,
                            label: unit.name
                          }))}
                          placeholder="Selecione uma unidade"
                          searchPlaceholder="Buscar unidade..."
                          emptyMessage="Nenhuma unidade encontrada"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingProfessional ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <Combobox
            value={selectedUnit}
            onValueChange={setSelectedUnit}
            options={[
              { value: "all", label: "Todas as unidades" },
              ...units.map((unit) => ({
                value: unit.id,
                label: unit.name
              }))
            ]}
            placeholder="Filtrar por unidade"
            searchPlaceholder="Buscar unidade..."
            emptyMessage="Nenhuma unidade encontrada"
            className="w-[300px]"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profissionais Cadastrados</CardTitle>
          <CardDescription>
            Total de {professionals.length} {professionals.length === 1 ? "profissional" : "profissionais"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : professionals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>Nenhum profissional cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>CNS</TableHead>
                  <TableHead>Conselho</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.map((professional) => (
                  <TableRow key={professional.id}>
                    <TableCell className="font-medium">{professional.name}</TableCell>
                    <TableCell>{professional.specialty || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{professional.cns || "-"}</TableCell>
                    <TableCell>{professional.councilType}/{professional.councilNumber || "-"}</TableCell>
                    <TableCell>{getUnitName(professional.unitId)}</TableCell>
                    <TableCell>
                      <Badge variant={professional.active ? "default" : "secondary"}>
                        {professional.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(professional)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(professional.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
