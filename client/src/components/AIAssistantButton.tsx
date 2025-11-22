import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface AIAssistantButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}

export function AIAssistantButton({
  onClick,
  loading = false,
  disabled = false,
  children,
  variant = "outline",
  size = "sm",
}: AIAssistantButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {children}
    </Button>
  );
}
