import { useState } from "react";
import { useQuery, useMutation } from "@tantml:parameter>@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Edit, Trash2, Home, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertAceDwellingSchema, type AceDwelling } from "@shared/schema";

const formSchema = insertAceDwellingSchema.extend({
  street: z.string().min(1, "Rua é obrigatória"),
  unitId: z.string().min(1, "Unidade é obrigatória"),
  householdMembers: z.coerce.number().min(0, "Deve ser um número válido"),
});

type FormData = z.infer<typeof formSchema>;

export default function AceDwellings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDwelling, setSelectedDwelling] = useState<AceDwelling | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      zipCode: "",
      microarea: "",
      latitude: "",
      longitude: "",
      dwellingType: "",
      sanitation: "",
      waterSupply: "",
      hasElectricity: true,
      hasAnimals: false,
      animalTypes: [],
      householdMembers: 0,
      notes: "",
      unitId: "",
    },
  });

  const { data: dwellings, isLoading } = useQuery<AceDwelling[]>({
    queryKey: ['/api/ace/dwellings'],
  });

  const { data: units } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/units'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/ace/dwellings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ace/dwellings'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Imóvel cadastrado",
        description: "Imóvel ACE cadastrado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      return await apiRequest("PATCH", `/api/ace/dwellings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ace/dwellings'] });
      setIsDialogOpen(false);
      setSelectedDwelling(null);
      form.reset();
      toast({
        title: "Imóvel atualizado",
        description: "Imóvel ACE atualizado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/ace/dwellings/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ace/dwellings'] });
      setIsDeleteDialogOpen(false);
      setSelectedDwelling(null);
      toast({
        title: "Imóvel excluído",
        description: "Imóvel ACE excluído com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    },
  });

  const handleOpenDialog = (dwelling?: AceDwelling) => {
    if (dwelling) {
      setSelectedDwelling(dwelling);
      form.reset({
        street: dwelling.street,
        number: dwelling.number || "",
        complement: dwelling.complement || "",
        neighborhood: dwelling.neighborhood || "",
        zipCode: dwelling.zipCode || "",
        microarea: dwelling.microarea || "",
        latitude: dwelling.latitude || "",
        longitude: dwelling.longitude || "",
        dwellingType: dwelling.dwellingType || "",
        sanitation: dwelling.sanitation || "",
        waterSupply: dwelling.waterSupply || "",
        hasElectricity: dwelling.hasElectricity,
        hasAnimals: dwelling.hasAnimals,
        animalTypes: (dwelling.animalTypes as string[]) || [],
        householdMembers: dwelling.householdMembers,
        notes: dwelling.notes || "",
        unitId: dwelling.unitId,
      });
    } else {
      setSelectedDwelling(null);
      form.reset({
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        zipCode: "",
        microarea: "",
        latitude: "",
        longitude: "",
        dwellingType: "",
        sanitation: "",
        waterSupply: "",
        hasElectricity: true,
        hasAnimals: false,
        animalTypes: [],
        householdMembers: 0,
        notes: "",
        unitId: units?.[0]?.id || "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: FormData) => {
    if (selectedDwelling) {
      updateMutation.mutate({ id: selectedDwelling.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (selectedDwelling) {
      deleteMutation.mutate(selectedDwelling.id);
    }
  };

  const filteredDwellings = dwellings?.filter((dwelling) =>
    dwelling.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dwelling.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dwelling.microarea?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Imóveis ACE</h2>
          <p className="text-muted-foreground">
            Cadastro e gerenciamento de imóveis para Agentes de Combate a Endemias
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-dwelling">
          <Plus className="mr-2 h-4 w-4" />
          Novo Imóvel
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por rua, bairro ou microárea..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Carregando...</div>
      ) : filteredDwellings && filteredDwellings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDwellings.map((dwelling) => (
            <Card key={dwelling.id} data-testid={`card-dwelling-${dwelling.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    {dwelling.street}, {dwelling.number || "S/N"}
                  </div>
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenDialog(dwelling)}
                    data-testid={`button-edit-${dwelling.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedDwelling(dwelling);
                      setIsDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-${dwelling.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {dwelling.neighborhood && (
                    <div className="flex items-center gap-2" data-testid={`text-neighborhood-${dwelling.id}`}>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{dwelling.neighborhood}</span>
                    </div>
                  )}
                  {dwelling.microarea && (
                    <div data-testid={`text-microarea-${dwelling.id}`}>
                      <Badge variant="secondary">Microárea: {dwelling.microarea}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2" data-testid={`text-members-${dwelling.id}`}>
                    <span className="text-muted-foreground">Moradores:</span>
                    <span className="font-medium">{dwelling.householdMembers}</span>
                  </div>
                  {dwelling.dwellingType && (
                    <div data-testid={`text-type-${dwelling.id}`}>
                      <Badge>{dwelling.dwellingType}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Home className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhum imóvel encontrado</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {selectedDwelling ? "Editar Imóvel" : "Novo Imóvel"}
            </DialogTitle>
            <DialogDescription>
              {selectedDwelling ? "Atualize as informações do imóvel" : "Cadastre um novo imóvel para o ACE"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Saúde</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedDwelling}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units?.map((unit) => (
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Rua *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da rua" {...field} data-testid="input-street" />
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
                        <Input placeholder="Número" {...field} data-testid="input-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apto, Bloco, etc" {...field} data-testid="input-complement" />
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
                        <Input placeholder="Bairro" {...field} data-testid="input-neighborhood" />
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
                        <Input placeholder="00000-000" {...field} data-testid="input-zipcode" />
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
                        <Input placeholder="Ex: 01" {...field} data-testid="input-microarea" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="householdMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moradores</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="0" {...field} data-testid="input-members" />
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
                        <Input placeholder="-12.345678" {...field} data-testid="input-latitude" />
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
                        <Input placeholder="-38.123456" {...field} data-testid="input-longitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dwellingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Imóvel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-dwelling-type">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="casa">Casa</SelectItem>
                          <SelectItem value="apartamento">Apartamento</SelectItem>
                          <SelectItem value="comercio">Comércio</SelectItem>
                          <SelectItem value="terreno_baldio">Terreno Baldio</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sanitation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saneamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sanitation">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rede_publica">Rede Pública</SelectItem>
                          <SelectItem value="fossa_septica">Fossa Séptica</SelectItem>
                          <SelectItem value="fossa_rudimentar">Fossa Rudimentar</SelectItem>
                          <SelectItem value="ceu_aberto">Céu Aberto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="waterSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abastecimento de Água</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-water-supply">
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

                <FormField
                  control={form.control}
                  name="hasElectricity"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-electricity"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Possui Energia Elétrica</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasAnimals"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-animals"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Possui Animais</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais"
                        className="resize-none"
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvando..."
                    : selectedDwelling
                    ? "Atualizar"
                    : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
