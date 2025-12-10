import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface HybridDateInputProps {
  value?: Date | string | null;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "data-testid"?: string;
}

const DATE_FORMATS = ["dd/MM/yyyy", "yyyy-MM-dd", "ddMMyyyy", "d/M/yyyy"];

function parseMultiFormat(input: string): Date | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function formatMask(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function HybridDateInput({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  disabled = false,
  className,
  id,
  "data-testid": testId,
}: HybridDateInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const date = typeof value === "string" ? new Date(value) : value;
      if (isValid(date)) {
        setInputValue(format(date, "dd/MM/yyyy"));
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = formatMask(raw);
    setInputValue(masked);
  };

  const handleInputBlur = () => {
    if (!inputValue) {
      onChange(undefined);
      return;
    }
    const parsed = parseMultiFormat(inputValue);
    if (parsed) {
      onChange(parsed);
      setInputValue(format(parsed, "dd/MM/yyyy"));
    } else {
      if (value) {
        const date = typeof value === "string" ? new Date(value) : value;
        if (isValid(date)) {
          setInputValue(format(date, "dd/MM/yyyy"));
        }
      } else {
        setInputValue("");
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
    setOpen(false);
  };

  const currentDate = value
    ? typeof value === "string"
      ? new Date(value)
      : value
    : undefined;

  return (
    <div className={cn("flex gap-1", className)}>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        disabled={disabled}
        className="flex-1"
        data-testid={testId}
        aria-label="Data no formato dia/mês/ano"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label="Abrir calendário"
            data-testid={testId ? `${testId}-calendar` : undefined}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={currentDate && isValid(currentDate) ? currentDate : undefined}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default HybridDateInput;
