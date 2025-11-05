import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import type { Citizen } from "@shared/schema";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

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

  const handlePatientClick = (patientId: string) => {
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
            <Button size="default" data-testid="button-new-patient">
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
                onClick={() => handlePatientClick(patient.id)}
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
