import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FileText, 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Filter,
  ChevronRight,
  ClipboardList,
  FileCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface FormTemplate {
  id: string;
  slug: string;
  codigo?: string;
  name: string;
  category: string;
  subcategory?: string;
  isBuiltIn: boolean;
  description?: string;
  prazoNotificacao?: string;
  fichaInvestigacao?: boolean;
  totalCampos?: number;
  fields?: any[];
  pageSize?: { width: number; height: number } | string;
}

interface FormCategory {
  value: string;
  label: string;
  count: number;
}

const categoryColors: Record<string, string> = {
  sinan: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  bpa: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  apac: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  vigilancia: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  tfd: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  aih: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  mortalidade: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  arboviroses: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  respiratorias: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  ist: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  hepatites: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  meningites: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  zoonoses: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  endemicas: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  cronicas: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  intoxicacoes: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  violencias: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  trabalho: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  virais: "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
  alimentares: "bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100",
};

export default function FormsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [validationPayload, setValidationPayload] = useState<string>("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const { toast } = useToast();

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/forms/templates"],
  });

  const { data: categories = [] } = useQuery<FormCategory[]>({
    queryKey: ["/api/forms/categories"],
  });

  const validateMutation = useMutation({
    mutationFn: async ({ templateSlug, payload }: { templateSlug: string; payload: any }) => {
      return apiRequest("POST", "/api/forms/validate", { templateSlug, payload });
    },
    onSuccess: (data: any) => {
      setValidationResult(data);
      if (data.isValid) {
        toast({
          title: "Formulário válido",
          description: "Todos os campos obrigatórios foram preenchidos corretamente.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro na validação",
        description: error.message || "Não foi possível validar o formulário.",
      });
    },
  });

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, FormTemplate[]>);

  const handleValidate = () => {
    if (!selectedTemplate) return;
    try {
      const payload = JSON.parse(validationPayload || "{}");
      validateMutation.mutate({ templateSlug: selectedTemplate.slug, payload });
    } catch {
      toast({
        variant: "destructive",
        title: "JSON inválido",
        description: "O payload deve ser um JSON válido.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Formulários Digitais
          </h1>
          <p className="text-muted-foreground">
            Templates de formulários SINAN, BPA, APAC e outros para preenchimento digital
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1" data-testid="badge-template-count">
            <FileText className="h-3 w-3" />
            {templates.length} templates
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-sinan">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SINAN</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter(t => t.category === "sinan").length}</div>
            <p className="text-xs text-muted-foreground">Fichas de notificação</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-bpa">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BPA</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter(t => t.category === "bpa").length}</div>
            <p className="text-xs text-muted-foreground">Produção ambulatorial</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-apac">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">APAC</CardTitle>
            <FileCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter(t => t.category === "apac").length}</div>
            <p className="text-xs text-muted-foreground">Alta complexidade</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-outros">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => !["sinan", "bpa", "apac"].includes(t.category)).length}
            </div>
            <p className="text-xs text-muted-foreground">Vigilância, TFD, AIH</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar template por nome ou slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-templates"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label} ({cat.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingTemplates ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList data-testid="tabs-view-mode">
            <TabsTrigger value="grid">Grade</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`card-template-${template.slug}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge className={categoryColors[template.category] || "bg-gray-100"}>
                        {template.category.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{template.slug}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || `Template para ${template.name}`}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {template.isBuiltIn ? "Built-in" : "Customizado"}
                      </Badge>
                      <Button variant="ghost" size="sm" data-testid={`button-view-${template.slug}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-2">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedTemplate(template)}
                data-testid={`row-template-${template.slug}`}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={categoryColors[template.category] || "bg-gray-100"}>
                      {template.category.toUpperCase()}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold capitalize">{category}</h3>
                  <Badge variant="secondary">{categoryTemplates.length}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedTemplate(template)}
                      data-testid={`card-category-${template.slug}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{template.name}</span>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-template-title">
              <FileText className="h-5 w-5" />
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Visualize e teste a validação do template de formulário
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[selectedTemplate.category] || "bg-gray-100"}>
                    {selectedTemplate.category.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {selectedTemplate.isBuiltIn ? "Built-in" : "Customizado"}
                  </Badge>
                  {selectedTemplate.pageSize && (
                    <Badge variant="secondary">
                      Página: {typeof selectedTemplate.pageSize === 'object' 
                        ? `${selectedTemplate.pageSize.width}x${selectedTemplate.pageSize.height}` 
                        : selectedTemplate.pageSize}
                    </Badge>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Campos do Formulário</h4>
                  {selectedTemplate.fields && selectedTemplate.fields.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTemplate.fields.slice(0, 10).map((field: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium text-sm">{field.label || field.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {field.type} {field.required && "• Obrigatório"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                      ))}
                      {selectedTemplate.fields.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          ... e mais {selectedTemplate.fields.length - 10} campos
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Campos não disponíveis para visualização
                    </p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Testar Validação</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Insira um JSON com os dados do formulário para testar a validação
                  </p>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-muted/50"
                    placeholder='{"campo1": "valor1", "campo2": "valor2"}'
                    value={validationPayload}
                    onChange={(e) => setValidationPayload(e.target.value)}
                    data-testid="textarea-validation-payload"
                  />
                  <Button
                    onClick={handleValidate}
                    disabled={validateMutation.isPending}
                    className="mt-2"
                    data-testid="button-validate"
                  >
                    {validateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Validar
                  </Button>

                  {validationResult && (
                    <div className="mt-4 p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        {validationResult.isValid ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="font-medium text-green-700 dark:text-green-400">
                              Formulário válido
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-500" />
                            <span className="font-medium text-red-700 dark:text-red-400">
                              Formulário inválido
                            </span>
                          </>
                        )}
                      </div>
                      {validationResult.errors && validationResult.errors.length > 0 && (
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {validationResult.errors.map((err: any, i: number) => (
                            <li key={i}>{err.message || err.field}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
