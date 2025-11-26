import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pill, Search, Package, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function PharmacyDispensation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchCitizen, setSearchCitizen] = useState("");
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);

  // Search citizens for dispensation
  const { data: citizens = [] } = useQuery({
    queryKey: ["/api/citizens", searchCitizen],
    queryFn: async () => {
      if (!searchCitizen || searchCitizen.length < 3) return [];
      return apiRequest<any[]>("GET", `/api/citizens?search=${encodeURIComponent(searchCitizen)}`);
    },
    enabled: searchCitizen.length >= 3,
  });

  // Get pending prescriptions for selected citizen
  const { data: prescriptions = [] } = useQuery({
    queryKey: ["/api/prescriptions", selectedCitizenId, "pending"],
    queryFn: async () => {
      if (!selectedCitizenId) return [];
      return apiRequest<any[]>("GET", `/api/prescriptions?citizenId=${selectedCitizenId}&status=pending`);
    },
    enabled: !!selectedCitizenId,
  });

  // Dispense medication mutation
  const dispenseMutation = useMutation({
    mutationFn: async (data: { prescriptionId: string; quantity: number }) => {
      return apiRequest("POST", "/api/pharmacy/dispense", data);
    },
    onSuccess: () => {
      toast({ title: "Dispensação realizada", description: "Medicamento dispensado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", selectedCitizenId, "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro na dispensação", 
        description: error.message || "Verifique estoque disponível", 
        variant: "destructive" 
      });
    },
  });

  const handleDispense = (prescriptionId: string, prescribedQty: number) => {
    dispenseMutation.mutate({ prescriptionId, quantity: prescribedQty });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Pill className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Dispensação de Medicamentos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome, CPF ou CNS do paciente..."
                value={searchCitizen}
                onChange={(e) => setSearchCitizen(e.target.value)}
                className="pl-10"
                data-testid="input-search-citizen"
              />
            </div>
          </div>

          {searchCitizen.length >= 3 && (
            <div className="mt-4 space-y-2">
              {citizens.map((citizen: any) => (
                <Card
                  key={citizen.id}
                  className="p-4 cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setSelectedCitizenId(citizen.id)}
                  data-testid={`card-citizen-${citizen.id}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{citizen.name}</p>
                      <p className="text-sm text-muted-foreground">CPF: {citizen.cpf}</p>
                      {citizen.cns && <p className="text-sm text-muted-foreground">CNS: {citizen.cns}</p>}
                    </div>
                    {selectedCitizenId === citizen.id && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCitizenId && (
        <Card>
          <CardHeader>
            <CardTitle>Prescrições Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                <p>Nenhuma prescrição pendente para este paciente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((prescription: any) => (
                  <Card key={prescription.id} className="p-4" data-testid={`card-prescription-${prescription.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{prescription.medication}</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><strong>Dosagem:</strong> {prescription.dosage}</p>
                          <p><strong>Frequência:</strong> {prescription.frequency}</p>
                          <p><strong>Duração:</strong> {prescription.duration}</p>
                          <p><strong>Quantidade:</strong> {prescription.quantity}</p>
                          {prescription.instructions && (
                            <p><strong>Instruções:</strong> {prescription.instructions}</p>
                          )}
                          <p className="text-muted-foreground">
                            Prescrito em: {format(new Date(prescription.createdAt), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDispense(prescription.id, prescription.quantity)}
                        disabled={dispenseMutation.isPending}
                        data-testid={`button-dispense-${prescription.id}`}
                      >
                        {dispenseMutation.isPending ? "Dispensando..." : "Dispensar"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
