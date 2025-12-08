import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight,
  ChevronLeft,
  Save,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  User,
  Search,
} from "lucide-react";
import PatientSelector, { PatientData } from "@/components/PatientSelector";

interface SinanField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  group: string;
  subgroup?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  mask?: string;
  helpText?: string;
  dependsOn?: {
    field: string;
    value: string | string[];
    condition?: string;
  };
  defaultValue?: string | number | boolean;
  order: number;
  sinanCode?: string;
  width?: string;
}

interface SinanFormGroup {
  id: string;
  nome: string;
  ordem: number;
  descricao?: string;
}

interface SinanTemplate {
  id: string;
  nome: string;
  agravoCode: string;
  cid10: string;
  categoria: string;
  versaoFicha: string;
  prazoNotificacao: string;
  fichaInvestigacao: boolean;
  groups: SinanFormGroup[];
  fields: SinanField[];
  requiredFields: string[];
  fieldsByGroup?: Record<string, SinanField[]>;
}

interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string; code: string }[];
  warnings: { field: string; message: string }[];
}

interface SinanDynamicFormProps {
  templateId: string;
  initialData?: Record<string, any>;
  mode?: "create" | "edit" | "view";
  notificationId?: string;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

const UF_OPTIONS = [
  { value: "AC", label: "AC" }, { value: "AL", label: "AL" }, { value: "AP", label: "AP" },
  { value: "AM", label: "AM" }, { value: "BA", label: "BA" }, { value: "CE", label: "CE" },
  { value: "DF", label: "DF" }, { value: "ES", label: "ES" }, { value: "GO", label: "GO" },
  { value: "MA", label: "MA" }, { value: "MT", label: "MT" }, { value: "MS", label: "MS" },
  { value: "MG", label: "MG" }, { value: "PA", label: "PA" }, { value: "PB", label: "PB" },
  { value: "PR", label: "PR" }, { value: "PE", label: "PE" }, { value: "PI", label: "PI" },
  { value: "RJ", label: "RJ" }, { value: "RN", label: "RN" }, { value: "RS", label: "RS" },
  { value: "RO", label: "RO" }, { value: "RR", label: "RR" }, { value: "SC", label: "SC" },
  { value: "SP", label: "SP" }, { value: "SE", label: "SE" }, { value: "TO", label: "TO" },
];

export default function SinanDynamicForm({
  templateId,
  initialData = {},
  mode = "create",
  notificationId,
  onSuccess,
  onCancel,
}: SinanDynamicFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>(initialData);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();

  const handlePatientSelect = (patient: PatientData) => {
    const fieldMappings: Record<string, keyof PatientData> = {
      paciente_nome: "name",
      paciente_cpf: "cpf",
      paciente_cns: "cns",
      paciente_sexo: "gender",
      paciente_mae: "motherName",
      paciente_telefone: "phone",
      res_logradouro: "address",
      res_bairro: "neighborhood",
      res_municipio: "city",
      res_uf: "state",
    };

    Object.entries(fieldMappings).forEach(([formField, patientField]) => {
      const value = patient[patientField];
      if (value !== undefined && value !== null && value !== "") {
        form.setValue(formField, value);
        setFormValues(prev => ({ ...prev, [formField]: value }));
      }
    });

    if (patient.birthDate) {
      const birthDateStr = format(patient.birthDate, "yyyy-MM-dd");
      form.setValue("paciente_dt_nasc", birthDateStr);
      setFormValues(prev => ({ ...prev, paciente_dt_nasc: birthDateStr }));

      const age = Math.floor((Date.now() - patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      form.setValue("paciente_idade", age);
      form.setValue("paciente_idade_tipo", "A");
      setFormValues(prev => ({ ...prev, paciente_idade: age, paciente_idade_tipo: "A" }));
    }

    if (patient.id) {
      setSelectedPatientId(patient.id);
      form.setValue("citizen_id", patient.id);
      setFormValues(prev => ({ ...prev, citizen_id: patient.id }));
    }

    toast({
      title: "Paciente selecionado",
      description: `Dados de ${patient.name} preenchidos automaticamente.`,
    });
  };

  const { data: template, isLoading: templateLoading } = useQuery<SinanTemplate>({
    queryKey: ["/api/sinan/templates", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const res = await fetch(`/api/sinan/templates/${templateId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch template");
      return res.json();
    },
  });

  const form = useForm({
    defaultValues: initialData,
    mode: "onBlur",
  });

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      Object.entries(initialData).forEach(([key, value]) => {
        form.setValue(key, value);
      });
    }
  }, [initialData, form]);

  const validateMutation = useMutation({
    mutationFn: async (data: Record<string, any>): Promise<ValidationResult> => {
      const response = await apiRequest("POST", `/api/sinan/templates/${templateId}/validate`, data);
      return (response as Response).json();
    },
    onSuccess: (result: ValidationResult) => {
      setValidationResult(result);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (mode === "edit" && notificationId) {
        return apiRequest("PATCH", `/api/sinan/notifications/${notificationId}`, {
          formData: data,
        });
      } else {
        return apiRequest("POST", "/api/sinan/notifications", {
          agravoCode: template?.agravoCode,
          agravoName: template?.nome,
          cidCode: template?.cid10,
          formData: data,
          patientName: data.paciente_nome || "",
          patientGender: data.paciente_sexo || "I",
          notificationDate: new Date(),
        });
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sinan/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sinan/stats"] });
      toast({
        title: mode === "edit" ? "Notificação atualizada" : "Notificação criada",
        description: "Os dados foram salvos com sucesso.",
      });
      if (onSuccess) onSuccess(response);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const groups = template?.groups?.sort((a, b) => a.ordem - b.ordem) || [];
  const currentGroup = groups[currentStep];
  const fieldsByGroup = template?.fieldsByGroup || {};
  const currentFields = currentGroup ? fieldsByGroup[currentGroup.id] || [] : [];

  const isFieldVisible = (field: SinanField, values: Record<string, any>): boolean => {
    if (!field.dependsOn) return true;

    const dependentValue = values[field.dependsOn.field];
    const targetValues = Array.isArray(field.dependsOn.value)
      ? field.dependsOn.value
      : [field.dependsOn.value];

    const condition = field.dependsOn.condition || "equals";

    switch (condition) {
      case "equals":
        return targetValues.includes(String(dependentValue));
      case "notEquals":
        return !targetValues.includes(String(dependentValue));
      case "in":
        return targetValues.includes(String(dependentValue));
      case "notIn":
        return !targetValues.includes(String(dependentValue));
      default:
        return true;
    }
  };

  const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const applyMask = (value: string, mask: string): string => {
    if (!mask) return value;
    
    const digits = value.replace(/\D/g, "");
    let result = "";
    let digitIndex = 0;

    for (const char of mask) {
      if (digitIndex >= digits.length) break;
      if (char === "9") {
        result += digits[digitIndex];
        digitIndex++;
      } else {
        result += char;
      }
    }

    return result;
  };

  const renderField = (field: SinanField) => {
    const values = form.watch();
    if (!isFieldVisible(field, values)) return null;

    const isReadOnly = mode === "view";
    const widthClass =
      field.width === "full" ? "col-span-4" :
      field.width === "half" ? "col-span-2" :
      field.width === "third" ? "col-span-1" :
      field.width === "quarter" ? "col-span-1" : "col-span-2";

    const fieldError = validationResult?.errors.find((e) => e.field === field.key);

    return (
      <div key={field.key} className={`${widthClass}`} data-testid={`field-${field.key}`}>
        <Label htmlFor={field.key} className="flex items-center gap-1 mb-1">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
          {field.sinanCode && (
            <Badge variant="outline" className="text-xs ml-1">
              {field.sinanCode}
            </Badge>
          )}
        </Label>

        <Controller
          name={field.key}
          control={form.control}
          defaultValue={field.defaultValue ?? ""}
          render={({ field: formField }) => {
            switch (field.type) {
              case "select":
                const options = field.key.includes("uf") || field.key === "res_uf"
                  ? UF_OPTIONS
                  : field.options || [];
                
                return (
                  <Select
                    value={formField.value || ""}
                    onValueChange={formField.onChange}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger data-testid={`select-${field.key}`}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                );

              case "date":
                return (
                  <Input
                    {...formField}
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={formField.value || ""}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      formField.onChange(formatted);
                    }}
                    disabled={isReadOnly}
                    data-testid={`input-${field.key}`}
                  />
                );

              case "checkbox":
                return (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={field.key}
                      checked={formField.value || false}
                      onCheckedChange={formField.onChange}
                      disabled={isReadOnly}
                      data-testid={`checkbox-${field.key}`}
                    />
                    <Label htmlFor={field.key} className="text-sm font-normal">
                      {field.helpText || "Sim"}
                    </Label>
                  </div>
                );

              case "textarea":
                return (
                  <Textarea
                    {...formField}
                    value={formField.value || ""}
                    placeholder={field.helpText}
                    disabled={isReadOnly}
                    rows={3}
                    data-testid={`textarea-${field.key}`}
                  />
                );

              case "number":
                return (
                  <Input
                    {...formField}
                    type="number"
                    min={field.validation?.min}
                    max={field.validation?.max}
                    value={formField.value ?? ""}
                    onChange={(e) => formField.onChange(e.target.valueAsNumber || "")}
                    disabled={isReadOnly}
                    data-testid={`input-${field.key}`}
                  />
                );

              case "cpf":
                return (
                  <Input
                    {...formField}
                    type="text"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={formField.value || ""}
                    onChange={(e) => {
                      const formatted = applyMask(e.target.value, "999.999.999-99");
                      formField.onChange(formatted);
                    }}
                    disabled={isReadOnly}
                    data-testid={`input-${field.key}`}
                  />
                );

              case "cns":
                return (
                  <Input
                    {...formField}
                    type="text"
                    placeholder="999 9999 9999 9999"
                    maxLength={18}
                    value={formField.value || ""}
                    onChange={(e) => {
                      const formatted = applyMask(e.target.value, "999 9999 9999 9999");
                      formField.onChange(formatted);
                    }}
                    disabled={isReadOnly}
                    data-testid={`input-${field.key}`}
                  />
                );

              case "cep":
                return (
                  <Input
                    {...formField}
                    type="text"
                    placeholder="00000-000"
                    maxLength={9}
                    value={formField.value || ""}
                    onChange={(e) => {
                      const formatted = applyMask(e.target.value, "99999-999");
                      formField.onChange(formatted);
                    }}
                    disabled={isReadOnly}
                    data-testid={`input-${field.key}`}
                  />
                );

              case "phone":
                return (
                  <Input
                    {...formField}
                    type="text"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    value={formField.value || ""}
                    onChange={(e) => {
                      const formatted = applyMask(e.target.value, "(99) 99999-9999");
                      formField.onChange(formatted);
                    }}
                    disabled={isReadOnly}
                    data-testid={`input-${field.key}`}
                  />
                );

              default:
                return (
                  <Input
                    {...formField}
                    type="text"
                    value={formField.value || ""}
                    placeholder={field.helpText}
                    minLength={field.validation?.minLength}
                    maxLength={field.validation?.maxLength}
                    disabled={isReadOnly}
                    data-testid={`input-${field.key}`}
                  />
                );
            }
          }}
        />

        {fieldError && (
          <p className="text-xs text-destructive mt-1">{fieldError.message}</p>
        )}
        {field.helpText && !fieldError && (
          <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
        )}
      </div>
    );
  };

  const handleNext = () => {
    if (currentStep < groups.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleValidate = () => {
    const values = form.getValues();
    validateMutation.mutate(values);
  };

  const handleSave = () => {
    const values = form.getValues();
    saveMutation.mutate(values);
  };

  if (templateLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Template não encontrado</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{template.nome}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">CID-10: {template.cid10}</Badge>
                <Badge variant={template.prazoNotificacao === "imediata" ? "destructive" : "secondary"}>
                  {template.prazoNotificacao === "imediata" ? "Imediato (24h)" : "Semanal"}
                </Badge>
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Etapa {currentStep + 1} de {groups.length}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {groups.map((group, index) => (
          <Button
            key={group.id}
            variant={index === currentStep ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentStep(index)}
            className="whitespace-nowrap"
            data-testid={`step-${group.id}`}
          >
            {index + 1}. {group.nome}
          </Button>
        ))}
      </div>

      {validationResult && (
        <Alert variant={validationResult.valid ? "default" : "destructive"}>
          {validationResult.valid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>
            {validationResult.valid
              ? "Todos os campos obrigatórios foram preenchidos corretamente."
              : `${validationResult.errors.length} erro(s) encontrado(s). Verifique os campos destacados.`}
          </AlertDescription>
        </Alert>
      )}

      {currentStep === 0 && mode !== "view" && (
        <Card className="border-dashed border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar Paciente Cadastrado
            </CardTitle>
            <CardDescription>
              Selecione um paciente para preencher automaticamente os dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientSelector
              onSelect={handlePatientSelect}
              selectedPatientId={selectedPatientId}
              compact={false}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{currentGroup?.nome}</CardTitle>
          {currentGroup?.descricao && (
            <CardDescription>{currentGroup.descricao}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {currentFields.map((field) => renderField(field))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            data-testid="button-prev-step"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentStep === groups.length - 1}
            data-testid="button-next-step"
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} data-testid="button-cancel">
              Cancelar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleValidate}
            disabled={validateMutation.isPending}
            data-testid="button-validate"
          >
            {validateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Validar
          </Button>
          {mode !== "view" && (
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Save className="h-4 w-4 mr-1" />
              {mode === "edit" ? "Atualizar" : "Salvar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
