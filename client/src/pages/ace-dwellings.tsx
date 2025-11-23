import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Plus, MapPin, Home, Edit, Trash2, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/queryClient";
import type { AceDwelling } from "@shared/schema";

export default function AceDwellings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDwelling, setSelectedDwelling] = useState<AceDwelling | null>(null);
  const [formData, setFormData] = useState({
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
    animalTypes: [] as string[],
    householdMembers: 0,
    notes: "",
  });
  const { toast } = useToast();

  const { data: dwellings, isLoading } = useQuery<AceDwelling[]>({
    queryKey: ['/api/ace/dwellings', { search: searchTerm }],
  });

  const { data: units } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/units'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/ace/dwellings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar imóvel');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ace/dwellings'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Imóvel cadastrado",
        description: "Imóvel ACE cadastrado com sucesso!",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ace/dwellings/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir imóvel');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ace/dwellings'] });
      setIsDeleteDialogOpen(false);
      setSelectedDwelling(null);
      toast({
        title: "Imóvel excluído",
        description: "Imóvel removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir imóvel",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
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
    });
  };

  const handleOpenDialog = (dwelling?: AceDwelling) => {
    if (dwelling) {
      setSelectedDwelling(dwelling);
      setFormData({
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
      });
    } else {
      setSelectedDwelling(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      unit_id: units?.[0]?.id || "",
      has_electricity: formData.hasElectricity,
      has_animals: formData.hasAnimals,
      animal_types: formData.animalTypes,
      household_members: formData.householdMembers,
      dwelling_type: formData.dwellingType || null,
      water_supply: formData.waterSupply || null,
      zip_code: formData.zipCode || null,
    };
    createMutation.mutate(submitData);
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
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-dwelling">
          <Plus className="mr-2 h-4 w-4" />
          Novo Imóvel
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por endereço, bairro ou microárea..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-dwellings"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDwellings && filteredDwellings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDwellings.map((dwelling) => (
            <Card key={dwelling.id} className="hover-elevate" data-testid={`card-dwelling-${dwelling.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  {dwelling.street}, {dwelling.number || "S/N"}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-menu-${dwelling.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(dwelling)} data-testid={`button-edit-${dwelling.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedDwelling(dwelling);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-destructive"
                      data-testid={`button-delete-${dwelling.id}`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {dwelling.neighborhood && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {dwelling.neighborhood}
                    </div>
                  )}
                  {dwelling.microarea && (
                    <Badge variant="outline" data-testid={`badge-microarea-${dwelling.id}`}>
                      Microárea: {dwelling.microarea}
                    </Badge>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {dwelling.hasElectricity && <Badge variant="secondary">Energia Elétrica</Badge>}
                    {dwelling.hasAnimals && <Badge variant="secondary">Possui Animais</Badge>}
                    {dwelling.householdMembers > 0 && (
                      <Badge variant="secondary" data-testid={`badge-members-${dwelling.id}`}>
                        {dwelling.householdMembers} moradores
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum imóvel cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Comece cadastrando o primeiro imóvel ACE
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="button-new-dwelling-empty">
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Imóvel
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {selectedDwelling ? "Editar Imóvel" : "Novo Imóvel ACE"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do imóvel para cadastro ACE
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="street">Rua/Logradouro *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                  data-testid="input-street"
                />
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  data-testid="input-number"
                />
              </div>
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  data-testid="input-complement"
                />
              </div>
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  data-testid="input-neighborhood"
                />
              </div>
              <div>
                <Label htmlFor="microarea">Microárea</Label>
                <Input
                  id="microarea"
                  value={formData.microarea}
                  onChange={(e) => setFormData({ ...formData, microarea: e.target.value })}
                  data-testid="input-microarea"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  data-testid="input-zipcode"
                />
              </div>
              <div>
                <Label htmlFor="dwellingType">Tipo de Imóvel</Label>
                <Select
                  value={formData.dwellingType}
                  onValueChange={(value) => setFormData({ ...formData, dwellingType: value })}
                >
                  <SelectTrigger data-testid="select-dwelling-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="comercio">Comércio</SelectItem>
                    <SelectItem value="terreno">Terreno Baldio</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="-12.123456"
                  data-testid="input-latitude"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="-38.123456"
                  data-testid="input-longitude"
                />
              </div>
              <div>
                <Label htmlFor="sanitation">Saneamento</Label>
                <Select
                  value={formData.sanitation}
                  onValueChange={(value) => setFormData({ ...formData, sanitation: value })}
                >
                  <SelectTrigger data-testid="select-sanitation">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rede_publica">Rede Pública</SelectItem>
                    <SelectItem value="fossa_septica">Fossa Séptica</SelectItem>
                    <SelectItem value="fossa_rudimentar">Fossa Rudimentar</SelectItem>
                    <SelectItem value="ceu_aberto">Céu Aberto</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="waterSupply">Abastecimento de Água</Label>
                <Select
                  value={formData.waterSupply}
                  onValueChange={(value) => setFormData({ ...formData, waterSupply: value })}
                >
                  <SelectTrigger data-testid="select-water-supply">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rede_publica">Rede Pública</SelectItem>
                    <SelectItem value="poco">Poço</SelectItem>
                    <SelectItem value="cisterna">Cisterna</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="householdMembers">Número de Moradores</Label>
                <Input
                  id="householdMembers"
                  type="number"
                  min="0"
                  value={formData.householdMembers}
                  onChange={(e) => setFormData({ ...formData, householdMembers: parseInt(e.target.value) || 0 })}
                  data-testid="input-household-members"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasElectricity"
                    checked={formData.hasElectricity}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasElectricity: checked as boolean })}
                    data-testid="checkbox-has-electricity"
                  />
                  <Label htmlFor="hasElectricity" className="cursor-pointer">Possui Energia Elétrica</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasAnimals"
                    checked={formData.hasAnimals}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasAnimals: checked as boolean })}
                    data-testid="checkbox-has-animals"
                  />
                  <Label htmlFor="hasAnimals" className="cursor-pointer">Possui Animais</Label>
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </div>
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
                disabled={createMutation.isPending}
                data-testid="button-save-dwelling"
              >
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
