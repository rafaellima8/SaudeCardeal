import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, UserPlus, Edit, Trash2, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Citizen } from "@shared/schema";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Citizen | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    cns: "",
    birthDate: "",
    gender: "M" as "M" | "F" | "Outro",
    phone: "",
    email: "",
    address: "",
    bloodType: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: citizens, isLoading } = useQuery<Citizen[]>({
    queryKey: ['/api/citizens', { search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/citizens?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar cidadãos');
      return response.json();
    },
  });

  const { data: units } = useQuery({
    queryKey: ['/api/units'],
    queryFn: async () => {
      const response = await fetch('/api/units');
      if (!response.ok) throw new Error('Erro ao buscar unidades');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/citizens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar paciente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/citizens'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Paciente cadastrado",
        description: "Paciente cadastrado com sucesso!",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`/api/citizens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar paciente');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/citizens'] });
      setIsDialogOpen(false);
      setSelectedPatient(null);
      resetForm();
      toast({
        title: "Paciente atualizado",
        description: "Dados atualizados com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar paciente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/citizens/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir paciente');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/citizens'] });
      setIsDeleteDialogOpen(false);
      setSelectedPatient(null);
      toast({
        title: "Paciente excluído",
        description: "Paciente excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir paciente",
        variant: "destructive",
      });
    },
  });

  const handlePatientClick = (patientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/pacientes/${patientId}`);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      cns: "",
      birthDate: "",
      gender: "M",
      phone: "",
      email: "",
      address: "",
      bloodType: "",
    });
  };

  const handleNewPatient = () => {
    resetForm();
    setSelectedPatient(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (patient: Citizen, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      cpf: patient.cpf,
      cns: patient.cns,
      birthDate: patient.birthDate,
      gender: patient.gender,
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      bloodType: patient.bloodType || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (patient: Citizen, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      unitId: units?.[0]?.id || null,
    };
    
    if (selectedPatient) {
      updateMutation.mutate({ id: selectedPatient.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const confirmDelete = () => {
    if (selectedPatient) {
      deleteMutation.mutate(selectedPatient.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
        <p className="text-muted-foreground mt-1">Cadastro e prontuários eletrônicos dos cidadãos</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou CNS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-patient"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="default" data-testid="button-filter">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button size="default" onClick={handleNewPatient} data-testid="button-new-patient">
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Carregando pacientes...</div>
        ) : (
          <div className="space-y-3">
            {citizens?.map((patient) => (
              <Card 
                key={patient.id} 
                className="p-4 hover-elevate cursor-pointer" 
                data-testid={`card-patient-${patient.id}`}
                onClick={(e) => handlePatientClick(patient.id, e)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" alt={patient.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {patient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{patient.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {calculateAge(patient.birthDate)} anos
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">CPF: {patient.cpf}</span>
                      <span className="font-mono text-xs">CNS: {patient.cns}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleEdit(patient, e)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDelete(patient, e)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPatient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo do paciente"
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  required
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="cns">CNS *</Label>
                <Input
                  id="cns"
                  required
                  value={formData.cns}
                  onChange={(e) => setFormData({ ...formData, cns: e.target.value })}
                  placeholder="000 0000 0000 0000"
                />
              </div>
              <div>
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gênero *</Label>
                <Select value={formData.gender} onValueChange={(value: any) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(75) 90000-0000"
                />
              </div>
              <div>
                <Label htmlFor="bloodType">Tipo Sanguíneo</Label>
                <Select value={formData.bloodType} onValueChange={(value) => setFormData({ ...formData, bloodType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, bairro"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedPatient ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o paciente
              <strong> {selectedPatient?.name}</strong> e todos os seus dados do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
