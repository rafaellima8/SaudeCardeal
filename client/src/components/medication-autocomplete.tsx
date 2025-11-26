import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Pill, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface RENAMEMedication {
  id: string;
  code: string;
  commercialName: string;
  activeIngredient: string;
  therapeuticClass: string;
  presentation: string;
  concentration: string;
  unit: string;
  administrationRoute: string;
  isControlled: boolean;
  controlType: string | null;
  maxPrescriptionDays: number;
  requiresSpecialForm: boolean;
  pediatricDosePerKg: string | null;
  contraindications: string[] | null;
  interactions: string[] | null;
}

interface MedicationAutocompleteProps {
  value?: string;
  onSelect: (medication: RENAMEMedication) => void;
  placeholder?: string;
  disabled?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function MedicationAutocomplete({
  value,
  onSelect,
  placeholder = "Buscar medicamento...",
  disabled = false,
}: MedicationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: medications = [], isLoading } = useQuery<RENAMEMedication[]>({
    queryKey: ["/api/rename/search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const response = await fetch(`/api/rename/search?q=${encodeURIComponent(debouncedSearch)}&limit=15`);
      if (!response.ok) throw new Error("Erro ao buscar medicamentos");
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const handleSelect = useCallback((medication: RENAMEMedication) => {
    onSelect(medication);
    setOpen(false);
    setSearchTerm("");
  }, [onSelect]);

  const getControlBadgeColor = (controlType: string | null) => {
    if (!controlType) return "bg-gray-500";
    if (controlType.startsWith("A")) return "bg-red-600";
    if (controlType.startsWith("B")) return "bg-orange-500";
    if (controlType.startsWith("C")) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          data-testid="button-medication-search"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite nome comercial ou princípio ativo..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            data-testid="input-medication-search"
          />
          <CommandList>
            {isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Buscando medicamentos...
              </div>
            )}
            {!isLoading && debouncedSearch.length >= 2 && medications.length === 0 && (
              <CommandEmpty>Nenhum medicamento encontrado.</CommandEmpty>
            )}
            {!isLoading && debouncedSearch.length < 2 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar
              </div>
            )}
            <CommandGroup>
              {medications.map((med) => (
                <CommandItem
                  key={med.id}
                  value={med.id}
                  onSelect={() => handleSelect(med)}
                  className="flex flex-col items-start gap-1 py-3"
                  data-testid={`medication-item-${med.id}`}
                >
                  <div className="flex w-full items-center gap-2">
                    <Pill className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium">{med.commercialName}</span>
                    {med.isControlled && (
                      <Badge 
                        variant="destructive" 
                        className={cn("ml-auto text-xs", getControlBadgeColor(med.controlType))}
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        {med.controlType || "Controlado"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex w-full items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                      {med.activeIngredient}
                    </span>
                    <span>{med.presentation}</span>
                    <span className="text-xs capitalize">{med.administrationRoute}</span>
                  </div>
                  {med.therapeuticClass && (
                    <span className="text-xs text-muted-foreground">
                      {med.therapeuticClass}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface MedicationInfoPanelProps {
  medication: RENAMEMedication | null;
  patientWeight?: number;
  isChild?: boolean;
}

export function MedicationInfoPanel({ medication, patientWeight, isChild }: MedicationInfoPanelProps) {
  if (!medication) return null;

  const calculatePediatricDose = () => {
    if (!medication.pediatricDosePerKg || !patientWeight) return null;
    
    const match = medication.pediatricDosePerKg.match(/(\d+(?:\.\d+)?)-?(\d+(?:\.\d+)?)?mg\/kg/);
    if (!match) return medication.pediatricDosePerKg;
    
    const minDose = parseFloat(match[1]);
    const maxDose = match[2] ? parseFloat(match[2]) : minDose;
    
    const calcMin = Math.round(minDose * patientWeight);
    const calcMax = Math.round(maxDose * patientWeight);
    
    return calcMin === calcMax ? `${calcMin}mg` : `${calcMin}-${calcMax}mg`;
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-lg">{medication.commercialName}</h4>
        {medication.isControlled && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Controlado - {medication.controlType}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Princípio Ativo:</span>
          <p className="font-medium">{medication.activeIngredient}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Apresentação:</span>
          <p className="font-medium">{medication.presentation}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Via:</span>
          <p className="font-medium capitalize">{medication.administrationRoute}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Classe Terapêutica:</span>
          <p className="font-medium">{medication.therapeuticClass || "-"}</p>
        </div>
      </div>

      {medication.isControlled && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>Portaria 344/98 ANVISA</strong> - Lista {medication.controlType}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {medication.requiresSpecialForm 
              ? "Requer receituário especial (notificação de receita)" 
              : "Retenção de receita na farmácia"}
            {" | "}Máximo {medication.maxPrescriptionDays} dias
          </p>
        </div>
      )}

      {isChild && medication.pediatricDosePerKg && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Dose Pediátrica
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Referência: {medication.pediatricDosePerKg}
          </p>
          {patientWeight && (
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mt-1">
              Dose calculada ({patientWeight}kg): {calculatePediatricDose()}
            </p>
          )}
        </div>
      )}

      {medication.contraindications && medication.contraindications.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Contraindicações:
          </p>
          <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc list-inside mt-1">
            {medication.contraindications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {medication.interactions && medication.interactions.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-md p-3">
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
            Interações Conhecidas:
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {medication.interactions.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

export default MedicationAutocomplete;
