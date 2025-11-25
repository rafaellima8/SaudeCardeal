import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const referralFormSchema = z.object({
  destination: z.string().min(1, "Destino é obrigatório"),
  specialty: z.string().optional(),
  reason: z.string().min(10, "Mínimo de 10 caracteres"),
  priority: z.enum(["normal", "urgent", "emergency"]),
  observations: z.string().optional(),
});

export type ReferralFormData = z.infer<typeof referralFormSchema>;

interface ReferralFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral?: any;
  onSave: (data: ReferralFormData) => void;
  isLoading: boolean;
}

export function ReferralForm({
  open,
  onOpenChange,
  referral,
  onSave,
  isLoading,
}: ReferralFormProps) {
  const form = useForm<ReferralFormData>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      destination: referral?.destination || "",
      specialty: referral?.specialty || "",
      reason: referral?.reason || "",
      priority: referral?.priority || "normal",
      observations: referral?.observations || "",
    },
  });

  const handleSubmit = (data: ReferralFormData) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-referral-form">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">
            {referral ? "Editar Encaminhamento" : "Novo Encaminhamento"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do encaminhamento médico
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-destination">
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UPA">UPA</SelectItem>
                        <SelectItem value="CAPS">CAPS</SelectItem>
                        <SelectItem value="Hospital Regional">Hospital Regional</SelectItem>
                        <SelectItem value="Especialidade">Especialidade</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                        <SelectItem value="emergency">Emergência</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidade</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Cardiologia, Ortopedia, Neurologia..."
                      disabled={isLoading}
                      data-testid="input-specialty"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo do Encaminhamento *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva o motivo do encaminhamento..."
                      rows={3}
                      disabled={isLoading}
                      data-testid="textarea-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Observações adicionais..."
                      rows={2}
                      disabled={isLoading}
                      data-testid="textarea-observations"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-save"
              >
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
