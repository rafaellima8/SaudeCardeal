import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FileText,
  Clock,
  AlertTriangle,
  Download,
  Layers,
  Filter,
} from "lucide-react";

interface TemplateListItem {
  id: string;
  nome: string;
  agravoCode: string;
  cid10: string;
  categoria: string;
  versaoFicha: string;
  prazoNotificacao: "imediata" | "semanal";
  fichaInvestigacao: boolean;
  groupCount: number;
  fieldCount: number;
  requiredFieldCount: number;
}

interface TemplateStats {
  totalTemplates: number;
  uniqueAgravos: number;
  categorias: Record<string, number>;
  prazoImediato: number;
  prazoSemanal: number;
  comInvestigacao: number;
}

interface SinanTemplateSelectorProps {
  onSelect: (templateId: string, template: TemplateListItem) => void;
  onDownloadBlank?: (templateId: string) => void;
}

const CATEGORIA_LABELS: Record<string, string> = {
  arboviroses: "Arboviroses",
  respiratorias: "Respiratórias",
  hepatites: "Hepatites Virais",
  ist: "IST/HIV/AIDS",
  meningites: "Meningites",
  zoonoses: "Zoonoses",
  endemicas: "Doenças Endêmicas",
  imunoprevenivel: "Imunopreveníveis",
  intoxicacoes: "Intoxicações",
  violencia: "Violência",
  trabalho: "Saúde do Trabalhador",
  alimentares: "Doenças Alimentares",
  virais: "Virais Emergentes",
  parasitarias: "Parasitárias",
  tuberculose: "Tuberculose",
  hanseniase: "Hanseníase",
  infecciosas: "Infecciosas",
  vigilancia: "Vigilância",
  farmacovigilancia: "Farmacovigilância",
};

export default function SinanTemplateSelector({
  onSelect,
  onDownloadBlank,
}: SinanTemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TemplateListItem[]>({
    queryKey: ["/api/sinan/templates", searchTerm, selectedCategoria !== "all" ? selectedCategoria : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategoria !== "all") params.append("categoria", selectedCategoria);
      const res = await fetch(`/api/sinan/templates?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const { data: stats } = useQuery<TemplateStats>({
    queryKey: ["/api/sinan/templates/stats"],
  });

  const { data: categorias = [] } = useQuery<string[]>({
    queryKey: ["/api/sinan/templates/categorias"],
  });

  const handleDownloadBlank = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownloadBlank) {
      onDownloadBlank(templateId);
    } else {
      window.open(`/api/sinan/templates/${templateId}/blank-form`, "_blank");
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategoria !== "all" && t.categoria !== selectedCategoria) return false;
    if (!searchTerm) return true;
    
    const normalizedSearch = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedNome = t.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return (
      normalizedNome.includes(normalizedSearch) ||
      t.agravoCode.toLowerCase().includes(normalizedSearch) ||
      t.cid10.toLowerCase().includes(normalizedSearch)
    );
  });

  const groupedByCategoria = filteredTemplates.reduce<Record<string, TemplateListItem[]>>(
    (acc, template) => {
      const cat = template.categoria;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(template);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.totalTemplates}</div>
              <p className="text-sm text-muted-foreground">Templates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.uniqueAgravos}</div>
              <p className="text-sm text-muted-foreground">Agravos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.prazoImediato}</div>
              <p className="text-sm text-muted-foreground">Notif. Imediata</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{Object.keys(stats.categorias).length}</div>
              <p className="text-sm text-muted-foreground">Categorias</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Fichas de Notificação SINAN
          </CardTitle>
          <CardDescription>
            Selecione a ficha de notificação para o agravo a ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código CID ou agravo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-templates"
              />
            </div>
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger className="w-[200px]" data-testid="select-categoria">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORIA_LABELS[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {templatesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {Object.entries(groupedByCategoria)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([categoria, items]) => (
                    <div key={categoria}>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                        {CATEGORIA_LABELS[categoria] || categoria} ({items.length})
                      </h3>
                      <div className="space-y-1">
                        {items.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
                            onClick={() => onSelect(template.id, template)}
                            data-testid={`template-${template.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">{template.nome}</span>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {template.cid10}
                                </Badge>
                                {template.prazoNotificacao === "imediata" && (
                                  <Badge variant="destructive" className="text-xs shrink-0">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Imediato
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {template.fieldCount} campos
                                </span>
                                <span>{template.requiredFieldCount} obrigatórios</span>
                                <span className="truncate">{template.agravoCode}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDownloadBlank(template.id, e)}
                                title="Baixar ficha em branco"
                                data-testid={`download-blank-${template.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum template encontrado</p>
                    <p className="text-sm">Tente ajustar os filtros de busca</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
