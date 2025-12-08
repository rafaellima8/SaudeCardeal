import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package,
  User,
  Calendar,
  AlertTriangle,
  Check,
  Clock,
  Baby,
  FileText,
  Loader2,
  PackageCheck,
  Search,
} from "lucide-react";

interface PendingAuthorization {
  id: string;
  authorizationNumber: string;
  beneficiaryId: string;
  diaperSize: string;
  quantityAuthorized: number;
  quantityDelivered: number;
  quantityRemaining: number;
  periodStart: string;
  periodEnd: string;
  validUntil: string;
  status: string;
  beneficiary: {
    id: string;
    name: string;
    cpf?: string;
    phone?: string;
  };
  stockAvailable: number;
  canDeliver: boolean;
}

const DIAPER_SIZE_LABELS: Record<string, string> = {
  RN: "Recém Nascido",
  P: "Pequeno",
  M: "Médio",
  G: "Grande",
  XG: "Extra Grande",
  XXG: "Extra Extra Grande",
  geriatrica_P: "Geriátrica P",
  geriatrica_M: "Geriátrica M",
  geriatrica_G: "Geriátrica G",
  geriatrica_XG: "Geriátrica XG",
};

export default function PharmacyPendingAuthorizations() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAuth, setSelectedAuth] = useState<PendingAuthorization | null>(null);
  const [deliveryQuantity, setDeliveryQuantity] = useState<number>(0);
  const [receiverName, setReceiverName] = useState("");
  const [receiverDocument, setReceiverDocument] = useState("");

  const { data: authorizations = [], isLoading } = useQuery<PendingAuthorization[]>({
    queryKey: ["/api/pharmacy/diapers/pending-authorizations"],
  });

  const processDeliveryMutation = useMutation({
    mutationFn: async (data: {
      authorizationId: string;
      quantity: number;
      receiverName: string;
      receiverDocument: string;
    }) => {
      return apiRequest("POST", "/api/pharmacy/diapers/process-delivery", data);
    },
    onSuccess: () => {
      toast({
        title: "Entrega processada",
        description: "A entrega foi registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diapers/pending-authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diaper-stock"] });
      setSelectedAuth(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar entrega",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setDeliveryQuantity(0);
    setReceiverName("");
    setReceiverDocument("");
  };

  const handleOpenDeliveryDialog = (auth: PendingAuthorization) => {
    setSelectedAuth(auth);
    setDeliveryQuantity(auth.quantityRemaining);
  };

  const handleProcessDelivery = () => {
    if (!selectedAuth) return;
    if (!receiverName.trim()) {
      toast({ title: "Erro", description: "Informe o nome do recebedor", variant: "destructive" });
      return;
    }
    if (deliveryQuantity <= 0 || deliveryQuantity > selectedAuth.quantityRemaining) {
      toast({ title: "Erro", description: "Quantidade inválida", variant: "destructive" });
      return;
    }

    processDeliveryMutation.mutate({
      authorizationId: selectedAuth.id,
      quantity: deliveryQuantity,
      receiverName: receiverName.trim(),
      receiverDocument: receiverDocument.trim(),
    });
  };

  const filteredAuthorizations = authorizations.filter(
    (a) =>
      a.beneficiary?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.authorizationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.beneficiary?.cpf?.includes(searchTerm)
  );

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Baby className="h-6 w-6" />
            Autorizações Pendentes de Fraldas
          </h1>
          <p className="text-muted-foreground">
            Processe entregas de fraldas autorizadas pela Assistência Social
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {filteredAuthorizations.length} pendente(s)
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou número da autorização..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-authorizations"
        />
      </div>

      {filteredAuthorizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium">Nenhuma autorização pendente</h3>
            <p className="text-muted-foreground">
              Todas as autorizações foram processadas ou não há autorizações ativas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {filteredAuthorizations.map((auth) => (
              <Card key={auth.id} className="hover-elevate" data-testid={`card-auth-${auth.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {auth.beneficiary?.name || "Beneficiário não identificado"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        Autorização: {auth.authorizationNumber}
                        {auth.beneficiary?.cpf && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            CPF: {auth.beneficiary.cpf}
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={auth.canDeliver ? "default" : "destructive"}
                      className="whitespace-nowrap"
                    >
                      {auth.canDeliver ? "Estoque OK" : "Estoque Baixo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tamanho</p>
                      <p className="font-medium">{DIAPER_SIZE_LABELS[auth.diaperSize] || auth.diaperSize}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Autorizado</p>
                      <p className="font-medium">{auth.quantityAuthorized} un</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Restante</p>
                      <p className="font-medium text-primary">{auth.quantityRemaining} un</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estoque Disponível</p>
                      <p className={`font-medium ${auth.stockAvailable < auth.quantityRemaining ? "text-destructive" : "text-green-600"}`}>
                        {auth.stockAvailable} un
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Período: {formatDate(auth.periodStart)} - {formatDate(auth.periodEnd)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Válido até: {formatDate(auth.validUntil)}
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={() => handleOpenDeliveryDialog(auth)}
                      disabled={!auth.canDeliver || auth.stockAvailable <= 0}
                      data-testid={`button-deliver-${auth.id}`}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Processar Entrega
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={!!selectedAuth} onOpenChange={(open) => !open && setSelectedAuth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Processar Entrega de Fraldas
            </DialogTitle>
            <DialogDescription>
              {selectedAuth?.beneficiary?.name} - Autorização {selectedAuth?.authorizationNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedAuth && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Saldo disponível: <strong>{selectedAuth.quantityRemaining} unidades</strong> de{" "}
                  {DIAPER_SIZE_LABELS[selectedAuth.diaperSize] || selectedAuth.diaperSize}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade a Entregar</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={selectedAuth.quantityRemaining}
                  value={deliveryQuantity}
                  onChange={(e) => setDeliveryQuantity(parseInt(e.target.value) || 0)}
                  data-testid="input-delivery-quantity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiverName">Nome do Recebedor *</Label>
                <Input
                  id="receiverName"
                  placeholder="Nome completo de quem está retirando"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  data-testid="input-receiver-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiverDocument">CPF/RG do Recebedor</Label>
                <Input
                  id="receiverDocument"
                  placeholder="Documento de identificação"
                  value={receiverDocument}
                  onChange={(e) => setReceiverDocument(e.target.value)}
                  data-testid="input-receiver-document"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAuth(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleProcessDelivery}
              disabled={processDeliveryMutation.isPending}
              data-testid="button-confirm-delivery"
            >
              {processDeliveryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
