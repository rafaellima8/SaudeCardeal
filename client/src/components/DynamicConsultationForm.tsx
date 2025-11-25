import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TemplateField, ConsultationTemplate, ClinicalProtocol } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DynamicConsultationFormProps {
  consultationId: string;
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void;
  onProtocolsTriggered?: (protocols: ClinicalProtocol[]) => void;
}

export function DynamicConsultationForm({
  consultationId,
  initialData = {},
  onSubmit,
  onProtocolsTriggered,
}: DynamicConsultationFormProps) {
  const [triggeredProtocols, setTriggeredProtocols] = useState<ClinicalProtocol[]>([]);

  // Fetch template with SERVER-SIDE resolution (no more hard-coded templateId!)
  const { data: templateData, isLoading } = useQuery<{
    careLineId: string | null;
    careLine: any | null;
    template: ConsultationTemplate | null;
    fields: TemplateField[];
    fieldData: any[];
    matchReason: "explicit" | "diagnosis" | "specialty" | "trigger" | "none";
    matchDetails?: string;
  }>({
    queryKey: ["/api/consultations", consultationId, "dynamic-form"],
    enabled: !!consultationId,
  });

  // Build dynamic Zod schema based on template fields
  const buildValidationSchema = (fields: TemplateField[]) => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.fieldType) {
        case "number":
          let numberSchema = z.coerce.number();
          if (field.validationRules) {
            const rules = field.validationRules as {
              min?: number;
              max?: number;
              customMessage?: string;
            };
            if (rules.min !== undefined) {
              numberSchema = numberSchema.min(rules.min, {
                message: rules.customMessage || `Mínimo: ${rules.min}`,
              });
            }
            if (rules.max !== undefined) {
              numberSchema = numberSchema.max(rules.max, {
                message: rules.customMessage || `Máximo: ${rules.max}`,
              });
            }
          }
          fieldSchema = numberSchema;
          break;

        case "date":
          fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: "Data inválida",
          });
          break;

        case "checkbox":
          fieldSchema = z.boolean().default(false);
          break;

        case "select":
          if (field.fieldOptions && field.fieldOptions.length > 0) {
            fieldSchema = z.enum(field.fieldOptions as [string, ...string[]]);
          } else {
            fieldSchema = z.string();
          }
          break;

        case "textarea":
          let textareaSchema = z.string();
          if (field.validationRules) {
            const rules = field.validationRules as {
              min?: number;
              max?: number;
              pattern?: string;
              customMessage?: string;
            };
            if (rules.min) {
              textareaSchema = textareaSchema.min(rules.min, {
                message: rules.customMessage || `Mínimo ${rules.min} caracteres`,
              });
            }
            if (rules.max) {
              textareaSchema = textareaSchema.max(rules.max, {
                message: rules.customMessage || `Máximo ${rules.max} caracteres`,
              });
            }
            if (rules.pattern) {
              textareaSchema = textareaSchema.regex(new RegExp(rules.pattern), {
                message: rules.customMessage || "Formato inválido",
              });
            }
          }
          fieldSchema = textareaSchema;
          break;

        default: // text
          let textSchema = z.string();
          if (field.validationRules) {
            const rules = field.validationRules as {
              min?: number;
              max?: number;
              pattern?: string;
              customMessage?: string;
            };
            if (rules.pattern) {
              textSchema = textSchema.regex(new RegExp(rules.pattern), {
                message: rules.customMessage || "Formato inválido",
              });
            }
          }
          fieldSchema = textSchema;
      }

      // Apply required validation
      if (!field.required) {
        fieldSchema = fieldSchema.optional();
      }

      schemaFields[field.fieldName] = fieldSchema;
    });

    return z.object(schemaFields);
  };

  // Initialize form with dynamic schema
  const formSchema = templateData?.fields ? buildValidationSchema(templateData.fields) : z.object({});
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  // Evaluate clinical protocols whenever form data changes (with debounce)
  useEffect(() => {
    if (!templateData?.fields || !careLineId) return;

    let timeoutId: NodeJS.Timeout;

    const subscription = form.watch((formData) => {
      // Debounce protocol evaluation to avoid hammering the server
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          const response = await fetch("/api/clinical-protocols/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fieldData: formData,
              careLineId,
              specialtyId,
            }),
            credentials: "include",
          });

          if (response.ok) {
            const protocols = await response.json();
            setTriggeredProtocols(protocols);
            onProtocolsTriggered?.(protocols);
          }
        } catch (error) {
          console.error("Erro ao avaliar protocolos:", error);
        }
      }, 500); // 500ms debounce
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [form, templateData, careLineId, specialtyId, onProtocolsTriggered]);

  // Handle form submission
  const handleSubmit = (data: Record<string, any>) => {
    if (onSubmit) {
      onSubmit(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!templateData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar o formulário dinâmico. Verifique sua conexão.
        </AlertDescription>
      </Alert>
    );
  }

  const { template, fields, matchReason, matchDetails, careLine } = templateData;

  // No template matched
  if (!template || matchReason === "none") {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Formulário Específico Não Disponível</AlertTitle>
        <AlertDescription>
          Nenhuma linha de cuidado específica foi detectada para esta consulta.
          Utilize os campos SOAP padrão para registro da consulta.
          {matchDetails && <p className="mt-2 text-sm">{matchDetails}</p>}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Care Line Detection Banner */}
      {matchReason !== "explicit" && careLine && (
        <Alert variant="default" className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Formulário Detectado Automaticamente
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Linha de Cuidado:</strong> {careLine.name}
            <br />
            <strong>Motivo:</strong>{" "}
            {matchReason === "diagnosis" && "Diagnóstico compatível identificado"}
            {matchReason === "specialty" && "Especialidade do profissional"}
            {matchReason === "trigger" && "Perfil do paciente (idade/gênero)"}
            {matchDetails && <span className="ml-1">({matchDetails})</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Template Header */}
      <div>
        <h3 className="text-lg font-semibold">{template.name}</h3>
        {template.description && (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        )}
      </div>

      {/* Clinical Protocol Alerts */}
      {triggeredProtocols.length > 0 && (
        <div className="space-y-2">
          {triggeredProtocols.map((protocol) => (
            <Alert
              key={protocol.id}
              variant={
                protocol.alertLevel === "critical"
                  ? "destructive"
                  : "default"
              }
              data-testid={`alert-protocol-${protocol.id}`}
            >
              {protocol.alertLevel === "critical" && <AlertCircle className="h-4 w-4" />}
              {protocol.alertLevel === "warning" && <AlertTriangle className="h-4 w-4" />}
              {protocol.alertLevel === "info" && <Info className="h-4 w-4" />}
              <AlertTitle className="font-semibold">{protocol.name}</AlertTitle>
              <AlertDescription>{protocol.alertMessage}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Dynamic Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {fields.map((field) => (
            <FormField
              key={field.id}
              control={form.control}
              name={field.fieldName}
              render={({ field: formField }) => (
                <FormItem data-testid={`form-field-${field.fieldName}`}>
                  <FormLabel>
                    {field.fieldLabel}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    {field.fieldType === "text" && (
                      <Input {...formField} data-testid={`input-${field.fieldName}`} />
                    )}

                    {field.fieldType === "number" && (
                      <Input
                        type="number"
                        {...formField}
                        onChange={(e) => formField.onChange(parseFloat(e.target.value))}
                        data-testid={`input-${field.fieldName}`}
                      />
                    )}

                    {field.fieldType === "date" && (
                      <Input
                        type="date"
                        {...formField}
                        data-testid={`input-${field.fieldName}`}
                      />
                    )}

                    {field.fieldType === "textarea" && (
                      <Textarea {...formField} data-testid={`textarea-${field.fieldName}`} />
                    )}

                    {field.fieldType === "checkbox" && (
                      <Checkbox
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                        data-testid={`checkbox-${field.fieldName}`}
                      />
                    )}

                    {field.fieldType === "select" && field.fieldOptions && (
                      <Select
                        value={formField.value as string}
                        onValueChange={formField.onChange}
                      >
                        <SelectTrigger data-testid={`select-${field.fieldName}`}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.fieldOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  {field.helperText && (
                    <FormDescription>{field.helperText}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          {onSubmit && (
            <div className="flex justify-end">
              <Button type="submit" data-testid="button-submit-dynamic-form">
                Salvar Dados
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
