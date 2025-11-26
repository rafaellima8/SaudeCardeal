import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Brain,
  Pill,
  AlertTriangle,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Stethoscope,
  Shield,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

interface DiagnosisSuggestion {
  code: string;
  description: string;
  codeType: 'CID-10' | 'CIAP-2';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface DrugInteraction {
  severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
  drugs: string[];
  description: string;
  recommendation: string;
}

interface PrescriptionAlert {
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

interface AIAssistantPanelProps {
  subjective?: string;
  objective?: string;
  assessment?: string;
  vitalSigns?: VitalSigns;
  patientAge?: number;
  patientWeight?: number;
  comorbidities?: string[];
  currentMedications?: string[];
  onSuggestionSelect?: (suggestion: DiagnosisSuggestion) => void;
  onPlanGenerated?: (plan: string) => void;
  compact?: boolean;
}

export function AIAssistantPanel({
  subjective = "",
  objective = "",
  assessment = "",
  vitalSigns,
  patientAge,
  patientWeight,
  comorbidities = [],
  currentMedications = [],
  onSuggestionSelect,
  onPlanGenerated,
  compact = false,
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState("diagnosis");
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [medicationInput, setMedicationInput] = useState("");
  const [medicationsToCheck, setMedicationsToCheck] = useState<string[]>([]);
  const [prescriptionMed, setPrescriptionMed] = useState("");
  const [prescriptionDosage, setPrescriptionDosage] = useState("");
  const [prescriptionFrequency, setPrescriptionFrequency] = useState("");

  const diagnosisMutation = useMutation({
    mutationFn: async (data: { subjective: string; objective: string; vitalSigns?: VitalSigns }) => {
      const response = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao obter sugestões");
      }
      return response.json();
    },
  });

  const interactionsMutation = useMutation({
    mutationFn: async (medications: string[]) => {
      const response = await fetch("/api/ai/check-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ medications }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao verificar interações");
      }
      return response.json();
    },
  });

  const validatePrescriptionMutation = useMutation({
    mutationFn: async (data: {
      medication: string;
      dosage: string;
      frequency: string;
      patientAge?: number;
      patientWeight?: number;
      comorbidities?: string[];
    }) => {
      const response = await fetch("/api/ai/validate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao validar prescrição");
      }
      return response.json();
    },
  });

  const carePlanMutation = useMutation({
    mutationFn: async (data: { subjective: string; objective: string; assessment: string }) => {
      const response = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao gerar plano");
      }
      return response.json();
    },
  });

  const handleGetDiagnosis = () => {
    if (!subjective && !objective) return;
    diagnosisMutation.mutate({
      subjective,
      objective,
      vitalSigns,
    });
  };

  const handleAddMedication = () => {
    if (!medicationInput.trim()) return;
    if (!medicationsToCheck.includes(medicationInput.trim())) {
      setMedicationsToCheck([...medicationsToCheck, medicationInput.trim()]);
    }
    setMedicationInput("");
  };

  const handleRemoveMedication = (med: string) => {
    setMedicationsToCheck(medicationsToCheck.filter(m => m !== med));
  };

  const handleCheckInteractions = () => {
    const allMeds = [...medicationsToCheck, ...currentMedications].filter((v, i, a) => a.indexOf(v) === i);
    if (allMeds.length < 2) return;
    interactionsMutation.mutate(allMeds);
  };

  const handleValidatePrescription = () => {
    if (!prescriptionMed || !prescriptionDosage || !prescriptionFrequency) return;
    validatePrescriptionMutation.mutate({
      medication: prescriptionMed,
      dosage: prescriptionDosage,
      frequency: prescriptionFrequency,
      patientAge,
      patientWeight,
      comorbidities,
    });
  };

  const handleGeneratePlan = () => {
    if (!subjective && !assessment) return;
    carePlanMutation.mutate({
      subjective,
      objective,
      assessment,
    });
  };

  const handleUsePlan = () => {
    if (carePlanMutation.data?.plan && onPlanGenerated) {
      onPlanGenerated(carePlanMutation.data.plan);
    }
  };

  const suggestions: DiagnosisSuggestion[] = diagnosisMutation.data?.suggestions || [];
  const interactions: DrugInteraction[] = interactionsMutation.data?.interactions || [];
  const prescriptionAlerts: PrescriptionAlert[] = validatePrescriptionMutation.data?.alerts || [];

  const canGetDiagnosis = subjective.length >= 10 || objective.length >= 10;
  const canCheckInteractions = [...medicationsToCheck, ...currentMedications].length >= 2;
  const canValidatePrescription = prescriptionMed && prescriptionDosage && prescriptionFrequency;
  const canGeneratePlan = (subjective.length >= 10 || assessment.length >= 10);

  return (
    <Card className={cn("h-full", compact && "border-0 shadow-none")}>
      <CardHeader className={cn("pb-3", compact && "pt-0 px-0")}>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Assistente IA Médico</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Sugestões baseadas em IA para apoio à decisão clínica
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(compact && "px-0 pb-0")}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="diagnosis" className="text-xs" data-testid="tab-diagnosis">
              <Stethoscope className="h-3 w-3 mr-1" />
              Diagnóstico
            </TabsTrigger>
            <TabsTrigger value="interactions" className="text-xs" data-testid="tab-interactions">
              <Pill className="h-3 w-3 mr-1" />
              Interações
            </TabsTrigger>
            <TabsTrigger value="validate" className="text-xs" data-testid="tab-validate">
              <Shield className="h-3 w-3 mr-1" />
              Validar
            </TabsTrigger>
            <TabsTrigger value="plan" className="text-xs" data-testid="tab-plan">
              <ClipboardList className="h-3 w-3 mr-1" />
              Plano
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diagnosis" className="mt-0">
            <div className="space-y-3">
              <Button
                onClick={handleGetDiagnosis}
                disabled={!canGetDiagnosis || diagnosisMutation.isPending}
                className="w-full"
                size="sm"
                data-testid="button-suggest-diagnosis"
              >
                {diagnosisMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Sugerir Diagnósticos
              </Button>

              {!canGetDiagnosis && (
                <p className="text-xs text-muted-foreground text-center">
                  Preencha Subjetivo ou Objetivo (mín. 10 caracteres)
                </p>
              )}

              {diagnosisMutation.isError && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                  {(diagnosisMutation.error as Error).message}
                </div>
              )}

              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <Collapsible
                      key={`${suggestion.code}-${index}`}
                      open={expandedSuggestion === suggestion.code}
                      onOpenChange={() => 
                        setExpandedSuggestion(
                          expandedSuggestion === suggestion.code ? null : suggestion.code
                        )
                      }
                    >
                      <div
                        className="border rounded-lg p-2 hover-elevate cursor-pointer"
                        data-testid={`suggestion-${suggestion.code}`}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.codeType}
                                </Badge>
                                <span className="font-mono text-xs font-medium">
                                  {suggestion.code}
                                </span>
                                <Badge
                                  variant={
                                    suggestion.confidence === "high"
                                      ? "default"
                                      : suggestion.confidence === "medium"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {suggestion.confidence === "high"
                                    ? "Alta"
                                    : suggestion.confidence === "medium"
                                    ? "Média"
                                    : "Baixa"}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1">{suggestion.description}</p>
                            </div>
                            {expandedSuggestion === suggestion.code ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Separator className="my-2" />
                          <p className="text-xs text-muted-foreground mb-2">
                            {suggestion.reasoning}
                          </p>
                          {onSuggestionSelect && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => onSuggestionSelect(suggestion)}
                              data-testid={`button-use-${suggestion.code}`}
                            >
                              Usar este diagnóstico
                            </Button>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>

              {diagnosisMutation.data?.disclaimer && (
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  {diagnosisMutation.data.disclaimer}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="interactions" className="mt-0">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do medicamento"
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMedication()}
                  className="flex-1"
                  data-testid="input-medication"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddMedication}
                  data-testid="button-add-medication"
                >
                  +
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {currentMedications.map((med) => (
                  <Badge key={med} variant="secondary" className="text-xs">
                    {med} (atual)
                  </Badge>
                ))}
                {medicationsToCheck.map((med) => (
                  <Badge
                    key={med}
                    variant="outline"
                    className="text-xs cursor-pointer"
                    onClick={() => handleRemoveMedication(med)}
                  >
                    {med} <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>

              <Button
                onClick={handleCheckInteractions}
                disabled={!canCheckInteractions || interactionsMutation.isPending}
                className="w-full"
                size="sm"
                data-testid="button-check-interactions"
              >
                {interactionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Verificar Interações
              </Button>

              {!canCheckInteractions && (
                <p className="text-xs text-muted-foreground text-center">
                  Adicione pelo menos 2 medicamentos para verificar
                </p>
              )}

              {interactionsMutation.isError && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                  {(interactionsMutation.error as Error).message}
                </div>
              )}

              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {interactions.length === 0 && interactionsMutation.isSuccess && (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma interação significativa encontrada
                      </p>
                    </div>
                  )}
                  {interactions.map((interaction, index) => (
                    <div
                      key={index}
                      className={cn(
                        "border rounded-lg p-2",
                        interaction.severity === "contraindicated" &&
                          "bg-destructive/10 border-destructive",
                        interaction.severity === "major" &&
                          "bg-orange-500/10 border-orange-500",
                        interaction.severity === "moderate" &&
                          "bg-yellow-500/10 border-yellow-500",
                        interaction.severity === "minor" &&
                          "bg-blue-500/10 border-blue-500"
                      )}
                      data-testid={`interaction-${index}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle
                          className={cn(
                            "h-4 w-4",
                            interaction.severity === "contraindicated" && "text-destructive",
                            interaction.severity === "major" && "text-orange-500",
                            interaction.severity === "moderate" && "text-yellow-600",
                            interaction.severity === "minor" && "text-blue-500"
                          )}
                        />
                        <Badge
                          variant={
                            interaction.severity === "contraindicated"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {interaction.severity === "contraindicated"
                            ? "Contraindicado"
                            : interaction.severity === "major"
                            ? "Grave"
                            : interaction.severity === "moderate"
                            ? "Moderada"
                            : "Leve"}
                        </Badge>
                        <span className="text-xs font-medium">
                          {interaction.drugs.join(" + ")}
                        </span>
                      </div>
                      <p className="text-xs">{interaction.description}</p>
                      {interaction.recommendation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Recomendação:</strong> {interaction.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="validate" className="mt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Medicamento</Label>
                  <Input
                    placeholder="Nome"
                    value={prescriptionMed}
                    onChange={(e) => setPrescriptionMed(e.target.value)}
                    className="h-8 text-sm"
                    data-testid="input-prescription-med"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dose</Label>
                  <Input
                    placeholder="Ex: 500mg"
                    value={prescriptionDosage}
                    onChange={(e) => setPrescriptionDosage(e.target.value)}
                    className="h-8 text-sm"
                    data-testid="input-prescription-dosage"
                  />
                </div>
                <div>
                  <Label className="text-xs">Frequência</Label>
                  <Input
                    placeholder="Ex: 8/8h"
                    value={prescriptionFrequency}
                    onChange={(e) => setPrescriptionFrequency(e.target.value)}
                    className="h-8 text-sm"
                    data-testid="input-prescription-frequency"
                  />
                </div>
              </div>

              <Button
                onClick={handleValidatePrescription}
                disabled={!canValidatePrescription || validatePrescriptionMutation.isPending}
                className="w-full"
                size="sm"
                data-testid="button-validate-prescription"
              >
                {validatePrescriptionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Validar Prescrição
              </Button>

              {validatePrescriptionMutation.isError && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                  {(validatePrescriptionMutation.error as Error).message}
                </div>
              )}

              <ScrollArea className="h-[160px]">
                <div className="space-y-2">
                  {prescriptionAlerts.length === 0 && validatePrescriptionMutation.isSuccess && (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Prescrição validada sem alertas
                      </p>
                    </div>
                  )}
                  {prescriptionAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className={cn(
                        "border rounded-lg p-2",
                        alert.type === "error" && "bg-destructive/10 border-destructive",
                        alert.type === "warning" && "bg-yellow-500/10 border-yellow-500",
                        alert.type === "info" && "bg-blue-500/10 border-blue-500"
                      )}
                      data-testid={`prescription-alert-${index}`}
                    >
                      <div className="flex items-start gap-2">
                        {alert.type === "error" ? (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        ) : alert.type === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">{alert.message}</p>
                          {alert.suggestion && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>Sugestão:</strong> {alert.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="plan" className="mt-0">
            <div className="space-y-3">
              <Button
                onClick={handleGeneratePlan}
                disabled={!canGeneratePlan || carePlanMutation.isPending}
                className="w-full"
                size="sm"
                data-testid="button-generate-plan"
              >
                {carePlanMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Gerar Plano de Cuidados
              </Button>

              {!canGeneratePlan && (
                <p className="text-xs text-muted-foreground text-center">
                  Preencha Subjetivo ou Avaliação (mín. 10 caracteres)
                </p>
              )}

              {carePlanMutation.isError && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                  {(carePlanMutation.error as Error).message}
                </div>
              )}

              {carePlanMutation.data?.plan && (
                <>
                  <ScrollArea className="h-[180px] border rounded p-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm">
                        {carePlanMutation.data.plan}
                      </div>
                    </div>
                  </ScrollArea>
                  
                  {onPlanGenerated && (
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onClick={handleUsePlan}
                      data-testid="button-use-plan"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Usar este plano
                    </Button>
                  )}

                  {carePlanMutation.data?.disclaimer && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {carePlanMutation.data.disclaimer}
                    </p>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AIAssistantPanel;
