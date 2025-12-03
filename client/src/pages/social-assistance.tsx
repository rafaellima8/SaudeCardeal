import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, FileCheck, ClipboardList, Search, RefreshCw, Baby, Truck } from "lucide-react";
import type { SaBeneficiary, DiaperRequest, DiaperAuthorization, DiaperDelivery, DiaperStock } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BeneficiaryFormData {
  name: string;
  cpf: string;
  nis: string;
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  familySize: number;
  income: number;
  beneficiaryType: string;
  diaperSize: string;
  notes: string;
}

interface RequestFormData {
  beneficiaryId: string;
  diaperSize: string;
  quantityRequested: number;
  justification: string;
}

interface AuthorizationFormData {
  requestId: string;
  beneficiaryId: string;
  diaperSize: string;
  quantityAuthorized: number;
  validFrom: string;
  validUntil: string;
  notes: string;
}

interface DeliveryFormData {
  authorizationId: string;
  quantity: number;
  receiverName: string;
  receiverDocument: string;
  notes: string;
}

const DIAPER_SIZES = [
  { value: "RN", label: "RN - Recém Nascido" },
  { value: "P", label: "P - Pequeno" },
  { value: "M", label: "M - Médio" },
  { value: "G", label: "G - Grande" },
  { value: "XG", label: "XG - Extra Grande" },
  { value: "XXG", label: "XXG - Extra Extra Grande" },
  { value: "geriatrica_P", label: "Geriátrica P" },
  { value: "geriatrica_M", label: "Geriátrica M" },
  { value: "geriatrica_G", label: "Geriátrica G" },
  { value: "geriatrica_XG", label: "Geriátrica XG" },
];

export default function SocialAssistance() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isBeneficiaryDialogOpen, setIsBeneficiaryDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isAuthorizationDialogOpen, setIsAuthorizationDialogOpen] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<SaBeneficiary | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DiaperRequest | null>(null);
  const [selectedAuthorization, setSelectedAuthorization] = useState<DiaperAuthorization | null>(null);

  const beneficiaryForm = useForm<BeneficiaryFormData>({
    defaultValues: {
      name: "",
      cpf: "",
      nis: "",
      phone: "",
      address: "",
      neighborhood: "",
      city: "Cardeal da Silva",
      state: "BA",
      familySize: 1,
      income: 0,
      beneficiaryType: "idoso",
      diaperSize: "M",
      notes: "",
    },
  });

  const requestForm = useForm<RequestFormData>({
    defaultValues: {
      beneficiaryId: "",
      diaperSize: "M",
      quantityRequested: 30,
      justification: "",
    },
  });

  const authorizationForm = useForm<AuthorizationFormData>({
    defaultValues: {
      requestId: "",
      beneficiaryId: "",
      diaperSize: "M",
      quantityAuthorized: 30,
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: "",
      notes: "",
    },
  });

  const deliveryForm = useForm<DeliveryFormData>({
    defaultValues: {
      authorizationId: "",
      quantity: 30,
      receiverName: "",
      receiverDocument: "",
      notes: "",
    },
  });

  const { data: stats } = useQuery<{
    totalBeneficiaries: number;
    pendingRequests: number;
    authorizedThisMonth: number;
    deliveredThisMonth: number;
    lowDiaperStock: number;
  }>({
    queryKey: ["/api/social-assistance/stats"],
  });

  const { data: beneficiaries = [], isLoading: isLoadingBeneficiaries } = useQuery<SaBeneficiary[]>({
    queryKey: ["/api/social-assistance/beneficiaries", { search: searchTerm }],
  });

  const { data: requests = [] } = useQuery<DiaperRequest[]>({
    queryKey: ["/api/social-assistance/requests"],
  });

  const { data: authorizations = [] } = useQuery<DiaperAuthorization[]>({
    queryKey: ["/api/social-assistance/authorizations"],
  });

  const { data: deliveries = [] } = useQuery<DiaperDelivery[]>({
    queryKey: ["/api/social-assistance/deliveries"],
  });

  const { data: diaperStock = [] } = useQuery<DiaperStock[]>({
    queryKey: ["/api/pharmacy/diaper-stock"],
  });

  const createBeneficiaryMutation = useMutation({
    mutationFn: async (data: BeneficiaryFormData) => {
      const payload = {
        name: data.name,
        cpf: data.cpf || null,
        nis: data.nis || null,
        phone: data.phone || null,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        familySize: data.familySize,
        familyIncome: data.income,
        beneficiaryType: data.beneficiaryType || null,
        preferredDiaperSize: data.diaperSize || null,
        observations: data.notes || null,
      };
      return await apiRequest("POST", "/api/social-assistance/beneficiaries", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/beneficiaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/stats"] });
      toast({ title: "Sucesso", description: "Beneficiário cadastrado com sucesso." });
      setIsBeneficiaryDialogOpen(false);
      beneficiaryForm.reset();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      return await apiRequest("POST", "/api/social-assistance/requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/stats"] });
      toast({ title: "Sucesso", description: "Solicitação criada com sucesso." });
      setIsRequestDialogOpen(false);
      requestForm.reset();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const createAuthorizationMutation = useMutation({
    mutationFn: async (data: AuthorizationFormData) => {
      const payload = {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes || null,
      };
      return await apiRequest("POST", "/api/social-assistance/authorizations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/stats"] });
      toast({ title: "Sucesso", description: "Autorização emitida com sucesso." });
      setIsAuthorizationDialogOpen(false);
      authorizationForm.reset();
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const createDeliveryMutation = useMutation({
    mutationFn: async (data: DeliveryFormData) => {
      const payload = {
        authorizationId: data.authorizationId,
        quantityDelivered: data.quantity,
        receivedByName: data.receiverName || null,
        receivedByDocument: data.receiverDocument || null,
        observations: data.notes || null,
      };
      return await apiRequest("POST", "/api/social-assistance/deliveries", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-assistance/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diaper-stock"] });
      toast({ title: "Sucesso", description: "Entrega registrada com sucesso." });
      setIsDeliveryDialogOpen(false);
      deliveryForm.reset();
      setSelectedAuthorization(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  function handleOpenRequestDialog(beneficiary: SaBeneficiary) {
    setSelectedBeneficiary(beneficiary);
    requestForm.reset({
      beneficiaryId: beneficiary.id,
      diaperSize: beneficiary.preferredDiaperSize || "M",
      quantityRequested: 30,
      justification: "",
    });
    setIsRequestDialogOpen(true);
  }

  function handleOpenAuthorizationDialog(request: DiaperRequest) {
    setSelectedRequest(request);
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 1);
    authorizationForm.reset({
      requestId: request.id,
      beneficiaryId: request.beneficiaryId,
      diaperSize: request.diaperSize,
      quantityAuthorized: request.quantityRequested,
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: validUntil.toISOString().split("T")[0],
      notes: "",
    });
    setIsAuthorizationDialogOpen(true);
  }

  function handleOpenDeliveryDialog(authorization: DiaperAuthorization) {
    setSelectedAuthorization(authorization);
    deliveryForm.reset({
      authorizationId: authorization.id,
      quantity: authorization.quantityRemaining || authorization.quantityAuthorized,
      receiverName: "",
      receiverDocument: "",
      notes: "",
    });
    setIsDeliveryDialogOpen(true);
  }

  function getRequestStatusBadge(status: string) {
    switch (status) {
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "em_analise":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Em Análise</Badge>;
      case "autorizado":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Autorizado</Badge>;
      case "negado":
        return <Badge variant="destructive">Negado</Badge>;
      case "cancelado":
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getAuthorizationStatusBadge(status: string) {
    switch (status) {
      case "ativa":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativa</Badge>;
      case "parcialmente_utilizada":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Parcial</Badge>;
      case "utilizada":
        return <Badge variant="outline">Utilizada</Badge>;
      case "expirada":
        return <Badge variant="destructive">Expirada</Badge>;
      case "cancelada":
        return <Badge variant="outline">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getSizeLabel(size: string) {
    const sizeInfo = DIAPER_SIZES.find((s) => s.value === size);
    return sizeInfo?.label || size;
  }

  function getStockBySize(size: string) {
    const items = diaperStock.filter((s) => s.size === size);
    return items.reduce((acc, s) => acc + (s.availableQuantity || s.currentQuantity), 0);
  }

  function getBeneficiaryTypeLabel(type: string | null) {
    const labels: Record<string, string> = {
      idoso: "Idoso",
      crianca: "Criança",
      pessoa_com_deficiencia: "PCD",
      acamado: "Acamado",
      outro: "Outro",
    };
    return labels[type || ""] || type || "-";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistência Social</h1>
          <p className="text-muted-foreground">Gestão de beneficiários e programa de fraldas</p>
        </div>
        <Button onClick={() => setIsBeneficiaryDialogOpen(true)} data-testid="button-add-beneficiary">
          <Plus className="mr-2 h-4 w-4" />
          Novo Beneficiário
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Beneficiários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBeneficiaries || beneficiaries.length}</div>
            <p className="text-xs text-muted-foreground">cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <ClipboardList className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingRequests || requests.filter(r => r.status === "pendente").length}</div>
            <p className="text-xs text-muted-foreground">solicitações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Autorizadas</CardTitle>
            <FileCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.authorizedThisMonth || authorizations.filter(a => a.status === "ativa").length}</div>
            <p className="text-xs text-muted-foreground">ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Entregas</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.deliveredThisMonth || deliveries.length}</div>
            <p className="text-xs text-muted-foreground">este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <Baby className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.lowDiaperStock || 0}</div>
            <p className="text-xs text-muted-foreground">itens</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="beneficiaries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="beneficiaries" data-testid="tab-beneficiaries">Beneficiários</TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">Solicitações</TabsTrigger>
          <TabsTrigger value="authorizations" data-testid="tab-authorizations">Autorizações</TabsTrigger>
          <TabsTrigger value="deliveries" data-testid="tab-deliveries">Entregas</TabsTrigger>
        </TabsList>

        <TabsContent value="beneficiaries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Lista de Beneficiários</CardTitle>
                  <CardDescription>Pessoas cadastradas no programa de fraldas</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF ou NIS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80"
                    data-testid="input-search-beneficiaries"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBeneficiaries ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : beneficiaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum beneficiário encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beneficiaries.map((beneficiary) => (
                      <TableRow key={beneficiary.id} data-testid={`row-beneficiary-${beneficiary.id}`}>
                        <TableCell className="font-medium">{beneficiary.name}</TableCell>
                        <TableCell>{beneficiary.cpf || "-"}</TableCell>
                        <TableCell>{beneficiary.nis || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getBeneficiaryTypeLabel(beneficiary.beneficiaryType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSizeLabel(beneficiary.preferredDiaperSize || "M")}</TableCell>
                        <TableCell>{beneficiary.phone || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRequestDialog(beneficiary)}
                            data-testid={`button-request-${beneficiary.id}`}
                          >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Solicitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Fraldas</CardTitle>
              <CardDescription>Solicitações pendentes e processadas</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação encontrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Beneficiário</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => {
                      const beneficiary = beneficiaries.find((b) => b.id === request.beneficiaryId);
                      return (
                        <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                          <TableCell className="font-mono">{request.requestNumber}</TableCell>
                          <TableCell>
                            {request.createdAt
                              ? format(new Date(request.createdAt), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>{beneficiary?.name || "-"}</TableCell>
                          <TableCell>{getSizeLabel(request.diaperSize)}</TableCell>
                          <TableCell className="text-right font-mono">{request.quantityRequested}</TableCell>
                          <TableCell>{getRequestStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === "pendente" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenAuthorizationDialog(request)}
                                data-testid={`button-authorize-${request.id}`}
                              >
                                <FileCheck className="mr-2 h-4 w-4" />
                                Autorizar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authorizations">
          <Card>
            <CardHeader>
              <CardTitle>Autorizações Emitidas</CardTitle>
              <CardDescription>Autorizações de entrega de fraldas</CardDescription>
            </CardHeader>
            <CardContent>
              {authorizations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma autorização encontrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead className="text-right">Autorizado</TableHead>
                      <TableHead className="text-right">Entregue</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizations.map((auth) => (
                      <TableRow key={auth.id} data-testid={`row-authorization-${auth.id}`}>
                        <TableCell className="font-mono">{auth.authorizationNumber}</TableCell>
                        <TableCell>
                          {auth.issuedAt
                            ? format(new Date(auth.issuedAt), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {auth.validUntil
                            ? format(new Date(auth.validUntil), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>{getSizeLabel(auth.diaperSize)}</TableCell>
                        <TableCell className="text-right font-mono">{auth.quantityAuthorized}</TableCell>
                        <TableCell className="text-right font-mono">{auth.quantityDelivered || 0}</TableCell>
                        <TableCell className="text-right font-mono">{auth.quantityRemaining || 0}</TableCell>
                        <TableCell>{getAuthorizationStatusBadge(auth.status)}</TableCell>
                        <TableCell className="text-right">
                          {auth.status === "ativa" && (auth.quantityRemaining || 0) > 0 && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenDeliveryDialog(auth)}
                              data-testid={`button-deliver-${auth.id}`}
                            >
                              <Truck className="mr-2 h-4 w-4" />
                              Entregar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Entregas</CardTitle>
              <CardDescription>Entregas realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma entrega registrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Autorização</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Recebedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery) => {
                      const auth = authorizations.find((a) => a.id === delivery.authorizationId);
                      return (
                        <TableRow key={delivery.id} data-testid={`row-delivery-${delivery.id}`}>
                          <TableCell className="font-mono">{delivery.deliveryNumber}</TableCell>
                          <TableCell>
                            {delivery.deliveredAt
                              ? format(new Date(delivery.deliveredAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell className="font-mono">{auth?.authorizationNumber || "-"}</TableCell>
                          <TableCell>{getSizeLabel(delivery.diaperSize)}</TableCell>
                          <TableCell className="text-right font-mono">{delivery.quantityDelivered}</TableCell>
                          <TableCell>{delivery.receivedByName || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isBeneficiaryDialogOpen} onOpenChange={setIsBeneficiaryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Beneficiário</DialogTitle>
            <DialogDescription>Cadastrar pessoa no programa de fraldas</DialogDescription>
          </DialogHeader>
          <Form {...beneficiaryForm}>
            <form onSubmit={beneficiaryForm.handleSubmit((data) => createBeneficiaryMutation.mutate(data))} className="space-y-4">
              <FormField
                control={beneficiaryForm.control}
                name="name"
                rules={{ required: "Nome é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do beneficiário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={beneficiaryForm.control}
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
                  control={beneficiaryForm.control}
                  name="nis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIS</FormLabel>
                      <FormControl>
                        <Input placeholder="Número do NIS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={beneficiaryForm.control}
                  name="beneficiaryType"
                  rules={{ required: "Tipo é obrigatório" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Beneficiário</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="idoso">Idoso</SelectItem>
                          <SelectItem value="crianca">Criança</SelectItem>
                          <SelectItem value="pessoa_com_deficiencia">Pessoa com Deficiência</SelectItem>
                          <SelectItem value="acamado">Acamado</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={beneficiaryForm.control}
                  name="diaperSize"
                  rules={{ required: "Tamanho é obrigatório" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho da Fralda</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DIAPER_SIZES.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={beneficiaryForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={beneficiaryForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número, complemento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={beneficiaryForm.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={beneficiaryForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={beneficiaryForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={beneficiaryForm.control}
                  name="familySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho da Família</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={beneficiaryForm.control}
                  name="income"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renda Familiar (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={beneficiaryForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBeneficiaryDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createBeneficiaryMutation.isPending}>
                  {createBeneficiaryMutation.isPending ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    "Cadastrar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Fraldas</DialogTitle>
            <DialogDescription>
              {selectedBeneficiary && `Solicitação para: ${selectedBeneficiary.name}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit((data) => createRequestMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={requestForm.control}
                  name="diaperSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DIAPER_SIZES.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label} (Estoque: {getStockBySize(size.value)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={requestForm.control}
                  name="quantityRequested"
                  rules={{ required: "Quantidade é obrigatória", min: { value: 1, message: "Mínimo 1" } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={requestForm.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificativa</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Justificativa da solicitação..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createRequestMutation.isPending}>
                  {createRequestMutation.isPending ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    "Criar Solicitação"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuthorizationDialogOpen} onOpenChange={setIsAuthorizationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Autorizar Solicitação</DialogTitle>
            <DialogDescription>
              {selectedRequest && `Solicitação: ${selectedRequest.requestNumber}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...authorizationForm}>
            <form onSubmit={authorizationForm.handleSubmit((data) => createAuthorizationMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={authorizationForm.control}
                  name="quantityAuthorized"
                  rules={{ required: "Quantidade é obrigatória", min: { value: 1, message: "Mínimo 1" } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Autorizada</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={authorizationForm.control}
                  name="diaperSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DIAPER_SIZES.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={authorizationForm.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válido De</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={authorizationForm.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válido Até</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={authorizationForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAuthorizationDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createAuthorizationMutation.isPending}>
                  {createAuthorizationMutation.isPending ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    "Emitir Autorização"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Entrega</DialogTitle>
            <DialogDescription>
              {selectedAuthorization && `Autorização: ${selectedAuthorization.authorizationNumber} - Saldo: ${selectedAuthorization.quantityRemaining || 0} unidades`}
            </DialogDescription>
          </DialogHeader>
          <Form {...deliveryForm}>
            <form onSubmit={deliveryForm.handleSubmit((data) => createDeliveryMutation.mutate(data))} className="space-y-4">
              <FormField
                control={deliveryForm.control}
                name="quantity"
                rules={{ 
                  required: "Quantidade é obrigatória", 
                  min: { value: 1, message: "Mínimo 1" },
                  max: { value: selectedAuthorization?.quantityRemaining || 0, message: "Excede o saldo disponível" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade a Entregar</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={selectedAuthorization?.quantityRemaining || 0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={deliveryForm.control}
                name="receiverName"
                rules={{ required: "Nome do recebedor é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Recebedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome de quem está recebendo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={deliveryForm.control}
                name="receiverDocument"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento do Recebedor</FormLabel>
                    <FormControl>
                      <Input placeholder="CPF ou RG" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={deliveryForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações da entrega..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDeliveryDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createDeliveryMutation.isPending}>
                  {createDeliveryMutation.isPending ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    "Registrar Entrega"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
