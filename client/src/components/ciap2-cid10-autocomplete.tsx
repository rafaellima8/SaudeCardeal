import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X, Stethoscope, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeItem {
  code: string;
  description: string;
  chapter?: string;
}

interface CodeAutocompleteProps {
  type: 'ciap2' | 'cid10';
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
}

export function CodeAutocomplete({
  type,
  value = [],
  onChange,
  placeholder,
  maxSelections = 5,
  disabled = false,
}: CodeAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: searchResults = [], isLoading } = useQuery<CodeItem[]>({
    queryKey: [`/api/${type}/search`, { q: search }],
    enabled: search.length >= 2,
    staleTime: 60000,
  });

  const handleSelect = useCallback((code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else if (value.length < maxSelections) {
      onChange([...value, code]);
    }
    setSearch("");
  }, [value, onChange, maxSelections]);

  const handleRemove = useCallback((code: string) => {
    onChange(value.filter((c) => c !== code));
  }, [value, onChange]);

  const label = type === 'ciap2' ? 'CIAP-2' : 'CID-10';
  const Icon = type === 'ciap2' ? Stethoscope : FileText;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
            data-testid={`button-${type}-select`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{placeholder || `Buscar código ${label}...`}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={`Digite código ou descrição ${label}...`}
              value={search}
              onValueChange={setSearch}
              data-testid={`input-${type}-search`}
            />
            <CommandList>
              {search.length < 2 && (
                <CommandEmpty>Digite pelo menos 2 caracteres para buscar</CommandEmpty>
              )}
              {search.length >= 2 && isLoading && (
                <CommandEmpty>Buscando...</CommandEmpty>
              )}
              {search.length >= 2 && !isLoading && searchResults.length === 0 && (
                <CommandEmpty>Nenhum código encontrado</CommandEmpty>
              )}
              {searchResults.length > 0 && (
                <CommandGroup heading={`Resultados ${label}`}>
                  {searchResults.map((item) => (
                    <CommandItem
                      key={item.code}
                      value={`${item.code} ${item.description}`}
                      onSelect={() => handleSelect(item.code)}
                      data-testid={`option-${type}-${item.code}`}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(item.code) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{item.code}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {item.description}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="gap-1 pr-1"
              data-testid={`badge-${type}-${code}`}
            >
              <span className="font-mono">{code}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemove(code)}
                data-testid={`button-remove-${type}-${code}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {value.length >= maxSelections && (
        <p className="text-xs text-muted-foreground">
          Máximo de {maxSelections} códigos selecionados
        </p>
      )}
    </div>
  );
}

interface DiagnosisInputProps {
  ciap2Codes: string[];
  cid10Codes: string[];
  onCiap2Change: (codes: string[]) => void;
  onCid10Change: (codes: string[]) => void;
  disabled?: boolean;
}

export function DiagnosisInput({
  ciap2Codes,
  cid10Codes,
  onCiap2Change,
  onCid10Change,
  disabled = false,
}: DiagnosisInputProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Diagnóstico CIAP-2 (Atenção Primária)
        </label>
        <CodeAutocomplete
          type="ciap2"
          value={ciap2Codes}
          onChange={onCiap2Change}
          placeholder="Buscar código CIAP-2..."
          disabled={disabled}
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">
          Diagnóstico CID-10 (Classificação Internacional)
        </label>
        <CodeAutocomplete
          type="cid10"
          value={cid10Codes}
          onChange={onCid10Change}
          placeholder="Buscar código CID-10..."
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default DiagnosisInput;
