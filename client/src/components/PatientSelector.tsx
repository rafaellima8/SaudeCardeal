import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, User, UserPlus, Check } from "lucide-react";
import type { Citizen } from "@shared/schema";

export interface PatientData {
  id?: string;
  name: string;
  cpf?: string;
  cns?: string;
  birthDate?: Date;
  gender?: string;
  motherName?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface PatientSelectorProps {
  onSelect: (patient: PatientData) => void;
  onCreateNew?: () => void;
  selectedPatientId?: string;
  compact?: boolean;
}

export default function PatientSelector({
  onSelect,
  onCreateNew,
  selectedPatientId,
  compact = false,
}: PatientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ["/api/citizens"],
  });

  const filteredCitizens = citizens.filter(
    (c) =>
      searchTerm.length >= 2 &&
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cpf && c.cpf.includes(searchTerm)) ||
        (c.cns && c.cns.includes(searchTerm)))
  );

  const handleSelect = (citizen: Citizen) => {
    const patientData: PatientData = {
      id: citizen.id,
      name: citizen.name,
      cpf: citizen.cpf || undefined,
      cns: citizen.cns || undefined,
      birthDate: citizen.birthDate ? new Date(citizen.birthDate) : undefined,
      gender: citizen.gender || undefined,
      motherName: citizen.motherName || undefined,
      phone: citizen.phone || undefined,
      address: citizen.address || undefined,
      neighborhood: citizen.neighborhood || undefined,
      city: citizen.city || undefined,
      state: citizen.state || undefined,
    };
    onSelect(patientData);
    setIsOpen(false);
    setSearchTerm("");
  };

  const selectedPatient = citizens.find(c => c.id === selectedPatientId);

  if (compact) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-select-patient">
            <User className="h-4 w-4 mr-2" />
            {selectedPatient ? selectedPatient.name : "Selecionar Paciente"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Paciente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Digite nome, CPF ou CNS (min. 2 caracteres)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-patient-search"
            />
            <ScrollArea className="h-64">
              {filteredCitizens.length > 0 ? (
                <div className="space-y-2">
                  {filteredCitizens.map((citizen) => (
                    <Card
                      key={citizen.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleSelect(citizen)}
                      data-testid={`card-patient-${citizen.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{citizen.name}</p>
                            <div className="flex gap-2 text-sm text-muted-foreground">
                              {citizen.cpf && <span>CPF: {citizen.cpf}</span>}
                              {citizen.cns && <span>CNS: {citizen.cns}</span>}
                            </div>
                          </div>
                          {selectedPatientId === citizen.id && (
                            <Check className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum paciente encontrado</p>
                  {onCreateNew && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setIsOpen(false);
                        onCreateNew();
                      }}
                      data-testid="button-create-patient"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Cadastrar Novo Paciente
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Digite ao menos 2 caracteres para buscar</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nome, CPF ou CNS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-patient-search"
            />
          </div>
          {onCreateNew && (
            <Button variant="outline" onClick={onCreateNew} data-testid="button-create-patient">
              <UserPlus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          )}
        </div>

        {selectedPatient && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{selectedPatient.name}</p>
              <div className="flex gap-2 text-sm text-muted-foreground">
                {selectedPatient.cpf && <Badge variant="secondary">CPF: {selectedPatient.cpf}</Badge>}
                {selectedPatient.cns && <Badge variant="secondary">CNS: {selectedPatient.cns}</Badge>}
              </div>
            </div>
            <Check className="h-5 w-5 text-green-500" />
          </div>
        )}

        {searchTerm.length >= 2 && (
          <ScrollArea className="max-h-48">
            {filteredCitizens.length > 0 ? (
              <div className="space-y-2">
                {filteredCitizens.map((citizen) => (
                  <div
                    key={citizen.id}
                    className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                    onClick={() => handleSelect(citizen)}
                    data-testid={`row-patient-${citizen.id}`}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{citizen.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {citizen.cpf && `CPF: ${citizen.cpf}`}
                        {citizen.cpf && citizen.cns && " | "}
                        {citizen.cns && `CNS: ${citizen.cns}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum paciente encontrado
              </p>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
