import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";

const stockMovementSchema = z.object({
  medicationId: z.string().min(1, "Selecione um medicamento"),
  type: z.enum(["entrada", "saida", "ajuste"]),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
  batchNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  reason: z.string().min(3, "Motivo obrigatório"),
});

type StockMovementFormData = z.infer<typeof stockMovementSchema>;

export default function PharmacyStock() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchMed, setSearchMed] = useState("");

  const form = useForm<StockMovementFormData>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      type: "entrada",
      quantity: 0,
    },
  });

  const { data: medications = [] } = useQuery({
    queryKey: ["/api/medications", user?.unitId],
    queryFn: async () => {
      return apiRequest<any[]>("GET", `/api/medications?unitId=${user?.unitId}`);
    },
    enabled: !!user?.unitId,
  });

  const { data: lowStock = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/stock/low"],
    enabled: !!user?.unitId,
  });

  const { data: stockMovements = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/stock-movements"],
    enabled: !!user?.unitId,
  });

  const movementMutation = useMutation({
    mutationFn: async (data: StockMovementFormData) => {
      return apiRequest("POST", "/api/pharmacy/stock-movements", {
        ...data,
        unitId: user?.unitId,
        professionalId: user?.id,
      });
    },
    onSuccess: () => {
      toast({ title: "Movimentação registrada", description: "Estoque atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/stock/low"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/stock-movements"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao registrar movimentação", description: error.message, variant: "destructive" });
    },
  });

  const filteredMedications = medications.filter((med: any) =>
    searchMed.length < 2 ? true : med.name.toLowerCase().includes(searchMed.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gestão de Estoque</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-movement">
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Movimentação de Estoque</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => movementMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Movimentação</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full rounded-md border border-input bg-background px-3 py-2" data-testid="select-movement-type">
                          <option value="entrada">Entrada (Recebimento)</option>
                          <option value="saida">Saída (Baixa Manual)</option>
                          <option value="ajuste">Ajuste de Estoque</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicamento</FormLabel>
                      <FormControl>
                        <div>
                          <Input
                            placeholder="Buscar medicamento..."
                            value={searchMed}
                            onChange={(e) => setSearchMed(e.target.value)}
                            className="mb-2"
                            data-testid="input-search-medication"
                          />
                          <select {...field} className="w-full rounded-md border border-input bg-background px-3 py-2" data-testid="select-medication">
                            <option value="">Selecione um medicamento</option>
                            {filteredMedications.map((med: any) => (
                              <option key={med.id} value={med.id}>{med.name} - {med.presentation}</option>
                            ))}
                          </select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-quantity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lote (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-batch" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-expiration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Recebimento fornecedor, Ajuste inventário" data-testid="input-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={movementMutation.isPending} data-testid="button-submit-movement">
                    {movementMutation.isPending ? "Salvando..." : "Registrar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-5 w-5" />
              Medicamentos com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-white dark:bg-background rounded-md">
                  <span className="font-semibold">{item.medicationName}</span>
                  <Badge variant="destructive">{item.currentStock} unidades</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Últimas Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stockMovements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada</p>
            ) : (
              stockMovements.map((movement: any) => (
                <div key={movement.id} className="flex justify-between items-center p-3 border rounded-md" data-testid={`movement-${movement.id}`}>
                  <div className="flex items-center gap-3">
                    {movement.type === "entrada" ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold">{movement.medicationName}</p>
                      <p className="text-sm text-muted-foreground">{movement.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={movement.type === "entrada" ? "default" : "secondary"}>
                      {movement.type === "entrada" ? "+" : "-"}{movement.quantity}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(movement.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
