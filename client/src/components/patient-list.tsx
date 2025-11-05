import { useState } from "react";
import { Search, Filter, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface Patient {
  id: string;
  name: string;
  cpf: string;
  cns: string;
  age: number;
  gender: string;
  lastVisit: string;
  status: 'active' | 'inactive';
}

//todo: remove mock functionality
const mockPatients: Patient[] = [
  { id: '1', name: 'João Silva Santos', cpf: '123.456.789-00', cns: '123 4567 8901 2345', age: 45, gender: 'M', lastVisit: '2025-01-15', status: 'active' },
  { id: '2', name: 'Maria Oliveira Costa', cpf: '987.654.321-00', cns: '987 6543 2109 8765', age: 32, gender: 'F', lastVisit: '2025-01-14', status: 'active' },
  { id: '3', name: 'Pedro Almeida Souza', cpf: '456.789.123-00', cns: '456 7891 2345 6789', age: 67, gender: 'M', lastVisit: '2025-01-10', status: 'active' },
  { id: '4', name: 'Ana Paula Ferreira', cpf: '321.654.987-00', cns: '321 6549 8765 4321', age: 28, gender: 'F', lastVisit: '2025-01-08', status: 'active' },
];

export function PatientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients] = useState(mockPatients);
  const [, setLocation] = useLocation();

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.cpf.includes(searchTerm) ||
    patient.cns.includes(searchTerm)
  );

  const handlePatientClick = (patientId: string) => {
    setLocation(`/pacientes/${patientId}`);
  };

  return (
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

      <div className="space-y-3">
        {filteredPatients.map((patient) => (
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
                    {patient.age} anos
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">CPF: {patient.cpf}</span>
                  <span className="font-mono text-xs">CNS: {patient.cns}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Última consulta</p>
                <p className="text-sm font-medium text-foreground">{new Date(patient.lastVisit).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
