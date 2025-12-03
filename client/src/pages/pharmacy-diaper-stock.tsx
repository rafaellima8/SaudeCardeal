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
import { Plus, AlertTriangle, Calendar, Package, RefreshCw, Search, Baby, Edit, Trash2 } from "lucide-react";
import type { DiaperStock, DiaperStockMovement } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DiaperStockFormData {
  name: string;
  size: string;
  brand: string;
  batch: string;
  expirationDate: string;
  currentQuantity: number;
  minStock: number;
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

export default function PharmacyDiaperStock() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<DiaperStock | null>(null);

  const form = useForm<DiaperStockFormData>({
    defaultValues: {
      name: "",
      size: "M",
      brand: "",
      batch: "",
      expirationDate: "",
      currentQuantity: 0,
      minStock: 10,
      notes: "",
    },
  });

  const { data: stock = [], isLoading } = useQuery<DiaperStock[]>({
    queryKey: ["/api/pharmacy/diaper-stock", { search: searchTerm, size: sizeFilter !== "all" ? sizeFilter : undefined }],
  });

  const { data: lowStock = [] } = useQuery<DiaperStock[]>({
    queryKey: ["/api/pharmacy/diaper-stock/low"],
  });

  const { data: expiringStock = [] } = useQuery<DiaperStock[]>({
    queryKey: ["/api/pharmacy/diaper-stock/expiring"],
  });

  const { data: movements = [] } = useQuery<DiaperStockMovement[]>({
    queryKey: ["/api/pharmacy/diaper-movements"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DiaperStockFormData) => {
      const payload = {
        ...data,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        brand: data.brand || null,
        batch: data.batch || null,
        notes: data.notes || null,
      };
      return await apiRequest("POST", "/api/pharmacy/diaper-stock", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diaper-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diaper-stock/low"] });
      toast({ title: "Sucesso", description: "Item adicionado ao estoque." });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DiaperStockFormData }) => {
      const payload = {
        ...data,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        brand: data.brand || null,
        batch: data.batch || null,
        notes: data.notes || null,
      };
      return await apiRequest("PATCH", `/api/pharmacy/diaper-stock/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diaper-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diaper-stock/low"] });
      toast({ title: "Sucesso", description: "Item atualizado." });
      setIsDialogOpen(false);
      setEditingStock(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/pharmacy/diaper-stock/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/diaper-stock"] });
      toast({ title: "Sucesso", description: "Item removido do estoque." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  function handleOpenDialog(stockItem?: DiaperStock) {
    if (stockItem) {
      setEditingStock(stockItem);
      form.reset({
        name: stockItem.name,
        size: stockItem.size,
        brand: stockItem.brand || "",
        batch: stockItem.batch || "",
        expirationDate: stockItem.expirationDate 
          ? format(new Date(stockItem.expirationDate), "yyyy-MM-dd") 
          : "",
        currentQuantity: stockItem.currentQuantity,
        minStock: stockItem.minStock,
        notes: "",
      });
    } else {
      setEditingStock(null);
      form.reset({
        name: "",
        size: "M",
        brand: "",
        batch: "",
        expirationDate: "",
        currentQuantity: 0,
        minStock: 10,
        notes: "",
      });
    }
    setIsDialogOpen(true);
  }

  function onSubmit(data: DiaperStockFormData) {
    if (editingStock) {
      updateMutation.mutate({ id: editingStock.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function getStatusBadge(item: DiaperStock) {
    if (item.status === "expired" || (item.expirationDate && new Date(item.expirationDate) < new Date())) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    if (item.status === "low_stock" || item.currentQuantity <= item.minStock) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Estoque Baixo</Badge>;
    }
    if (item.status === "depleted" || item.currentQuantity <= 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Normal</Badge>;
  }

  function getSizeLabel(size: string) {
    const sizeInfo = DIAPER_SIZES.find((s) => s.value === size);
    return sizeInfo?.label || size;
  }

  function getMovementTypeBadge(type: string) {
    const colors: Record<string, string> = {
      ajuste_positivo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      ajuste_negativo: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      transferencia_entrada: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      transferencia_saida: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      perda: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      vencimento: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      devolucao: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      reserva: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      liberacao_reserva: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
      doacao_assistencia: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    };
    const labels: Record<string, string> = {
      ajuste_positivo: "Entrada",
      ajuste_negativo: "Saída",
      transferencia_entrada: "Transf. Entrada",
      transferencia_saida: "Transf. Saída",
      perda: "Perda",
      vencimento: "Vencimento",
      devolucao: "Devolução",
      reserva: "Reserva",
      liberacao_reserva: "Liberação",
      doacao_assistencia: "Doação AS",
    };
    return (
      <Badge variant="secondary" className={colors[type] || ""}>
        {labels[type] || type}
      </Badge>
    );
  }

  const stockBySizeStats = DIAPER_SIZES.map((size) => {
    const items = stock.filter((s) => s.size === size.value);
    const total = items.reduce((acc, s) => acc + s.currentQuantity, 0);
    return { ...size, total, items: items.length };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque de Fraldas</h1>
          <p className="text-muted-foreground">Gerenciamento de fraldas infantis e geriátricas</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-diaper-stock">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar ao Estoque
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stock.length}</div>
            <p className="text-xs text-muted-foreground">lotes em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Estoque Total</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stock.reduce((acc, s) => acc + s.currentQuantity, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">unidades disponíveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground">itens precisam de reposição</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">A Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiringStock.length}</div>
            <p className="text-xs text-muted-foreground">itens próximos do vencimento</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" data-testid="tab-stock">Estoque Geral</TabsTrigger>
          <TabsTrigger value="by-size" data-testid="tab-by-size">Por Tamanho</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Alertas</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Lista de Estoque</CardTitle>
                  <CardDescription>Todos os lotes de fraldas cadastrados</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-stock"
                    />
                  </div>
                  <Select value={sizeFilter} onValueChange={setSizeFilter}>
                    <SelectTrigger className="w-40" data-testid="select-size-filter">
                      <SelectValue placeholder="Tamanho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {DIAPER_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : stock.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum item encontrado no estoque.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome/Descrição</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.map((item) => (
                      <TableRow key={item.id} data-testid={`row-diaper-stock-${item.id}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{getSizeLabel(item.size)}</TableCell>
                        <TableCell>{item.brand || "-"}</TableCell>
                        <TableCell>{item.batch || "-"}</TableCell>
                        <TableCell>
                          {item.expirationDate
                            ? format(new Date(item.expirationDate), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.currentQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(item.id)}
                              data-testid={`button-delete-${item.id}`}
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
        </TabsContent>

        <TabsContent value="by-size">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {stockBySizeStats.map((size) => (
              <Card key={size.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{size.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{size.total.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{size.items} lotes</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Estoque Baixo
                </CardTitle>
                <CardDescription>Itens que precisam de reposição</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStock.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum item com estoque baixo
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {lowStock.map((item) => (
                      <li key={item.id} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                        <span>{item.name} ({getSizeLabel(item.size)})</span>
                        <span className="font-mono text-yellow-700 dark:text-yellow-300">
                          {item.currentQuantity} / {item.minStock}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-500" />
                  Próximos a Vencer
                </CardTitle>
                <CardDescription>Itens que vencerão em 60 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {expiringStock.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum item próximo do vencimento
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {expiringStock.map((item) => (
                      <li key={item.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                        <span>{item.name} ({getSizeLabel(item.size)})</span>
                        <span className="text-red-700 dark:text-red-300">
                          {item.expirationDate
                            ? format(new Date(item.expirationDate), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
              <CardDescription>Últimas movimentações de estoque</CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Antes</TableHead>
                      <TableHead>Depois</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.slice(0, 50).map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {mov.createdAt
                            ? format(new Date(mov.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {getMovementTypeBadge(mov.movementType)}
                        </TableCell>
                        <TableCell className="font-mono">{mov.quantity}</TableCell>
                        <TableCell className="font-mono">{mov.previousQuantity}</TableCell>
                        <TableCell className="font-mono">{mov.newQuantity}</TableCell>
                        <TableCell>{mov.reason || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingStock ? "Editar Item" : "Adicionar ao Estoque"}</DialogTitle>
            <DialogDescription>
              {editingStock
                ? "Atualize as informações do item de estoque."
                : "Preencha os dados para adicionar um novo lote ao estoque."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Nome é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Fralda Descartável Marca X" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="size"
                  rules={{ required: "Tamanho é obrigatório" }}
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

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Pampers" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lote</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: LOTE2024001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currentQuantity"
                  rules={{ required: "Quantidade é obrigatória", min: { value: 0, message: "Deve ser maior ou igual a 0" } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minStock"
                  rules={{ required: "Estoque mínimo é obrigatório", min: { value: 0, message: "Deve ser maior ou igual a 0" } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Mínimo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
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
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingStock ? (
                    "Atualizar"
                  ) : (
                    "Adicionar"
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
