import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, AlertCircle, Package, Plus, Calendar, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { MedicationStock } from "@shared/schema";

interface PharmacyInventoryProps {
  onAddMedication?: () => void;
}

export function PharmacyInventory({ onAddMedication }: PharmacyInventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isLoading: userLoading } = useCurrentUser();

  const { data: stockItems = [], isLoading, refetch, isRefetching } = useQuery<MedicationStock[]>({
    queryKey: ["/api/pharmacy/stock", { search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.length >= 2) params.append("search", searchTerm);
      const url = `/api/pharmacy/stock${params.toString() ? `?${params}` : ""}`;
      return apiRequest<MedicationStock[]>("GET", url);
    },
    enabled: !userLoading,
  });

  const { data: lowStockItems = [] } = useQuery<MedicationStock[]>({
    queryKey: ["/api/pharmacy/stock/low"],
    queryFn: async () => apiRequest<MedicationStock[]>("GET", "/api/pharmacy/stock/low"),
    enabled: !userLoading,
  });

  const { data: expiringItems = [] } = useQuery<MedicationStock[]>({
    queryKey: ["/api/pharmacy/stock/expiring"],
    queryFn: async () => apiRequest<MedicationStock[]>("GET", "/api/pharmacy/stock/expiring"),
    enabled: !userLoading,
  });

  const getStockStatus = (item: MedicationStock) => {
    const now = new Date();
    const expDate = new Date(item.expirationDate);
    const daysUntilExpiry = differenceInDays(expDate, now);

    if (expDate < now) return { label: "Vencido", variant: "destructive" as const, priority: 1 };
    if (daysUntilExpiry <= 30) return { label: "Vence em breve", variant: "destructive" as const, priority: 2 };
    if (item.currentQuantity === 0) return { label: "Esgotado", variant: "destructive" as const, priority: 3 };
    if (item.currentQuantity < item.minStock) return { label: "Crítico", variant: "destructive" as const, priority: 4 };
    if (item.currentQuantity < item.minStock * 1.5) return { label: "Baixo", variant: "default" as const, priority: 5 };
    return { label: "Normal", variant: "outline" as const, priority: 6 };
  };

  const getExpiryInfo = (expirationDate: Date | string) => {
    const expDate = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expDate, new Date());

    if (daysUntilExpiry < 0) {
      return { text: "Vencido", className: "text-destructive font-semibold" };
    } else if (daysUntilExpiry <= 30) {
      return { text: `${daysUntilExpiry}d`, className: "text-destructive" };
    } else if (daysUntilExpiry <= 90) {
      return { text: `${daysUntilExpiry}d`, className: "text-yellow-600 dark:text-yellow-400" };
    }
    return { text: format(expDate, "dd/MM/yyyy"), className: "text-muted-foreground" };
  };

  const criticalCount = lowStockItems.length;
  const expiringCount = expiringItems.length;

  if (isLoading || userLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Card>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar medicamento, lote ou princípio ativo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-medication"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-stock"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
            </Badge>
          )}
          
          {expiringCount > 0 && (
            <Badge variant="default" className="gap-1 bg-yellow-500/80 hover:bg-yellow-500/70">
              <Calendar className="h-3 w-3" />
              {expiringCount} vencendo
            </Badge>
          )}
          
          {onAddMedication && (
            <Button size="default" onClick={onAddMedication} data-testid="button-new-medication">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead>Apresentação</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mín.</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  {searchTerm
                    ? "Nenhum medicamento encontrado para esta busca"
                    : "Nenhum medicamento cadastrado no estoque"}
                </TableCell>
              </TableRow>
            ) : (
              stockItems.map((item) => {
                const status = getStockStatus(item);
                const expiryInfo = getExpiryInfo(item.expirationDate);
                
                return (
                  <TableRow key={item.id} data-testid={`row-medication-${item.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <div>{item.medicationName}</div>
                          {item.genericName && (
                            <div className="text-xs text-muted-foreground">{item.genericName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{item.presentation}</div>
                      {item.concentration && (
                        <div className="text-xs">{item.concentration}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={item.currentQuantity < item.minStock ? "text-destructive font-semibold" : ""}>
                        {item.currentQuantity}
                      </span>
                      {" "}{item.unit || "un"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {item.minStock} {item.unit || "un"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {item.batch}
                    </TableCell>
                    <TableCell className={`font-mono text-sm ${expiryInfo.className}`}>
                      {expiryInfo.text}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {stockItems.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          Exibindo {stockItems.length} itens
        </div>
      )}
    </div>
  );
}
