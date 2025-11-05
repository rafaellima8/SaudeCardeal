import { useState } from "react";
import { Search, AlertCircle, Package, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Medication {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  expiration: string;
  batch: string;
}

//todo: remove mock functionality
const mockMedications: Medication[] = [
  { id: '1', name: 'Losartana 50mg', category: 'Anti-hipertensivo', stock: 450, minStock: 200, unit: 'comp', expiration: '2025-12-15', batch: 'L2024-001' },
  { id: '2', name: 'Dipirona 500mg', category: 'Analgésico', stock: 180, minStock: 300, unit: 'comp', expiration: '2025-08-20', batch: 'D2024-032' },
  { id: '3', name: 'Amoxicilina 500mg', category: 'Antibiótico', stock: 95, minStock: 150, unit: 'cáps', expiration: '2025-06-10', batch: 'A2024-015' },
  { id: '4', name: 'Paracetamol 750mg', category: 'Analgésico', stock: 520, minStock: 250, unit: 'comp', expiration: '2026-03-25', batch: 'P2024-098' },
  { id: '5', name: 'Metformina 850mg', category: 'Antidiabético', stock: 140, minStock: 180, unit: 'comp', expiration: '2025-09-30', batch: 'M2024-056' },
];

export function PharmacyInventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [medications] = useState(mockMedications);

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Esgotado', variant: 'destructive' as const };
    if (stock < minStock) return { label: 'Crítico', variant: 'destructive' as const };
    if (stock < minStock * 1.5) return { label: 'Baixo', variant: 'default' as const };
    return { label: 'Normal', variant: 'outline' as const };
  };

  const criticalCount = medications.filter(m => m.stock < m.minStock).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar medicamento ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-medication"
          />
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
          <Button size="default" data-testid="button-new-medication">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Medicamento
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mín. Estoque</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMedications.map((medication) => {
              const status = getStockStatus(medication.stock, medication.minStock);
              return (
                <TableRow key={medication.id} data-testid={`row-medication-${medication.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {medication.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{medication.category}</TableCell>
                  <TableCell className="text-right font-mono">
                    {medication.stock} {medication.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {medication.minStock} {medication.unit}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(medication.expiration).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {medication.batch}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
